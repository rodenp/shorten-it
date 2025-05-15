
import { NextResponse } from 'next/server';
import {
  getTeamMembersByOwner,
  addTeamMember,
} from '@/lib/teamService';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { TeamMember } from '@/types';

// GET /api/team (Get all team members for the logged-in user as team owner)
export async function GET(request: Request) {
  try {
    const teamOwnerId = await getUserIdFromRequest(request);
    if (!teamOwnerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const teamMembers = await getTeamMembersByOwner(teamOwnerId);
    return NextResponse.json(teamMembers);
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ message: error.message || 'Error fetching team members' }, { status: 500 });
  }
}

// POST /api/team (Add a new team member to the logged-in user's team)
export async function POST(request: Request) {
  try {
    const teamOwnerId = await getUserIdFromRequest(request);
    if (!teamOwnerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email: memberEmail, role } = await request.json() as { email: string; role: TeamMember['role'] };

    if (!memberEmail || !role) {
      return NextResponse.json({ message: 'Missing required fields: email and role' }, { status: 400 });
    }

    const result = await addTeamMember(teamOwnerId, memberEmail, role);

    if ('error' in result) {
        const statusCode = result.error.includes('does not exist') ? 404 :
                           result.error.includes('already a member') ? 409 :
                           result.error.includes('add yourself') ? 400 : 500;
        return NextResponse.json({ message: result.error }, { status: statusCode });
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ message: error.message || 'Error adding team member' }, { status: 500 });
  }
}
