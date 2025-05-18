'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, PlusCircle } from 'lucide-react';

export  function CampaignTemplatesSettings() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newMedium, setNewMedium] = useState('');
  const [newCampaign, setNewCampaign] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/campaign-templates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
      });
  }, []);

  const handleCreateTemplate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/campaign-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          source: newSource,
          medium: newMedium,
          campaign: newCampaign,
          term: newTerm,
          content: newContent
        })
      });
      if (!res.ok) throw new Error('Failed to create');
      const updated = await res.json();
      setTemplates(prev => [...prev, updated]);
      setNewTemplateName('');
      setNewSource('');
      setNewMedium('');
      setNewCampaign('');
      setNewTerm('');
      setNewContent('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await fetch(`/api/campaign-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateTemplate = async () => {
    try {
      const res = await fetch(`/api/campaign-templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTemplate)
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setTemplates(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setEditingTemplate(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Templates</CardTitle>
        <CardDescription>Create and manage reusable UTM link templates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm"><PlusCircle className="w-4 h-4 mr-2" />New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div><Label>Name</Label><Input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} /></div>
              <div><Label>Source</Label><Input value={newSource} onChange={e => setNewSource(e.target.value)} /></div>
              <div><Label>Medium</Label><Input value={newMedium} onChange={e => setNewMedium(e.target.value)} /></div>
              <div><Label>Campaign</Label><Input value={newCampaign} onChange={e => setNewCampaign(e.target.value)} /></div>
              <div><Label>Term</Label><Input value={newTerm} onChange={e => setNewTerm(e.target.value)} /></div>
              <div><Label>Content</Label><Input value={newContent} onChange={e => setNewContent(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
              <Button onClick={handleCreateTemplate} disabled={isSubmitting}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-2">
          {templates.map((template: any) => (
            <div key={template.id} className="border p-3 rounded-md flex justify-between items-start">
              <div>
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                  {template.source && <div><strong>Source:</strong> {template.source}</div>}
                  {template.medium && <div><strong>Medium:</strong> {template.medium}</div>}
                  {template.campaign && <div><strong>Campaign:</strong> {template.campaign}</div>}
                  {template.term && <div><strong>Term:</strong> {template.term}</div>}
                  {template.content && <div><strong>Content:</strong> {template.content}</div>}
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <Button size="icon" variant="ghost" onClick={() => setEditingTemplate({ ...template })}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost"><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Template</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>Are you sure you want to delete this campaign template?</AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        {editingTemplate && (
          <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Campaign Template</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div><Label>Name</Label>
                  <Input
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  />
                </div>
                <div><Label>Source</Label>
                  <Input
                    value={editingTemplate.source}
                    onChange={e => setEditingTemplate({ ...editingTemplate, source: e.target.value })}
                  />
                </div>
                <div><Label>Medium</Label>
                  <Input
                    value={editingTemplate.medium}
                    onChange={e => setEditingTemplate({ ...editingTemplate, medium: e.target.value })}
                  />
                </div>
                <div><Label>Campaign</Label>
                  <Input
                    value={editingTemplate.campaign}
                    onChange={e => setEditingTemplate({ ...editingTemplate, campaign: e.target.value })}
                  />
                </div>
                <div><Label>Term</Label>
                  <Input
                    value={editingTemplate.term}
                    onChange={e => setEditingTemplate({ ...editingTemplate, term: e.target.value })}
                  />
                </div>
                <div><Label>Content</Label>
                  <Input
                    value={editingTemplate.content}
                    onChange={e => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                <Button onClick={handleUpdateTemplate}>Update</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}