
import { DB_TYPE, pool, clientPromise } from '@/lib/db';
import { Collection, Db, ObjectId } from 'mongodb';
// REMOVED: import bcrypt from 'bcryptjs';

// Helper function to generate SHA-256 hash for API keys (Edge-compatible)
async function generateSha256Hash(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  // 'crypto.subtle' is globally available in Edge and modern Node.js (>=15)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export interface ApiKey {
  id: string; 
  _id?: ObjectId; 
  userId: string;
  name: string;
  prefix: string; 
  hashedKey: string; // Now stores SHA-256 hash of the key
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date | null;
}

export interface NewApiKeyResponse extends Omit<ApiKey, 'hashedKey' | '_id'> {
  key: string; 
}

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
  const { _id, hashedKey, ...rest } = doc; 
  return { id: _id.toHexString(), ...rest };
}

function mapMongoDocToApiKeyWithHash(doc: (Omit<ApiKey, 'id'> & { _id: ObjectId }) | null): ApiKey | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

const generateApiKey = (length = 32) => {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer); 
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
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
    const prefix = rawKey.substring(0, 7); 
    const hashedKey = await generateSha256Hash(rawKey); // Use SHA-256 hashing
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
      } as Omit<ApiKey, 'id' | '_id'> & { _id?: ObjectId }); 
      
      return {
        id: result.insertedId.toHexString(),
        key: rawKey, 
        userId,
        name,
        prefix,
        permissions,
        createdAt: now,
        lastUsedAt: null,
      };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const newId = new ObjectId().toHexString(); 
      await pool.query(
        'INSERT INTO api_keys (id, "userId", name, prefix, "hashedKey", permissions, "createdAt", "lastUsedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [newId, userId, name, prefix, hashedKey, permissions, now, null]
      );
      return {
        id: newId,
        key: rawKey, 
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

  async findByKey(key: string): Promise<ApiKey | null> {
    const hashedKeyToCompare = await generateSha256Hash(key);

    if (DB_TYPE === 'mongodb') {
        const collection = await getMongoApiKeysCollection();
        const candidateDoc = await collection.findOne({ hashedKey: hashedKeyToCompare });
        if (candidateDoc) return mapMongoDocToApiKeyWithHash(candidateDoc);
    } else if (DB_TYPE === 'postgres') {
        if (!pool) throw new Error('PostgreSQL pool not initialized.');
        const res = await pool.query('SELECT * FROM api_keys WHERE "hashedKey" = $1', [hashedKeyToCompare]);
        if (res.rows.length > 0) return res.rows[0] as ApiKey; // Ensure correct typing
    }
    return null;
  }
};
