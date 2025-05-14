
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth'; // We'll define authOptions in a separate file

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
