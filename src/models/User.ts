
import { DB_TYPE, clientPromise, pool } from '@/lib/db';
import { Collection, Db, ObjectId } from 'mongodb'; // Ensure ObjectId is imported
import bcrypt from 'bcryptjs'; // Import bcrypt for password hashing

export interface User {
  id?: string; // Optional for MongoDB as _id will be used
  _id?: ObjectId; // MongoDB specific ID
  name?: string | null;
  email?: string | null;
  emailVerified?: Date | null;
  image?: string | null;
  password?: string | null; // Hashed password
  termsAcceptedAt?: Date | null; // Timestamp when terms and privacy policy were accepted
  createdAt?: Date;
  updatedAt?: Date;
}

// For MongoDB
let usersCollection: Collection<User> | null = null;

async function getMongoUsersCollection(): Promise<Collection<User>> {
  if (usersCollection) {
    return usersCollection;
  }
  if (!clientPromise) {
    throw new Error('MongoDB client promise not initialized');
  }
  const client = await clientPromise;
  const db: Db = client.db(); // Use default DB or specify one e.g. client.db("yourDbName")
  usersCollection = db.collection<User>('users');
  // Create indexes for MongoDB
  await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
  return usersCollection;
}

// User model functions
export const UserModel = {
  async findByEmail(email: string): Promise<User | null> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoUsersCollection();
      const userDoc = await collection.findOne({ email });
      if (!userDoc) return null;
      const { _id, ...rest } = userDoc;
      return { id: _id.toHexString(), ...rest };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async findById(id: string): Promise<User | null> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoUsersCollection();
      if (!ObjectId.isValid(id)) return null; // Check if ID is a valid ObjectId string
      const userDoc = await collection.findOne({ _id: new ObjectId(id) });
      if (!userDoc) return null;
      const { _id, ...rest } = userDoc;
      return { id: _id.toHexString(), ...rest };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async create(data: Omit<User, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'termsAcceptedAt'> & { termsAcceptedAt?: Date }): Promise<User> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoUsersCollection();
      const now = new Date();
      const userData: any = {
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      if (data.termsAcceptedAt) {
        userData.termsAcceptedAt = data.termsAcceptedAt;
      }
      const result = await collection.insertOne(userData);
      const insertedDoc = await collection.findOne({ _id: result.insertedId });
      if (!insertedDoc) throw new Error('Failed to retrieve created user from MongoDB');
      const { _id, ...restDoc } = insertedDoc;
      return { id: _id.toHexString(), ...restDoc };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const now = new Date();
      const newId = new ObjectId().toHexString();
      const res = await pool.query(
        'INSERT INTO users (id, name, email, password, "termsAcceptedAt", "createdAt", "updatedAt", image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [newId, data.name, data.email, data.password, data.termsAcceptedAt, now, now, data.image]
      );
      return res.rows[0];
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async update(id: string, data: Partial<Pick<User, 'name' | 'email' | 'image' | 'password' | 'termsAcceptedAt'>>): Promise<User | null> {
    const now = new Date();
    let hashedPassword = data.password;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoUsersCollection();
      if (!ObjectId.isValid(id)) throw new Error('Invalid MongoDB ObjectId format');
      
      const updateData: any = { $set: { updatedAt: now } };
      if (data.name !== undefined) updateData.$set.name = data.name;
      if (data.email !== undefined) {
        // Check if email is actually changing to a new value
        const currentUser = await collection.findOne({ _id: new ObjectId(id) });
        if (currentUser && currentUser.email !== data.email) {
          updateData.$set.email = data.email;
          updateData.$set.emailVerified = null; // Reset email verification status
          // TODO: Trigger email verification flow for the new email address
          console.log(`[TODO] User ${id}: Email changed to ${data.email}. Trigger verification flow.`);
        } else if (currentUser && currentUser.email === data.email) {
          // Email is the same, do not update email or emailVerified
        } else {
           // User not found or email not set on current user, proceed with update if data.email is provided
           updateData.$set.email = data.email;
           updateData.$set.emailVerified = null; 
        }
      }
      if (data.image !== undefined) updateData.$set.image = data.image;
      if (hashedPassword && data.password) updateData.$set.password = hashedPassword; // only set password if it was provided
      if (data.termsAcceptedAt !== undefined) updateData.$set.termsAcceptedAt = data.termsAcceptedAt;

      if (Object.keys(updateData.$set).length === 0) { // Check if $set is empty
        // If only $set: { updatedAt: now } is present, or $set is empty, no actual fields to update.
        // Return current user data without making a DB call if no actual fields are changing.
        // However, findOneAndUpdate below will still update `updatedAt` if called.
        // For simplicity here, if $set is empty, we fetch and return.
        // If $set only contains `updatedAt` due to other logic, this check might need refinement.
        const userDoc = await collection.findOne({ _id: new ObjectId(id) });
        if (!userDoc) return null;
        const { _id, ...rest } = userDoc;
        return { id: _id.toHexString(), ...rest };
      }
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        updateData,
        { returnDocument: 'after' }
      );
      // Ensure the returned document maps _id to id for consistency
      if (!result) return null;
      const { _id, ...rest } = result;
      return { id: _id.toHexString(), ...rest };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (data.name !== undefined) {
        setClauses.push(`name = $${valueCount++}`);
        values.push(data.name);
      }
      if (data.email !== undefined) {
        // Check if email is actually changing
        const currentUserRes = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
        if (currentUserRes.rows.length > 0 && currentUserRes.rows[0].email !== data.email) {
          setClauses.push(`email = $${valueCount++}`);
          values.push(data.email);
          setClauses.push(`"emailVerified" = $${valueCount++}`);
          values.push(null); // Reset email verification status
          // TODO: Trigger email verification flow for the new email address
          console.log(`[TODO] User ${id}: Email changed to ${data.email}. Trigger verification flow.`);
        } else if (currentUserRes.rows.length > 0 && currentUserRes.rows[0].email === data.email) {
          // Email is the same, do not update
        } else {
          // User not found, or email not currently set. Allow update.
          setClauses.push(`email = $${valueCount++}`);
          values.push(data.email);
          setClauses.push(`"emailVerified" = $${valueCount++}`);
          values.push(null);
        }
      }
      if (data.image !== undefined) {
        setClauses.push(`image = $${valueCount++}`);
        values.push(data.image);
      }
      if (hashedPassword && data.password) { // only set password if it was provided
        setClauses.push(`password = $${valueCount++}`);
        values.push(hashedPassword);
      }
      if (data.termsAcceptedAt !== undefined) {
        setClauses.push(`"termsAcceptedAt" = $${valueCount++}`);
        values.push(data.termsAcceptedAt);
      }
      
      if (setClauses.length === 0) {
        // If only updatedAt is being changed implicitly, or no actual data fields are changing.
        // We might still want to update `updatedAt` or just fetch the user.
        // For now, let's ensure `updatedAt` is updated if any fields were meant to be set.
        // If truly no fields (even `updatedAt` implicitly) are to be updated, this might return current user.
        // However, the function signature implies data fields are expected for an update.
        // If only `updatedAt` needs updating, it should be explicitly part of `data` or handled differently.
        // The current logic will update `updatedAt` regardless.
        // If setClauses is empty but we proceed, it means only `updatedAt` is updated.
      }

      setClauses.push(`"updatedAt" = $${valueCount++}`);
      values.push(now);

      values.push(id); // For WHERE id = $last
      const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${valueCount} RETURNING *`;
      
      const res = await pool.query(query, values);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  }
};