
'use client';

import type { ApiKey } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import {
  getMockApiKeys,
  addMockApiKey,
  deleteMockApiKey,
} from '@/lib/mock-data';
import { PlusCircle, Trash2, KeyRound, Copy, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

export function ApiKeysSettings() {
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [generatedApiKey, setGeneratedApiKey] = useState<ApiKey | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showFullKey, setShowFullKey] = useState(false);

  const fetchApiKeys = useCallback(() => {
    setApiKeys(getMockApiKeys());
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleGenerateKey = () => {
    if (!newApiKeyName.trim()) {
      toast({ title: "Error", description: "API Key name cannot be empty.", variant: "destructive" });
      return;
    }
    const result = addMockApiKey(newApiKeyName);
    if ('error' in result) {
      toast({ title: "Error Generating Key", description: result.error, variant: "destructive" });
    } else {
      setGeneratedApiKey(result); // Store the full key temporarily
      setShowFullKey(true); // Show the full key by default when first generated
      toast({ title: "API Key Generated", description: `Key "${result.name}" has been generated. Make sure to copy it now, you won't be able to see it again.`, variant: "default" });
      fetchApiKeys();
      setNewApiKeyName('');
      // Keep add dialog open to show the generated key
    }
  };
  
  const closeAddDialogAndReset = () => {
    setIsAddDialogOpen(false);
    setGeneratedApiKey(null);
    setShowFullKey(false);
    setNewApiKeyName('');
  }

  const handleDeleteKey = (apiKeyId: string, keyName: string) => {
    if (deleteMockApiKey(apiKeyId)) {
      toast({ title: "API Key Revoked", description: `Key "${keyName}" has been revoked.`, variant: "default" });
      fetchApiKeys();
    } else {
      toast({ title: "Error", description: "Could not revoke API key.", variant: "destructive" });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'API Key Copied!', description: 'The full API key has been copied to your clipboard.', variant: 'default' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> API Keys</CardTitle>
        <CardDescription>Manage API keys for programmatic access to LinkWiz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) closeAddDialogAndReset(); else setIsAddDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Generate New API Key</Button>
          </DialogTrigger>
          <DialogContent onEscapeKeyDown={closeAddDialogAndReset} onPointerDownOutside={closeAddDialogAndReset}>
            <DialogHeader>
              <DialogTitle>{generatedApiKey ? 'API Key Generated' : 'Generate New API Key'}</DialogTitle>
              <DialogDescription>
                {generatedApiKey 
                  ? 'Your new API key has been generated. Copy it now as you will not be able to see it again.'
                  : 'Enter a name for your new API key.'}
              </DialogDescription>
            </DialogHeader>
            {generatedApiKey ? (
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <p className="text-sm font-medium">{generatedApiKey.name}</p>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="generated-key">API Key</Label>
                    <div className="flex items-center gap-2">
                    <Input 
                        id="generated-key" 
                        readOnly 
                        value={showFullKey ? generatedApiKey.key : `${generatedApiKey.prefix}****************`} 
                        type={showFullKey ? "text" : "password"}
                        className="font-mono"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setShowFullKey(!showFullKey)}>
                        {showFullKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showFullKey ? "Hide" : "Show"} key</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleCopyKey(generatedApiKey.key)}>
                        <Copy className="h-4 w-4" />
                        <span className="sr-only">Copy key</span>
                    </Button>
                    </div>
                </div>
                <p className="text-xs text-destructive">
                    Warning: This key provides programmatic access to your account. Keep it secure and do not share it.
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
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              {generatedApiKey ? (
                <Button onClick={closeAddDialogAndReset}>Close</Button>
              ) : (
                <>
                  <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  <Button onClick={handleGenerateKey}>Generate Key</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Separator />
        <h3 className="text-lg font-medium">Your API Keys</h3>
        {apiKeys.length > 0 ? (
          <ul className="space-y-3">
            {apiKeys.map((key: ApiKey) => (
              <li key={key.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md gap-2">
                <div className="flex-grow">
                  <span className="font-medium">{key.name}</span>
                  <p className="text-xs text-muted-foreground font-mono" title={key.key}>{key.prefix}****************</p>
                  <p className="text-xs text-muted-foreground">
                    Created: {format(new Date(key.createdAt), "MMM d, yyyy")}
                    {key.lastUsedAt && ` • Last used: ${format(new Date(key.lastUsedAt), "MMM d, yyyy HH:mm")}`}
                  </p>
                </div>
                <div className="space-x-2 flex-shrink-0 self-start sm:self-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive-foreground hover:bg-destructive">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Revoke
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
