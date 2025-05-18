
import NextAuth, { type NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel } from '@/models/User';
import bcrypt from 'bcryptjs';
import { DB_TYPE, clientPromise, pool } from './db';
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import PgAdapter from "@auth/pg-adapter";
import { debugLog, debugWarn } from '@/lib/logging';

let adapter: Adapter;

if (DB_TYPE === 'mongodb') {
  if (!clientPromise) {
    const errorMessage = 'MongoDB client promise is not initialized. Check lib/db.ts and .env file for MONGODB_URI.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    adapter = MongoDBAdapter(clientPromise, {
      databaseName: process.env.MONGODB_DB_NAME || undefined,
      collections: {
        Users: "users",
        Accounts: "accounts",
        Sessions: "sessions",
        VerificationTokens: "verification_tokens",
      }
    });
    debugLog("Using MongoDBAdapter (@auth/mongodb-adapter) for NextAuth.");
  } catch (e: any) {
    console.error("Failed to load MongoDBAdapter. If using MongoDB, ensure '@auth/mongodb-adapter' is installed.", e);
    if (e.code === 'MODULE_NOT_FOUND') {
      throw new Error("The '@auth/mongodb-adapter' package was not found. Please ensure it is installed correctly by checking your 'node_modules' folder and carefully review the output of 'npm install' for any errors related to this package. Then restart the server.");
    }
    throw new Error("MongoDBAdapter (@auth/mongodb-adapter) not found or failed to load. Please install '@auth/mongodb-adapter' if DB_TYPE is 'mongodb'.");
  }
} else if (DB_TYPE === 'postgres') {
  if (!pool) {
    const errorMessage = 'PostgreSQL pool is not initialized. Check lib/db.ts and .env file for POSTGRES_URI.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    adapter = PgAdapter(pool);
    debugLog("Using PgAdapter (@auth/pg-adapter) for NextAuth.");
  } catch (e: any) {
    console.error("Failed to load PgAdapter. If using PostgreSQL, ensure '@auth/pg-adapter' is installed.", e);
     if (e.code === 'MODULE_NOT_FOUND') {
      throw new Error("The '@auth/pg-adapter' package was not found. Please ensure it is installed correctly by checking your 'node_modules' folder and carefully review the output of 'npm install' for any errors related to this package. Then restart the server.");
    }
    throw new Error("PgAdapter (@auth/pg-adapter) not found or failed to load. Please install '@auth/pg-adapter' if DB_TYPE is 'postgres'.");
  }
} else {
  const errorMessage = 'Invalid DB_TYPE specified in .env file. Must be "mongodb" or "postgres". Auth adapter cannot be initialized.';
  console.error(errorMessage);
  throw new Error(errorMessage);
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
          debugLog('Auth: Missing credentials');
          return null;
        }

        const user = await UserModel.findByEmail(credentials.email as string);

        if (!user) {
          debugLog(`Auth: No user found for email ${credentials.email}`);
          return null;
        }

        if (!user.password) {
            debugLog(`Auth: User ${credentials.email} has no password set (e.g. OAuth user).`);
            return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isPasswordValid) {
          debugLog(`Auth: Invalid password for user ${credentials.email}`);
          return null;
        }

        debugLog(`Auth: User ${credentials.email} authenticated successfully.`);
        let userId = user.id;
        if (DB_TYPE === 'mongodb' && user._id && !user.id) {
            userId = user._id.toHexString();
        }

        return {
          id: userId!,
          name: user.name,
          email: user.email,
          // image: user.image, // Omitted to prevent large base64 strings in JWT
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
        // If you were also adding user.image to the token here, remove it too.
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as NextAuthUser & { id: string }).id = token.id as string;
        // Note: session.user.image will be undefined here unless populated from another source
        // If you need an image URL, it's better to have a separate API endpoint or a URL in the DB
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
