
'use client';

import type { RetargetingPixel } from '@/types';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit, Target } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

const pixelTypes: RetargetingPixel['type'][] = ['Facebook Pixel', 'Google Ads Tag', 'LinkedIn Insight Tag', 'Custom'];

export function RetargetingSettings() {
  const { toast } = useToast();
  const [pixels, setPixels] = useState<RetargetingPixel[]>([]);
  const [isAddOrEditDialogOpen, setIsAddOrEditDialogOpen] = useState(false);
  const [currentPixel, setCurrentPixel] = useState<RetargetingPixel | null>(null);
  
  const [pixelName, setPixelName] = useState('');
  const [pixelType, setPixelType] = useState<RetargetingPixel['type']>(pixelTypes[0]);
  const [pixelIdValue, setPixelIdValue] = useState('');

  const fetchPixels = useCallback(async () => {
    try {
      const response = await fetch('/api/retargeting-pixels');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch pixels' }));
        throw new Error(errorData.message);
      }
      const data = await response.json();
      setPixels(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching pixels:", error);
      toast({ title: 'Error', description: error.message || 'Could not fetch retargeting pixels.', variant: 'destructive' });
      setPixels([]);
    }
  }, [toast]);

  useEffect(() => {
    fetchPixels();
  }, [fetchPixels]);

  const resetForm = () => {
    setCurrentPixel(null);
    setPixelName('');
    setPixelType(pixelTypes[0]);
    setPixelIdValue('');
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddOrEditDialogOpen(true);
  };

  const handleOpenEditDialog = (pixel: RetargetingPixel) => {
    setCurrentPixel(pixel);
    setPixelName(pixel.name);
    setPixelType(pixel.type);
    setPixelIdValue(pixel.pixelIdValue);
    setIsAddOrEditDialogOpen(true);
  };

  const handleSubmitPixel = async () => {
    if (!pixelName.trim()) {
      toast({ title: 'Validation Error', description: 'Pixel name cannot be empty.', variant: 'destructive' });
      return;
    }
    if (!pixelIdValue.trim()) {
      toast({ title: 'Validation Error', description: 'Pixel ID cannot be empty.', variant: 'destructive' });
      return;
    }

    const pixelData = { name: pixelName.trim(), type: pixelType, pixelIdValue: pixelIdValue.trim() };
    let url = '/api/retargeting-pixels';
    let method = 'POST';

    if (currentPixel) {
      url = `/api/retargeting-pixels/${currentPixel.id}`;
      method = 'PUT';
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pixelData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to ${currentPixel ? 'update' : 'add'} pixel` }));
        throw new Error(errorData.message);
      }

      const savedPixel = await response.json();
      toast({ 
        title: `Pixel ${currentPixel ? 'Updated' : 'Added'}`,
        description: `"${savedPixel.name}" has been successfully ${currentPixel ? 'updated' : 'added'}.`,
        variant: 'default' 
      });
      fetchPixels();
      setIsAddOrEditDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ 
        title: `Error ${currentPixel ? 'Updating' : 'Adding'} Pixel`,
        description: error.message || `Could not ${currentPixel ? 'update' : 'add'} the pixel.`,
        variant: 'destructive' 
      });
    }
  };

  const handleDeletePixel = async (pixelId: string, name: string) => {
    try {
      const response = await fetch(`/api/retargeting-pixels/${pixelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to delete pixel' }));
        throw new Error(errorData.message);
      }

      toast({ title: 'Pixel Deleted', description: `Pixel "${name}" has been deleted.`, variant: 'default' });
      fetchPixels();
    } catch (error: any) {
      toast({ 
        title: 'Error Deleting Pixel',
        description: error.message || 'Could not delete the pixel.',
        variant: 'destructive' 
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-primary" /> Retargeting Pixels</CardTitle>
        <CardDescription>Manage your retargeting pixels for tracking campaigns. These can be applied to your links.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Dialog open={isAddOrEditDialogOpen} onOpenChange={(isOpen) => {
            if (!isOpen) resetForm();
            setIsAddOrEditDialogOpen(isOpen);
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddDialog}><PlusCircle className="mr-2 h-4 w-4" /> Add New Pixel</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentPixel ? 'Edit' : 'Add New'} Retargeting Pixel</DialogTitle>
              <DialogDescription>
                {currentPixel ? 'Update the details for your retargeting pixel.' : 'Configure a new pixel for your campaigns.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="pixel-name">Pixel Name</Label>
                <Input
                  id="pixel-name"
                  value={pixelName}
                  onChange={(e) => setPixelName(e.target.value)}
                  placeholder="e.g., Main Facebook Pixel"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pixel-type">Pixel Type</Label>
                <Select value={pixelType} onValueChange={(value) => setPixelType(value as RetargetingPixel['type'])}>
                  <SelectTrigger id="pixel-type">
                    <SelectValue placeholder="Select pixel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {pixelTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pixel-id-value">Pixel ID / Tag Value</Label>
                <Input
                  id="pixel-id-value"
                  value={pixelIdValue}
                  onChange={(e) => setPixelIdValue(e.target.value)}
                  placeholder="Enter Pixel ID or Tag"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" onClick={resetForm}>Cancel</Button></DialogClose>
              <Button onClick={handleSubmitPixel}>{currentPixel ? 'Save Changes' : 'Add Pixel'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Separator />
        <h3 className="text-lg font-medium">Your Pixels</h3>
        {pixels.length > 0 ? (
          <ul className="space-y-3">
            {pixels.map((pixel) => (
              <li key={pixel.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md gap-2">
                <div className="flex-grow">
                  <p className="font-medium">{pixel.name}</p>
                  <p className="text-xs text-muted-foreground">Type: {pixel.type}</p>
                  <p className="text-xs text-muted-foreground">ID: {pixel.pixelIdValue}</p>
                  <p className="text-xs text-muted-foreground">Created: {pixel.createdAt ? format(new Date(pixel.createdAt), "MMM d, yyyy") : 'Date not available'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(pixel)}>
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. Deleting pixel "{pixel.name}" will remove it. Links using this pixel may need to be updated.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePixel(pixel.id, pixel.name)} className="bg-destructive hover:bg-destructive/90">
                          Delete Pixel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">No retargeting pixels added yet. Please add one to get started.</p>
        )}
      </CardContent>
    </Card>
  );
}

