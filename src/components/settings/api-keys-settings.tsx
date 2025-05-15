
'use client';

import type { ApiKey as ApiKeyResponse, NewApiKeyResponse } from '@/models/ApiKey'; // Use model interfaces
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, KeyRound, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

// Define a type for the API keys displayed in the list (without the full key)
// This maps to Omit<ApiKey, 'hashedKey' | '_id'> from the model
interface DisplayApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date | null;
}

export function ApiKeysSettings() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<DisplayApiKey[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  // Store the full response when a key is generated, which includes the raw key
  const [generatedApiKey, setGeneratedApiKey] = useState<NewApiKeyResponse | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showFullKey, setShowFullKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null); // Store ID of key being revoked

  const fetchApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/api-keys');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch API keys');
      }
      const data: DisplayApiKey[] = await response.json();
      setApiKeys(data.map(key => ({...key, createdAt: new Date(key.createdAt), lastUsedAt: key.lastUsedAt ? new Date(key.lastUsedAt) : null })));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleGenerateKey = async () => {
    if (!newApiKeyName.trim()) {
      toast({ title: "Error", description: "API Key name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    // For now, let's use a default set of permissions
    const defaultPermissions = ['links:read', 'links:write', 'domains:read', 'analytics:read'];
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newApiKeyName.trim(), permissions: defaultPermissions }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate API key');
      }
      const newKeyData: NewApiKeyResponse = await response.json();
      setGeneratedApiKey(newKeyData);
      setShowFullKey(true); // Show the full key by default when first generated
      toast({ title: "API Key Generated", description: `Key "${newKeyData.name}" has been generated. Copy it now!`, duration: 10000 });
      fetchApiKeys(); // Refresh the list
      setNewApiKeyName(''); 
      // Dialog remains open to show the key
    } catch (error: any) {
      toast({ title: "Error Generating Key", description: error.message, variant: "destructive" });
    }
    setIsGenerating(false);
  };
  
  const closeAddDialogAndReset = () => {
    setIsAddDialogOpen(false);
    setGeneratedApiKey(null);
    setShowFullKey(false);
    setNewApiKeyName('');
  }

  const handleDeleteKey = async (apiKeyId: string, keyName: string) => {
    setIsRevoking(apiKeyId);
    try {
      const response = await fetch(`/api/api-keys/${apiKeyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to revoke API key');
      }
      toast({ title: "API Key Revoked", description: `Key "${keyName}" has been revoked.` });
      setApiKeys(prevKeys => prevKeys.filter(k => k.id !== apiKeyId));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setIsRevoking(null);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'API Key Copied!', description: 'The full API key has been copied to your clipboard.' });
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> API Keys</CardTitle>
        <CardDescription>Manage API keys for programmatic access.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) closeAddDialogAndReset(); else setIsAddDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Generate New API Key</Button>
          </DialogTrigger>
          <DialogContent onEscapeKeyDown={(e) => { if(!isGenerating) closeAddDialogAndReset();}} 
                         onPointerDownOutside={(e) => { if(!isGenerating) closeAddDialogAndReset();}}>
            <DialogHeader>
              <DialogTitle>{generatedApiKey ? 'API Key Generated' : 'Generate New API Key'}</DialogTitle>
              <DialogDescription>
                {generatedApiKey 
                  ? 'Your new API key has been generated. Copy it now as you will not be able to see it again.'
                  : 'Enter a name for your new API key. Permissions will be set to default full access for now.'}
              </DialogDescription>
            </DialogHeader>
            {generatedApiKey ? (
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <p className="text-sm font-medium">{generatedApiKey.name}</p>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="generated-key">API Key (sensitive - copy now)</Label>
                    <div className="flex items-center gap-2">
                    <Input 
                        id="generated-key" 
                        readOnly 
                        value={showFullKey ? generatedApiKey.key : `${generatedApiKey.prefix}************************************************************`.substring(0, generatedApiKey.key.length)} 
                        type={showFullKey ? "text" : "password"}
                        className="font-mono text-xs"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setShowFullKey(!showFullKey)}>
                        {showFullKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleCopyKey(generatedApiKey.key)}>
                        <Copy className="h-4 w-4" />
                    </Button>
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label>Permissions</Label>
                    <div className="flex flex-wrap gap-1">
                        {generatedApiKey.permissions.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                    </div>
                </div>
                <p className="text-xs text-destructive">
                    Warning: This key provides programmatic access. Keep it secure.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="new-key-name" className="text-right">Name</Label>
                  <Input
                    id="new-key-name"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    placeholder="e.g., My Integration Key"
                    className="col-span-3"
                    disabled={isGenerating}
                  />
                </div>
                {/* TODO: Add UI for selecting permissions if needed in the future */}
              </div>
            )}
            <DialogFooter>
              {generatedApiKey ? (
                <Button onClick={closeAddDialogAndReset}>Close</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={closeAddDialogAndReset} disabled={isGenerating}>Cancel</Button>
                  <Button onClick={handleGenerateKey} disabled={isGenerating || !newApiKeyName.trim()}>
                    {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Generate Key
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Separator />
        <h3 className="text-lg font-medium">Your API Keys</h3>
        {apiKeys.length > 0 ? (
          <ul className="space-y-3">
            {apiKeys.map((key) => (
              <li key={key.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md gap-2">
                <div className="flex-grow">
                  <span className="font-medium">{key.name}</span>
                  <p className="text-xs text-muted-foreground font-mono" title="Key Prefix">{key.prefix}****************</p>
                  <p className="text-xs text-muted-foreground">
                    Created: {format(new Date(key.createdAt), "MMM d, yyyy")}
                    {key.lastUsedAt && ` • Last used: ${format(new Date(key.lastUsedAt), "MMM d, yyyy HH:mm")}`}
                  </p>
                   <div className="flex flex-wrap gap-1 mt-1">
                        {key.permissions.map(p => <Badge key={p} variant="outline" className="text-xs">{p}</Badge>)}
                    </div>
                </div>
                <div className="space-x-2 flex-shrink-0 self-start sm:self-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive" disabled={isRevoking === key.id}>
                        {isRevoking === key.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />} Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently revoke the API key "{key.name}".
                          Any applications using this key will no longer be able to access your account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteKey(key.id, key.name)} className="bg-destructive hover:bg-destructive/90">
                          Revoke Key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">No API keys generated yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
