
'use client';

import type { CustomDomain } from '@/models/CustomDomain'; // Use the model interface directly
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertDialogTrigger, // Added AlertDialogTrigger back
} from '@/components/ui/alert-dialog'; 
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export function CustomDomainsSettings() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomainName, setNewDomainName] = useState('');
  const [editingDomain, setEditingDomain] = useState<CustomDomain | null>(null);
  const [editDomainNameInput, setEditDomainNameInput] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For add/edit operations
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Store ID of domain being deleted
  const [isVerifying, setIsVerifying] = useState<string | null>(null); // Store ID of domain being verified

  const fetchDomains = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/custom-domains');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch domains');
      }
      const data: CustomDomain[] = await response.json();
      setDomains(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) {
      toast({ title: "Error", description: "Domain name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/custom-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: newDomainName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add domain');
      }
      // const newDomain: CustomDomain = await response.json(); // Not needed if re-fetching
      toast({ title: "Domain Added", description: `"${newDomainName.trim()}" has been added.` });
      fetchDomains(); // Re-fetch to get the updated list including the new ID
      setNewDomainName('');
      setIsAddDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Error Adding Domain", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    setIsDeleting(domainId);
    try {
      const response = await fetch(`/api/custom-domains/${domainId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete domain');
      }
      toast({ title: "Domain Deleted", description: `"${domainName}" has been deleted.` });
      setDomains(prevDomains => prevDomains.filter(d => d.id !== domainId));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setIsDeleting(null);
  };

  const handleToggleVerify = async (domain: CustomDomain) => {
    setIsVerifying(domain.id);
    try {
      const response = await fetch(`/api/custom-domains/${domain.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: !domain.verified }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update verification status');
      }
      const updatedDomain: CustomDomain = await response.json();
      toast({
        title: "Verification Status Changed",
        description: `"${updatedDomain.domainName}" is now ${updatedDomain.verified ? 'verified' : 'unverified'}.`,
      });
      // Update local state to reflect change immediately
      setDomains(prevDomains => 
        prevDomains.map(d => d.id === updatedDomain.id ? updatedDomain : d)
      );
    } catch (error: any) {
      toast({ title: "Error Verifying Domain", description: error.message, variant: "destructive" });
    }
    setIsVerifying(null);
  };

  const openEditDialog = (domain: CustomDomain) => {
    setEditingDomain(domain);
    setEditDomainNameInput(domain.domainName);
    setIsEditDialogOpen(true);
  };

  const handleUpdateDomainName = async () => {
    if (!editingDomain || !editDomainNameInput.trim()) {
      toast({ title: "Error", description: "Domain name cannot be empty.", variant: "destructive" });
      return;
    }
    if (editingDomain.domainName === editDomainNameInput.trim()) {
        toast({ title: "No Changes", description: "The domain name is the same.", variant: "default" });
        setIsEditDialogOpen(false);
        setEditingDomain(null);
        return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/custom-domains/${editingDomain.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: editDomainNameInput.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update domain name');
      }
      const updatedDomain: CustomDomain = await response.json();
      toast({ title: "Domain Updated", description: `Domain name changed to "${updatedDomain.domainName}".` });
      // Update local state
      setDomains(prevDomains => 
        prevDomains.map(d => d.id === updatedDomain.id ? updatedDomain : d)
      );
      setIsEditDialogOpen(false);
      setEditingDomain(null);
    } catch (error: any) {
      toast({ title: "Error Updating Domain", description: error.message, variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Domains</CardTitle>
        <CardDescription>Manage your branded short domains. Verified domains can be used for new links.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Domain</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Custom Domain</DialogTitle>
              <DialogDescription>Enter the domain name you want to use for your short links.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-domain-name" className="text-right">Domain Name</Label>
                <Input
                  id="new-domain-name"
                  value={newDomainName}
                  onChange={(e) => setNewDomainName(e.target.value)}
                  placeholder="yourbrand.co"
                  className="col-span-3"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
              <Button onClick={handleAddDomain} disabled={isSubmitting || !newDomainName.trim()}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Domain
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Separator />
        <h3 className="text-lg font-medium">Your Domains</h3>
        {domains.length > 0 ? (
          <ul className="space-y-3">
            {domains.map((domain: CustomDomain) => (
              <li key={domain.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md gap-2">
                <div className="flex-grow">
                  <span className="font-medium">{domain.domainName}</span>
                  {domain.verified ? (
                    <Badge variant="default" className="ml-2 bg-green-500 hover:bg-green-600 text-primary-foreground">
                      <CheckCircle className="mr-1 h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-2">
                      <XCircle className="mr-1 h-3 w-3" /> Unverified
                    </Badge>
                  )}
                   <p className="text-xs text-muted-foreground">Added: {new Date(domain.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="space-x-2 flex-shrink-0 self-start sm:self-center">
                  <Button variant="outline" size="sm" onClick={() => handleToggleVerify(domain)} disabled={isVerifying === domain.id}>
                    {isVerifying === domain.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (domain.verified ? "Mark Unverified" : "Mark Verified")}
                  </Button>
                  <Dialog open={isEditDialogOpen && editingDomain?.id === domain.id} onOpenChange={(isOpen) => { if(!isOpen) setEditingDomain(null); setIsEditDialogOpen(isOpen);}}>
                    <DialogTrigger asChild>
                       <Button variant="ghost" size="icon" onClick={() => openEditDialog(domain)}><Edit className="h-4 w-4" /></Button>
                    </DialogTrigger>
                     {editingDomain && editingDomain.id === domain.id && (
                        <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Domain Name</DialogTitle>
                            <DialogDescription>Change the domain name. This might affect existing links if not handled carefully.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-domain-name-input" className="text-right">Domain Name</Label>
                            <Input
                                id="edit-domain-name-input"
                                value={editDomainNameInput}
                                onChange={(e) => setEditDomainNameInput(e.target.value)}
                                className="col-span-3"
                                disabled={isSubmitting}
                            />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancel</Button></DialogClose>
                            <Button onClick={handleUpdateDomainName} disabled={isSubmitting || !editDomainNameInput.trim() || editDomainNameInput.trim() === editingDomain.domainName}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                            </Button>
                        </DialogFooter>
                        </DialogContent>
                     )}
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" disabled={isDeleting === domain.id}>
                        {isDeleting === domain.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the domain "{domain.domainName}".
                          Links using this domain might stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteDomain(domain.id, domain.domainName)} className="bg-destructive hover:bg-destructive/90">
                          Delete Domain
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">No custom domains added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
