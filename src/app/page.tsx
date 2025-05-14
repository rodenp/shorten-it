
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth'; // Adjust path as necessary

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  // Ensure the component returns null or JSX, even if redirecting.
  return null; 
}
