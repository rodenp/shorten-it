
import { NextResponse } from 'next/server';
import {
  updateTeamMemberRole,
  removeTeamMember,
} from '@/lib/teamService';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { TeamMember } from '@/types';

interface Params {
  params: {
    membershipId: string;
  };
}

// PUT /api/team/[membershipId] (Update a team member's role)
export async function PUT(request: Request, { params }: Params) {
  try {
    const teamOwnerId = await getUserIdFromRequest(request);
    if (!teamOwnerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { membershipId } = params;
    const { role } = await request.json() as { role: TeamMember['role'] };

    if (!role) {
      return NextResponse.json({ message: 'Missing required field: role' }, { status: 400 });
    }

    const result = await updateTeamMemberRole(membershipId, teamOwnerId, role);

    if ('error' in result) {
      const statusCode = result.error.includes('not found') || result.error.includes('permission') ? 404 : 500;
      return NextResponse.json({ message: result.error }, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Error updating team member role for membership ${params.membershipId}:`, error);
    return NextResponse.json({ message: error.message || 'Error updating team member role' }, { status: 500 });
  }
}

// DELETE /api/team/[membershipId] (Remove a team member)
export async function DELETE(request: Request, { params }: Params) {
  try {
    const teamOwnerId = await getUserIdFromRequest(request);
    if (!teamOwnerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { membershipId } = params;
    const result = await removeTeamMember(membershipId, teamOwnerId);

    if (typeof result === 'object' && 'error' in result) {
      const statusCode = result.error.includes('not found') || result.error.includes('permission') ? 404 : 500;
      return NextResponse.json({ message: result.error }, { status: statusCode });
    }
    
    if (!result) { // Should be caught by the error object case above, but as a fallback
        return NextResponse.json({ message: 'Failed to remove team member or member not found.'}, { status: 404 });
    }

    return NextResponse.json({ message: 'Team member removed successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting team member for membership ${params.membershipId}:`, error);
    return NextResponse.json({ message: error.message || 'Error deleting team member' }, { status: 500 });
  }
}
