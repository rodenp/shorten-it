import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { FolderModel } from '@/models/Folders';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized'}, { status: 401 });
  const folders = await FolderModel.listByUser(session.user.id);
  return NextResponse.json(folders);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized'}, { status: 401 });
  const { name } = await request.json();
  if (!name) return NextResponse.json({ message: 'Name required' }, { status: 400 });
  const folder = await FolderModel.create(session.user.id, name);
  return NextResponse.json(folder, { status: 201 });
}