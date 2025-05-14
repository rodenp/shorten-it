import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth'; // Adjust path as necessary

export default async function RootPage() {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  // Ensure the component returns null or JSX, even if redirecting.
  return null; 
}
