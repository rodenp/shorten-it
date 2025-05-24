'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronsUpDown } from 'lucide-react';

interface Props {
  id: string;
  url: string;
  weight: number;
  onUrlChange: (val: string) => void;
  onRemove: () => void;
}

export function SortableTargetItem({
  id,
  url,
  onUrlChange,
  onRemove,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex space-x-2 items-center"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 text-muted-foreground"
      >
        <ChevronsUpDown />
      </span>
      <Input
        placeholder="https://example.com/page"
        value={url}
        onChange={(e) => onUrlChange(e.currentTarget.value)}
        className="flex-1"
      />
      <Button size="icon" variant="ghost" onClick={onRemove}>
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
}