import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserModel } from '@/models/User';
import bcrypt from 'bcryptjs';
import { DB_TYPE, pool, clientPromise } from './db'; // Import clientPromise for MongoDB
import PostgresAdapter from "@auth/pg-adapter";
import { MongoDBAdapter } from "@auth/mongodb-adapter"; // Import MongoDBAdapter

let adapter: Adapter;

if (DB_TYPE === 'mongodb') {
  if (!clientPromise) {
    const errorMessage = 'MongoDB client promise is not initialized. Check lib/db.ts and .env file for MONGODB_URI.';
    console.error(errorMessage);
    throw new Error(errorMessage);
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
  console.log("Using MongoDBAdapter for NextAuth.");
} else if (DB_TYPE === 'postgres') {
  if (!pool) {
    const errorMessage = 'PostgreSQL pool is not initialized. Check lib/db.ts and .env file for POSTGRES_URI.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  adapter = PostgresAdapter(pool);
  console.log("Using PostgresAdapter for NextAuth.");
} else {
  const errorMessage = 'Invalid DB_TYPE specified in .env file. Must be "mongodb" or "postgres". Auth adapter cannot be initialized.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
        // Ensure the returned user object aligns with NextAuthUser expectations
        // For MongoDB, user._id is an ObjectId. Adapter might handle it or expect a string.
        // The UserModel.create already maps _id to id as a string, which is good.
        // Ensure findByEmail returns id as a string if it's MongoDB.
        let userId = user.id;
        if (DB_TYPE === 'mongodb' && user._id && !user.id) {
            userId = user._id.toHexString();
        }

        return {
          id: userId!,
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
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
});
