
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel, type User as AppUser } from '@/models/User'; // Ensure AppUser is imported
import bcrypt from 'bcryptjs';
import { DB_TYPE, clientPromise, pool } from './db';
// Removed static imports for MongoDBAdapter and PgAdapter here
import type { Adapter } from 'next-auth/adapters';

let adapter: Adapter;

if (DB_TYPE === 'mongodb') {
  if (!clientPromise) {
    throw new Error('MongoDB client promise is not initialized. Check lib/db.ts and .env file for MONGODB_URI.');
  }
  try {
    const { MongoDBAdapter } = require("@auth/mongodb-adapter");
    adapter = MongoDBAdapter(clientPromise, {
      databaseName: process.env.MONGODB_DB_NAME || undefined, // Optional: specify DB name if not in URI
      collections: {
        Users: "users", // Ensure this matches your User model collection name
        Accounts: "accounts",
        Sessions: "sessions",
        VerificationTokens: "verification_tokens",
      }
    });
  } catch (e) {
    console.error("Failed to load MongoDBAdapter. Ensure '@auth/mongodb-adapter' is installed if using MongoDB.", e);
    throw new Error("MongoDBAdapter not found. Please install '@auth/mongodb-adapter'.");
  }
} else if (DB_TYPE === 'postgres') {
  if (!pool) {
    throw new Error('PostgreSQL pool is not initialized. Check lib/db.ts and .env file for POSTGRES_URI.');
  }
  try {
    const { PgAdapter } = require("@auth/pg-adapter"); // Corrected import name
    adapter = PgAdapter(pool);
  } catch (e) {
    console.error("Failed to load PgAdapter. Ensure '@auth/pg-adapter' is installed if using PostgreSQL.", e);
    throw new Error("PgAdapter not found. Please install '@auth/pg-adapter'.");
  }
} else {
  throw new Error('Invalid DB_TYPE. Must be "mongodb" or "postgres".');
}


export const authOptions: NextAuthOptions = {
  adapter: adapter,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'jsmith@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('Auth: Missing credentials');
          return null;
        }

        const user = await UserModel.findByEmail(credentials.email);

        if (!user) {
          console.log(`Auth: No user found for email ${credentials.email}`);
          return null;
        }

        if (!user.password) {
            console.log(`Auth: User ${credentials.email} has no password set (e.g. OAuth user).`);
            return null; // User might exist from OAuth, but has no password
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          console.log(`Auth: Invalid password for user ${credentials.email}`);
          return null;
        }
        
        console.log(`Auth: User ${credentials.email} authenticated successfully.`);
        // Return an object that NextAuth expects for the user session
        // The adapter handles mapping DB fields to NextAuth user fields for session/JWT
        return {
          id: DB_TYPE === 'mongodb' ? user._id!.toHexString() : user.id!,
          name: user.name,
          email: user.email,
          image: user.image,
        } as NextAuthUser; // Cast to NextAuthUser
      },
    }),
    // ...add more providers here (e.g., GoogleProvider, GitHubProvider)
  ],
  session: {
    strategy: 'jwt', // Use JWT for session strategy. Database sessions are managed by the adapter.
  },
  callbacks: {
    async jwt({ token, user }) {
      // If user object exists (on sign in), add user ID to token
      if (user) {
        token.id = user.id; 
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID from token to session object
      if (session.user && token.id) {
        (session.user as NextAuthUser & { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    // signOut: '/auth/signout', // default
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // (e.g. check your email)
    // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  },
  secret: process.env.NEXTAUTH_SECRET, // Crucial for production
  debug: process.env.NODE_ENV === 'development', // Enable debug messages in development
};
