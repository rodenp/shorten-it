
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TeamMember } from '@/types';
import {
  getMockTeamMembers,
  addMockTeamMember,
  deleteMockTeamMember,
  updateMockTeamMemberRole,
  getMockCurrentUserProfile,
} from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, UserPlus, Users, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '../ui/separator';

const roles: TeamMember['role'][] = ['admin', 'editor', 'viewer'];

export function TeamCollaborationSettings() {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>(roles[2]); // Default to 'viewer'
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingRole, setEditingRole] = useState<TeamMember['role']>(roles[2]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);


  const fetchTeamMembers = useCallback(() => {
    setTeamMembers(getMockTeamMembers());
  }, []);
  
  useEffect(() => {
    setCurrentUser(getMockCurrentUserProfile());
    fetchTeamMembers();
  }, [fetchTeamMembers]);


  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !/\S+@\S+\.\S+/.test(inviteEmail.trim())) {
      toast({ title: 'Error', description: 'Please enter a valid email address.', variant: 'destructive' });
      return;
    }
    const result = addMockTeamMember(inviteEmail.trim(), inviteRole);
    if ('error' in result) {
      toast({ title: 'Error Inviting Member', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Member Invited', description: `${result.email} has been invited as a ${result.role}.`, variant: 'default' });
      fetchTeamMembers();
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole(roles[2]);
    }
  };

  const openEditDialog = (member: TeamMember) => {
    setEditingMember(member);
    setEditingRole(member.role);
    setIsEditDialogOpen(true);
  };

  const handleUpdateRole = () => {
    if (!editingMember) return;
    const result = updateMockTeamMemberRole(editingMember.id, editingRole);
     if ('error' in result) {
      toast({ title: 'Error Updating Role', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Role Updated', description: `${result.fullName}'s role updated to ${result.role}.`, variant: 'default' });
      fetchTeamMembers();
      setIsEditDialogOpen(false);
      setEditingMember(null);
    }
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    const result = deleteMockTeamMember(memberId);
    if ('error' in result) {
        toast({ title: 'Error Deleting Member', description: result.error, variant: 'destructive' });
    } else if (result) {
      toast({ title: 'Member Removed', description: `${memberName} has been removed from the team.`, variant: 'default' });
      fetchTeamMembers();
    } else {
       toast({ title: 'Error Deleting Member', description: 'Could not remove the member.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Team Collaboration</CardTitle>
        <CardDescription>Invite and manage your team members. Assign roles to control access.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" /> Invite New Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Team Member</DialogTitle>
              <DialogDescription>
                Enter the email address and select a role for the new team member.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as TeamMember['role'])}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleInviteMember}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Separator />

        <h3 className="text-lg font-medium">Current Team Members</h3>
        {teamMembers.length > 0 ? (
          <ul className="space-y-4">
            {teamMembers.map((member) => (
              <li key={member.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg shadow-sm">
                <div className="flex items-center gap-3 mb-3 sm:mb-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                        src={member.avatarUrl || `https://picsum.photos/seed/${member.email}/40/40`} 
                        alt={member.fullName}
                        data-ai-hint={member.avatarUrl?.includes('picsum.photos') || !member.avatarUrl ? "avatar user" : undefined}
                    />
                    <AvatarFallback>{member.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold text-foreground">{member.fullName}</span>
                    {member.id === currentUser?.id && <span className="text-xs text-primary ml-1">(You)</span>}
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="capitalize text-xs px-2 py-1">
                    {member.role}
                  </Badge>
                  {member.id !== currentUser?.id && (
                    <>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(member)}>
                        <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Role
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will remove {member.fullName} from the team. They will lose access to this workspace.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMember(member.id, member.fullName)} className="bg-destructive hover:bg-destructive/90">
                            Remove Member
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </>
                  )}
                   {member.id === currentUser?.id && member.role !== 'admin' && (
                     <Badge variant="outline" className="border-amber-500 text-amber-600">
                       <ShieldAlert className="mr-1 h-3 w-3" /> Contact admin to change your role
                     </Badge>
                   )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-6">Your team is currently empty. Invite members to collaborate!</p>
        )}
      </CardContent>

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role for {editingMember?.fullName}</DialogTitle>
            <DialogDescription>
              Change the role for {editingMember?.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role">New Role</Label>
              <Select value={editingRole} onValueChange={(value) => setEditingRole(value as TeamMember['role'])}>
                <SelectTrigger id="edit-role">
                  <SelectValue placeholder="Select a new role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button></DialogClose>
            <Button onClick={handleUpdateRole}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
