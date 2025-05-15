
import { DB_TYPE, pool, clientPromise } from '@/lib/db';
import { Collection, Db, ObjectId } from 'mongodb';
import crypto from 'crypto'; // For generating secure random bytes
import bcrypt from 'bcryptjs'; // For hashing the API key

export interface ApiKey {
  id: string; // Corresponds to _id in MongoDB or id in PostgreSQL
  _id?: ObjectId; // MongoDB specific ID
  userId: string;
  name: string;
  prefix: string; // First few characters of the key for display
  hashedKey: string; // The hash of the actual key
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date | null;
}

// This interface includes the raw key, only for the response when a key is first created.
export interface NewApiKeyResponse extends Omit<ApiKey, 'hashedKey' | '_id'> {
  key: string; // The raw, unhashed API key
}

// For MongoDB (assuming an 'api_keys' collection)
let apiKeysCollection: Collection<Omit<ApiKey, 'id'> & { _id: ObjectId }> | null = null;

async function getMongoApiKeysCollection(): Promise<Collection<Omit<ApiKey, 'id'> & { _id: ObjectId }>> {
  if (apiKeysCollection) {
    return apiKeysCollection;
  }
  if (!clientPromise) {
    throw new Error('MongoDB client promise not initialized for API keys');
  }
  const client = await clientPromise;
  const db: Db = client.db();
  apiKeysCollection = db.collection('api_keys');
  await apiKeysCollection.createIndex({ userId: 1 });
  await apiKeysCollection.createIndex({ hashedKey: 1 }, { unique: true });
  await apiKeysCollection.createIndex({ prefix: 1 });
  return apiKeysCollection;
}

function mapMongoDocToApiKey(doc: (Omit<ApiKey, 'id'> & { _id: ObjectId }) | null): Omit<ApiKey, 'hashedKey' | '_id'> | null {
  if (!doc) return null;
  const { _id, hashedKey, ...rest } = doc; // Exclude hashedKey from default mapping
  return { id: _id.toHexString(), ...rest };
}

function mapMongoDocToApiKeyWithHash(doc: (Omit<ApiKey, 'id'> & { _id: ObjectId }) | null): ApiKey | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}


const generateApiKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const ApiKeyModel = {
  async findByUserId(userId: string): Promise<Omit<ApiKey, 'hashedKey' | '_id'>[]> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoApiKeysCollection();
      const docs = await collection.find({ userId }).project({ hashedKey: 0 }).toArray();
      return docs.map(doc => mapMongoDocToApiKey(doc)!);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query(
        'SELECT id, "userId", name, prefix, permissions, "createdAt", "lastUsedAt" FROM api_keys WHERE "userId" = $1 ORDER BY "createdAt" ASC',
        [userId]
      );
      return res.rows;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async create(userId: string, name: string, permissions: string[]): Promise<NewApiKeyResponse> {
    const rawKey = `sk_${generateApiKey()}`;
    const prefix = rawKey.substring(0, 7); // e.g., "sk_abc123"
    const hashedKey = await bcrypt.hash(rawKey, 10);
    const now = new Date();

    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoApiKeysCollection();
      const result = await collection.insertOne({
        userId,
        name,
        prefix,
        hashedKey,
        permissions,
        createdAt: now,
        lastUsedAt: null,
      } as Omit<ApiKey, 'id' | '_id'> & { _id?: ObjectId }); // Cast for MongoDB driver
      
      // Important: Return the raw key HERE, it won't be stored like this.
      return {
        id: result.insertedId.toHexString(),
        key: rawKey, // The raw key
        userId,
        name,
        prefix,
        permissions,
        createdAt: now,
        lastUsedAt: null,
      };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const newId = new ObjectId().toHexString(); // Generate a unique ID for the DB record
      await pool.query(
        'INSERT INTO api_keys (id, "userId", name, prefix, "hashedKey", permissions, "createdAt", "lastUsedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [newId, userId, name, prefix, hashedKey, permissions, now, null]
      );
      // Important: Return the raw key HERE
      return {
        id: newId,
        key: rawKey, // The raw key
        userId,
        name,
        prefix,
        permissions,
        createdAt: now,
        lastUsedAt: null,
      };
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async delete(id: string, userId: string): Promise<{ success: boolean; message?: string }> {
    // Ensure the key belongs to the user trying to delete it
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return { success: false, message: 'Invalid ID format' };
      const collection = await getMongoApiKeysCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id), userId });
      return { success: result.deletedCount === 1 };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('DELETE FROM api_keys WHERE id = $1 AND "userId" = $2', [id, userId]);
      return { success: res.rowCount === 1 };
    }
    throw new Error('Unsupported DB_TYPE');
  },

  // This function would be used by an authentication strategy, not directly by the settings UI
  async findByKey(key: string): Promise<ApiKey | null> {
    const prefix = key.substring(0, 7);
    // This is a simplified lookup. In a real scenario with many keys, 
    // you might not want to fetch all keys with the same prefix.
    // However, for API key validation, you'd iterate and bcrypt.compare.
    if (DB_TYPE === 'mongodb') {
        const collection = await getMongoApiKeysCollection();
        // Fetch potential candidates by prefix. This is an optimization to reduce bcrypt operations.
        const candidates = await collection.find({ prefix }).toArray();
        for (const candidateDoc of candidates) {
            const isValid = await bcrypt.compare(key, candidateDoc.hashedKey);
            if (isValid) return mapMongoDocToApiKeyWithHash(candidateDoc);
        }
        return null;
    } else if (DB_TYPE === 'postgres') {
        if (!pool) throw new Error('PostgreSQL pool not initialized.');
        const res = await pool.query('SELECT * FROM api_keys WHERE prefix = $1', [prefix]);
        for (const row of res.rows) {
            const isValid = await bcrypt.compare(key, row.hashedKey);
            if (isValid) return row;
        }
        return null;
    }
    throw new Error('Unsupported DB_TYPE');
  }
};
