
import { pool, DB_TYPE } from './db';
import { TeamMember, UserProfile } from '@/types';
import { v4 as uuidv4 } from 'uuid';

if (DB_TYPE !== 'postgres' || !pool) {
  console.warn('Team service currently only supports PostgreSQL. DB_TYPE is set to:', DB_TYPE);
}

/**
 * Formats a database row (joined users and team_memberships) to a TeamMember object.
 */
function formatTeamMember(row: any): TeamMemberWithMembershipDetails {
  return {
    id: row.memberUserId, // The actual User ID of the team member
    teamMembershipId: row.membershipId, // The ID of the membership record itself
    fullName: row.name,
    email: row.email,
    avatarUrl: row.image, // Assuming 'image' field from users table corresponds to avatarUrl
    role: row.role as TeamMember['role'],
    membershipCreatedAt: row.membershipCreatedAt ? new Date(row.membershipCreatedAt).toISOString() : undefined,
    membershipUpdatedAt: row.membershipUpdatedAt ? new Date(row.membershipUpdatedAt).toISOString() : undefined,
  };
}

// Extended TeamMember type for service layer to include membership details if needed internally
interface TeamMemberWithMembershipDetails extends TeamMember {
  teamMembershipId: string;
  membershipCreatedAt?: string;
  membershipUpdatedAt?: string;
}

export async function getTeamMembersByOwner(teamOwnerId: string): Promise<TeamMemberWithMembershipDetails[]> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const query = `
      SELECT
        tm.id AS "membershipId",
        tm."teamOwnerId",
        tm."memberUserId",
        tm.role,
        tm."createdAt" AS "membershipCreatedAt",
        tm."updatedAt" AS "membershipUpdatedAt",
        u.name,
        u.email,
        u.image
      FROM team_memberships tm
      JOIN users u ON tm."memberUserId" = u.id
      WHERE tm."teamOwnerId" = $1
      ORDER BY u.name ASC;
    `;
    const res = await pool.query(query, [teamOwnerId]);
    return res.rows.map(formatTeamMember);
  } catch (err) {
    console.error('Error fetching team members by owner:', err);
    throw new Error('Failed to retrieve team members.');
  }
}

async function getUserById(userId: string): Promise<UserProfile | null> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const res = await pool.query('SELECT id, name, email, image FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0) return null;
    const userRow = res.rows[0];
    return {
        id: userRow.id,
        fullName: userRow.name,
        email: userRow.email,
        avatarUrl: userRow.image
    };
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    throw new Error('Failed to find user by ID.');
  }
}

// Function to find a user by email (to invite them)
async function getUserByEmail(email: string): Promise<UserProfile | null> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const res = await pool.query('SELECT id, name, email, image FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) return null;
    const userRow = res.rows[0];
    return {
        id: userRow.id,
        fullName: userRow.name,
        email: userRow.email,
        avatarUrl: userRow.image
    };
  } catch (err) {
    console.error('Error fetching user by email:', err);
    throw new Error('Failed to find user by email.');
  }
}

export async function addTeamMember(
  teamOwnerId: string,
  memberEmail: string,
  role: TeamMember['role']
): Promise<TeamMemberWithMembershipDetails | { error: string }> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  
  const memberUser = await getUserByEmail(memberEmail);
  if (!memberUser) {
    return { error: 'User with this email does not exist.' };
  }

  if (memberUser.id === teamOwnerId) {
    return { error: 'You cannot add yourself to your own team.' };
  }

  const membershipId = uuidv4();
  const createdAt = new Date().toISOString();

  try {
    const query = `
      INSERT INTO team_memberships (id, "teamOwnerId", "memberUserId", role, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING id AS "membershipId", "teamOwnerId", "memberUserId", role, "createdAt" AS "membershipCreatedAt", "updatedAt" AS "membershipUpdatedAt";
    `;
    const res = await pool.query(query, [membershipId, teamOwnerId, memberUser.id, role, createdAt]);
    
    const newMembership = res.rows[0];
    return {
      id: memberUser.id,
      teamMembershipId: newMembership.membershipId,
      fullName: memberUser.fullName,
      email: memberUser.email,
      avatarUrl: memberUser.avatarUrl,
      role: newMembership.role as TeamMember['role'],
      membershipCreatedAt: new Date(newMembership.membershipCreatedAt).toISOString(),
      membershipUpdatedAt: new Date(newMembership.membershipUpdatedAt).toISOString(),
    };

  } catch (err: any) {
    console.error('Error adding team member:', err);
    if (err.constraint === 'unique_team_member') {
      return { error: 'This user is already a member of your team.' };
    }
    throw new Error('Failed to add team member.');
  }
}

