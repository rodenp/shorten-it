
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
      return collection.findOne({ email });
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
      return collection.findOne({ _id: new ObjectId(id) });
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async create(data: Omit<User, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoUsersCollection();
      const now = new Date();
      const result = await collection.insertOne({
        ...data,
        createdAt: now,
        updatedAt: now,
      });
      const insertedDoc = await collection.findOne({ _id: result.insertedId });
      if (!insertedDoc) throw new Error('Failed to retrieve created user from MongoDB');
      return { ...insertedDoc, id: insertedDoc._id.toHexString() };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const now = new Date();
      const newId = new ObjectId().toHexString(); 
      const res = await pool.query(
        'INSERT INTO users (id, name, email, password, "createdAt", "updatedAt", image) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [newId, data.name, data.email, data.password, now, now, data.image]
      );
      return res.rows[0];
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async update(id: string, data: Partial<Pick<User, 'name' | 'email' | 'image' | 'password'>>): Promise<User | null> {
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
      if (data.email !== undefined) updateData.$set.email = data.email;
      if (data.image !== undefined) updateData.$set.image = data.image;
      if (hashedPassword && data.password) updateData.$set.password = hashedPassword; // only set password if it was provided

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        updateData,
        { returnDocument: 'after' }
      );
      return result;
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
        setClauses.push(`email = $${valueCount++}`);
        values.push(data.email);
      }
      if (data.image !== undefined) {
        setClauses.push(`image = $${valueCount++}`);
        values.push(data.image);
      }
      if (hashedPassword && data.password) { // only set password if it was provided
        setClauses.push(`password = $${valueCount++}`);
        values.push(hashedPassword);
      }
      
      if (setClauses.length === 0) {
        // No actual fields to update other than potentially updatedAt, handle as needed
        // For now, just fetch the user if no data fields are changing.
        return this.findById(id);
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