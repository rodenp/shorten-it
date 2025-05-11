import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
  // Ensure the component returns null or JSX, even if redirecting.
  return null; 
}
