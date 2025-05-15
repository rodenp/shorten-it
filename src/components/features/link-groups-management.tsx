
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LinkGroup } from '@/models/LinkGroup'; // Use the model interface
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, FolderKanban, Loader2 } from 'lucide-react';
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
import { format } from 'date-fns';

export function LinkGroupsManagement() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [isAddOrEditDialogOpen, setIsAddOrEditDialogOpen] = useState(false);
  const [currentGroup, setCurrentGroup] = useState<LinkGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Store ID of group being deleted

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/link-groups');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch link groups');
      }
      const data: LinkGroup[] = await response.json();
      setGroups(data.map(g => ({...g, createdAt: new Date(g.createdAt), updatedAt: new Date(g.updatedAt)})));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setGroups([]); // Clear groups on error
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const resetForm = () => {
    setCurrentGroup(null);
    setGroupName('');
    setGroupDescription('');
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddOrEditDialogOpen(true);
  };

  const handleOpenEditDialog = (group: LinkGroup) => {
    setCurrentGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setIsAddOrEditDialogOpen(true);
  };

  const handleSubmitGroup = async () => {
    if (!groupName.trim()) {
      toast({ title: 'Error', description: 'Group name cannot be empty.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const url = currentGroup ? `/api/link-groups/${currentGroup.id}` : '/api/link-groups';
    const method = currentGroup ? 'PUT' : 'POST';
    const payload = {
      name: groupName.trim(),
      description: groupDescription.trim(),
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${currentGroup ? 'update' : 'create'} group`);
      }
      const result: LinkGroup = await response.json();
      toast({ title: `Group ${currentGroup ? 'Updated' : 'Added'}`, description: `"${result.name}" has been successfully ${currentGroup ? 'updated' : 'added'}.` });
      
      if (currentGroup) {
        setGroups(prev => prev.map(g => g.id === result.id ? {...result, createdAt: new Date(result.createdAt), updatedAt: new Date(result.updatedAt)} : g));
      } else {
        fetchGroups(); // Or append to state: setGroups(prev => [...prev, result]); 
      }
      setIsAddOrEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: `Error ${currentGroup ? 'Updating' : 'Adding'} Group`, description: error.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteGroup = async (groupId: string, groupNameVal: string) => {
    setIsDeleting(groupId);
    try {
      const response = await fetch(`/api/link-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete group');
      }
      toast({ title: 'Group Deleted', description: `Group "${groupNameVal}" has been deleted. Links within this group are now ungrouped.`});
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error: any) {
      toast({ title: 'Error Deleting Group', description: error.message, variant: 'destructive' });
    }
    setIsDeleting(null);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Dialog open={isAddOrEditDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); setIsAddOrEditDialogOpen(isOpen);}}>
        <DialogTrigger asChild>
          <Button onClick={handleOpenAddDialog} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentGroup ? 'Edit' : 'Create New'} Link Group</DialogTitle>
            <DialogDescription>
              {currentGroup ? 'Update the details for your link group.' : 'Organize your links by creating groups.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Q4 Marketing"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group-description">Description (Optional)</Label>
              <Textarea
                id="group-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="A brief description of this group."
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancel</Button></DialogClose>
            <Button onClick={handleSubmitGroup} disabled={isSubmitting || !groupName.trim()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 
                {currentGroup ? 'Save Changes' : 'Create Group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderKanban className="mr-2 h-5 w-5 text-primary" />
                  {group.name}
                </CardTitle>
                <CardDescription>{group.description || 'No description.'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* <p className="text-sm text-muted-foreground">
                  Links in group: {0} // Link count removed for now
                </p> */}
                <p className="text-xs text-muted-foreground mt-1">
                  Created: {format(new Date(group.createdAt), "MMM d, yyyy")}
                </p>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex justify-end gap-2 w-full">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(group)} disabled={isDeleting === group.id}>
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isDeleting === group.id}>
                        {isDeleting === group.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. Deleting group "{group.name}" will make its links ungrouped.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteGroup(group.id, group.name)} className="bg-destructive hover:bg-destructive/90">
                          Delete Group
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        !isLoading && (
          <Card>
            <CardContent className="pt-6 text-center">
              <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground">No Link Groups Yet</h3>
              <p className="text-muted-foreground">
                Click "Create New Group" to get started.
              </p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
