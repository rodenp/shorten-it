// src/app/api/internal/validate-api-key/route.ts
import { NextResponse } from 'next/server';
import { ApiKeyModel, type ApiKey } from '@/models/ApiKey'; // Ensure ApiKey type is imported

export const runtime = 'nodejs'; // Force Node.js runtime for DB access

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ success: false, message: 'API key is required' }, { status: 400 });
    }

    // ApiKeyModel.findByKey now uses SHA256 and is Edge-compatible in terms of its own crypto functions,
    // but it accesses the DB, hence this route is Node.js based.
    const apiKeyData: ApiKey | null = await ApiKeyModel.findByKey(apiKey);

    if (apiKeyData) {
      return NextResponse.json({
        success: true,
        userId: apiKeyData.userId,
        permissions: apiKeyData.permissions,
        // id: apiKeyData.id, // If needed for updating lastUsedAt later
      });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid API key' }, { status: 401 });
    }
  } catch (error) {
    console.error('[API /internal/validate-api-key] Error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error during key validation' }, { status: 500 });
  }
}
