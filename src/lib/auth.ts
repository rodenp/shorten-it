
import type { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel, type User as AppUser } from '@/models/User'; // Ensure AppUser is imported
import bcrypt from 'bcryptjs';
import { DB_TYPE, clientPromise, pool } from './db';
// import { MongoDBAdapter } from "@next-auth/mongodb-adapter"; // v4 adapter name
// import { PgAdapter } from "@next-auth/pg-adapter"; // v4 adapter name
import type { Adapter } from 'next-auth/adapters';

let adapter: Adapter;

if (DB_TYPE === 'mongodb') {
  if (!clientPromise) {
    console.error('MongoDB client promise is not initialized. Check lib/db.ts and .env file for MONGODB_URI.');
    throw new Error('MongoDB not configured for auth adapter. Ensure MONGODB_URI is set in .env and db.ts is correct.');
  }
  try {
    console.log("Attempting to load @next-auth/mongodb-adapter (v4)...");
    const { MongoDBAdapter } = require("@next-auth/mongodb-adapter");
    if (!MongoDBAdapter) {
        throw new Error("MongoDBAdapter (v4) was not found in the @next-auth/mongodb-adapter module. This is unexpected.");
    }
    adapter = MongoDBAdapter(clientPromise, {
      databaseName: process.env.MONGODB_DB_NAME || undefined,
      collections: {
        Users: "users",
        Accounts: "accounts",
        Sessions: "sessions",
        VerificationTokens: "verification_tokens",
      }
    });
    console.log("Successfully loaded and initialized MongoDBAdapter (v4) for NextAuth.");
  } catch (e: any) {
    console.error("Failed to load or initialize MongoDBAdapter. Original error:", e);
    if (e.code === 'MODULE_NOT_FOUND') {
        throw new Error("The '@next-auth/mongodb-adapter' package was not found. Please ensure it is installed correctly (check node_modules) and that 'npm install' completed without errors for this package. Then restart the server.");
    }
    throw new Error("MongoDBAdapter (v4) could not be loaded or initialized. Check server logs for the original error. Ensure '@next-auth/mongodb-adapter' is correctly installed.");
  }
} else if (DB_TYPE === 'postgres') {
  if (!pool) {
    console.error('PostgreSQL pool is not initialized. Check lib/db.ts and .env file for POSTGRES_URI.');
    throw new Error('PostgreSQL not configured for auth adapter. Ensure POSTGRES_URI is set in .env and db.ts is correct.');
  }
  try {
    console.log("Attempting to load @next-auth/pg-adapter (v4)...");
    const { PgAdapter } = require("@next-auth/pg-adapter");
    if (!PgAdapter) {
        throw new Error("PgAdapter (v4) was not found in the @next-auth/pg-adapter module. This is unexpected.");
    }
    adapter = PgAdapter(pool);
    console.log("Successfully loaded and initialized PgAdapter (v4) for NextAuth.");
  } catch (e: any) {
    console.error("Failed to load or initialize PgAdapter. Original error:", e);
     if (e.code === 'MODULE_NOT_FOUND') {
        throw new Error("The '@next-auth/pg-adapter' package was not found. Please ensure it is installed correctly by checking your 'node_modules' folder and carefully review the output of 'npm install' for any errors related to this package. Then restart the server.");
    }
    throw new Error("PgAdapter (v4) could not be loaded or initialized. Check server logs for the original error. Ensure '@next-auth/pg-adapter' is correctly installed.");
  }
} else {
  console.error('Invalid DB_TYPE specified in .env file. Must be "mongodb" or "postgres". Auth adapter cannot be initialized.');
  throw new Error('Invalid DB_TYPE for auth adapter. Must be "mongodb" or "postgres".');
}

if (!adapter) {
  console.error(`Auth adapter could not be initialized for DB_TYPE: ${DB_TYPE}. This is an unexpected state. Ensure the correct adapter package is installed and resolvable.`);
  throw new Error(`Auth adapter initialization failed for DB_TYPE: ${DB_TYPE}. Check .env configuration and ensure the corresponding '@next-auth/*' adapter package (v4) is installed and can be required by the application.`);
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
            return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          console.log(`Auth: Invalid password for user ${credentials.email}`);
          return null;
        }

        console.log(`Auth: User ${credentials.email} authenticated successfully.`);
        return {
          id: DB_TYPE === 'mongodb' ? user._id!.toHexString() : user.id!,
          name: user.name,
          email: user.email,
          image: user.image,
        } as NextAuthUser;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as NextAuthUser & { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    // signOut: '/auth/signout', // Optional: custom signout page
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // (used for email/passwordless login)
    // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave undefined to redirect to /)
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
