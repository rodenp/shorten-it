import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useLinkParams } from '@/context/LinkParamsContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('localhost') ||
    trimmed.startsWith('http://localhost') ||
    trimmed.startsWith('https://localhost')
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

const postFieldNames = [
    'originalUrl',
    'slug',
    'title',
    'tags',
    'folderId',
    'domainId',
    'targets',
    'abTestConfig',
    'isCloaked',
    'shortUrl',
    'rotationStart',
    'rotationEnd',
    'clickLimit',
  ] as const;

export function generatePayloadFromContext({
  method,
  context,
  original,
  current
}: {
  method: 'POST' | 'PATCH';
  context: Record<string, any>;
  original: Record<string, any>;
  current: Record<string, any>;
}): Record<string, any> {
  const postFieldNames = [
    'originalUrl',
    'slug',
    'title',
    'tags',
    'folderId',
    'domainId',
    'targets',
    'abTestConfig',
    'isCloaked',
    'shortUrl',
    'rotationStart',
    'rotationEnd',
    'clickLimit',
  ];

  let payload: Record<string, any> = {};

  if (method === 'POST') {
    for (const field of postFieldNames) {
      const value = context[field];
      if (field === 'abTestConfig') {
        if (value === null) {
          payload[field] = null;
        } else if (value?.variantAUrl !== '') {
          payload[field] = value;
        }
      } else if (value != null) {
        payload[field] = value;
      }
    }
  } else {
    // PATCH: only include fields that changed
    for (const field of postFieldNames) {
      const originalVal = original[field];
      const currentVal = current[field];
      if (JSON.stringify(originalVal) !== JSON.stringify(currentVal)) {
        payload[field] = currentVal;
      }
    }
  }

  const fullPayload = { ...payload };

  console.log('generatePayloadFromContext:Generated Payload:', fullPayload);

  return fullPayload;
}