
'use client';

import type { CustomDomain } from '@/types';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  getMockCustomDomains,
  addMockCustomDomain,
  deleteMockCustomDomain,
  toggleVerifyMockCustomDomain,
  updateMockCustomDomainName,
} from '@/lib/mock-data';
import { PlusCircle, Trash2, Edit, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

export function CustomDomainsSettings() {
  const { toast } = useToast();
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomainName, setNewDomainName] = useState('');
  const [editingDomain, setEditingDomain] = useState<CustomDomain | null>(null);
  const [editDomainNameInput, setEditDomainNameInput] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchDomains = useCallback(() => {
    setDomains(getMockCustomDomains());
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = () => {
    if (!newDomainName.trim()) {
      toast({ title: "Error", description: "Domain name cannot be empty.", variant: "destructive" });
      return;
    }
    const result = addMockCustomDomain(newDomainName);
    if ('error' in result) {
      toast({ title: "Error Adding Domain", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Domain Added", description: `"${result.domainName}" has been added.`, variant: "default" });
      fetchDomains();
      setNewDomainName('');
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteDomain = (domainId: string, domainName: string) => {
    if (deleteMockCustomDomain(domainId)) {
      toast({ title: "Domain Deleted", description: `"${domainName}" has been deleted.`, variant: "default" });
      fetchDomains();
    } else {
      toast({ title: "Error", description: "Could not delete domain.", variant: "destructive" });
    }
  };

  const handleToggleVerify = (domainId: string, domainName: string) => {
    const updatedDomain = toggleVerifyMockCustomDomain(domainId);
    if (updatedDomain) {
      toast({
        title: "Verification Status Changed",
        description: `"${domainName}" is now ${updatedDomain.verified ? 'verified' : 'unverified'}.`,
        variant: "default"
      });
      fetchDomains();
    }
  };

  const openEditDialog = (domain: CustomDomain) => {
    setEditingDomain(domain);
    setEditDomainNameInput(domain.domainName);
    setIsEditDialogOpen(true);
  };

  const handleUpdateDomainName = () => {
    if (!editingDomain || !editDomainNameInput.trim()) {
      toast({ title: "Error", description: "Domain name cannot be empty.", variant: "destructive" });
      return;
    }
    const result = updateMockCustomDomainName(editingDomain.id, editDomainNameInput);
    if ('error' in result) {
      toast({ title: "Error Updating Domain", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Domain Updated", description: `Domain name changed to "${result.domainName}".`, variant: "default" });
      fetchDomains();
      setIsEditDialogOpen(false);
      setEditingDomain(null);
    }
  };

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
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAddDomain}>Add Domain</Button>
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
                  <Button variant="outline" size="sm" onClick={() => handleToggleVerify(domain.id, domain.domainName)}>
                    {domain.verified ? "Mark Unverified" : "Mark Verified"}
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
                            />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleUpdateDomainName}>Save Changes</Button>
                        </DialogFooter>
                        </DialogContent>
                     )}
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive">
                        <Trash2 className="h-4 w-4" />
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