export async function updateTeamMemberRole(
  teamMembershipId: string, // The ID of the membership record itself
  teamOwnerId: string,
  newRole: TeamMember['role']
): Promise<TeamMemberWithMembershipDetails | { error: string }> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  const updatedAt = new Date().toISOString();

  try {
    const ownershipCheck = await pool.query(
      'SELECT "memberUserId" FROM team_memberships WHERE id = $1 AND "teamOwnerId" = $2',
      [teamMembershipId, teamOwnerId]
    );

    if (ownershipCheck.rows.length === 0) {
      return { error: 'Team membership not found or you do not have permission to update it.' };
    }
    const memberUserId = ownershipCheck.rows[0].memberUserId;

    // Prevent demoting the team owner if they are trying to demote themselves (owner is always admin)
    // Note: This logic assumes team owner is NOT listed as a member in their own team_memberships table.
    // If the team owner IS the memberUserId being updated, and they try to set role to non-admin:
    // if (memberUserId === teamOwnerId && newRole !== 'admin') {
    //   return { error: 'Team owner role cannot be changed from admin.' };
    // }

    const updateQuery = `
      UPDATE team_memberships
      SET role = $1, "updatedAt" = $2
      WHERE id = $3 AND "teamOwnerId" = $4
      RETURNING id AS "membershipId", "teamOwnerId", "memberUserId", role, "createdAt" AS "membershipCreatedAt", "updatedAt" AS "membershipUpdatedAt";
    `;
    const res = await pool.query(updateQuery, [newRole, updatedAt, teamMembershipId, teamOwnerId]);

    if (res.rows.length === 0) {
      return { error: 'Failed to update role, membership not found or permission issue.' };
    }

    const updatedMembership = res.rows[0];
    const memberUser = await getUserById(updatedMembership.memberUserId);
     if (!memberUser) {
        return { error: 'Could not retrieve member details after update.'};
    }

    return {
      id: memberUser.id,
      teamMembershipId: updatedMembership.membershipId,
      fullName: memberUser.fullName,
      email: memberUser.email,
      avatarUrl: memberUser.avatarUrl,
      role: updatedMembership.role as TeamMember['role'],
      membershipCreatedAt: new Date(updatedMembership.membershipCreatedAt).toISOString(),
      membershipUpdatedAt: new Date(updatedMembership.membershipUpdatedAt).toISOString(),
    };

  } catch (err) {
    console.error('Error updating team member role:', err);
    throw new Error('Failed to update team member role.');
  }
}

export async function removeTeamMember(
  teamMembershipId: string, // The ID of the membership record
  teamOwnerId: string
): Promise<boolean | { error: string }> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const res = await pool.query(
      'DELETE FROM team_memberships WHERE id = $1 AND "teamOwnerId" = $2',
      [teamMembershipId, teamOwnerId]
    );
    if (res.rowCount === 0) {
        return { error: 'Team member not found or you do not have permission to remove them.' };
    }
    return true;
  } catch (err) {
    console.error('Error deleting team member:', err);
    throw new Error('Failed to delete team member.');
  }
}
