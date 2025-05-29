
import { DB_TYPE, pool, clientPromise } from '../../scripts/db';
import type { DomainType } from '@/types'; 
import { Collection, Db, ObjectId } from 'mongodb';
import { debugLog } from '@/lib/logging';

export interface Domain {
  id: string; // For postgres, this is the primary key. For mongo, it can map to _id.
  _id?: ObjectId; // MongoDB specific ID
  userId: string;
  domainName: string;
  type: DomainType;
  verified: boolean; // Added verified field
  createdAt: string; // Should be Date
  updatedAt: string; // Should be Date
}

// For MongoDB (assuming a 'domains' collection, matching table name)
let DomainsCollection: Collection<Omit<Domain, 'id'> & { _id: ObjectId }> | null = null;

async function getMongoDomainsCollection(): Promise<Collection<Omit<Domain, 'id'> & { _id: ObjectId }>> {
  if (DomainsCollection) {
    return DomainsCollection;
  }
  if (!clientPromise) {
    throw new Error('MongoDB client promise not initialized for custom domains');
  }
  const client = await clientPromise;
  const db: Db = client.db();
  // Collection name changed from 'sub_domains' to 'domains' to match table and intent
  DomainsCollection = db.collection('domains');
  // Add any necessary indexes for MongoDB here, e.g., on userId and domainName
  await DomainsCollection.createIndex({ userId: 1, domainName: 1 }, { unique: true });
  return DomainsCollection;
}

function mapMongoDocToDomain(doc: (Omit<Domain, 'id'> & { _id: ObjectId }) | null): Domain | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  // Ensure verified is part of the returned object, defaulting if necessary
  return { id: _id.toHexString(), verified: false, ...rest };
}

export const DomainModel = {
  async findByUserId(userId: string, types?: DomainType[]): Promise<Domain[]> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoDomainsCollection();
      const query: any = { userId };
      if (types && types.length > 0) {
        query.type = { $in: types };
      }
      const docs = await collection.find(query).sort({ createdAt: 1 }).toArray();
      return docs.map(doc => mapMongoDocToDomain(doc)!);
    }

    // Postgres path:
    if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');

      // 1) Base query
      let sql = `
        SELECT 
          id, "userId", "domainName", type, "createdAt", "updatedAt"
        FROM domains
        WHERE "userId" = $1
      `;
      const params: any[] = [userId];

      // 2) Add type filter only if requested
      if (types && types.length > 0) {
        sql += ` AND type = ANY($2)`;
        params.push(types);
      }

      sql += ` ORDER BY "createdAt" ASC`;

      const res = await pool.query<{
        id: string;
        userId: string;
        domainName: string;
        type: DomainType;
        createdAt: Date;
        updatedAt: Date;
      }>(sql, params);

      return res.rows.map(r => ({
        id: r.id,
        userId: r.userId,
        domainName: r.domainName,
        type: r.type,
        verified: r.verified, // Added verified
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    }

    throw new Error('Unsupported DB_TYPE');
  },

  async findById(id: string): Promise<Domain | null> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoDomainsCollection();
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      return mapMongoDocToDomain(doc);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT id, "userId", "domainName", type, verified, "createdAt", "updatedAt" FROM domains WHERE id = $1', [id]);
      // Ensure row exists and map to Domain interface, explicitly including 'verified'
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.userId,
        domainName: row.domainName,
        type: row.type,
        verified: row.verified,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async create(userId: string, domainName: string, type: string): Promise<Domain> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoDomainsCollection();
      const result = await collection.insertOne({
        userId,
        domainName,
        type,
        verified: false, // Default verified to false on creation
        createdAt: now.toISOString(), // Ensure ISO string for consistency if type is string
        updatedAt: now.toISOString(), // Ensure ISO string
      } as Omit<Domain, 'id' | '_id' | 'createdAt' | 'updatedAt'> & { _id?: ObjectId; createdAt: Date; updatedAt: Date; verified: boolean });
      const newDoc = await collection.findOne({ _id: result.insertedId });
      return mapMongoDocToDomain(newDoc)!;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const newId = new ObjectId().toHexString(); 
      const res = await pool.query(
        'INSERT INTO domains (id, "userId", "domainName", type, verified, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [newId, userId, domainName, type, false, now, now]
      );
      // Map row to Domain interface, ensuring correct types/format
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.userId,
        domainName: row.domainName,
        type: row.type,
        verified: row.verified,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async update(id: string, userId: string, data: Partial<Pick<Domain, 'domainName' | 'verified'>>): Promise<Domain | null> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoDomainsCollection();
      const updateDoc: any = { $set: { updatedAt: now.toISOString() } };
      if (data.domainName !== undefined) updateDoc.$set.domainName = data.domainName;
      if (data.verified !== undefined) updateDoc.$set.verified = data.verified;
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id), userId }, // Ensure user owns the domain
        updateDoc,
        { returnDocument: 'after' }
      );
      return result ? mapMongoDocToDomain(result) : null;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (data.domainName !== undefined) {
        // Potentially add validation: domainName can only be changed if not verified and not used by links?
        // Or if type is 'local' (subdomain)
        setClauses.push(`"domainName" = $${valueCount++}`);
        values.push(data.domainName);
      }
      if (data.verified !== undefined) {
        setClauses.push(`verified = $${valueCount++}`);
        values.push(data.verified);
      }
      
      if (setClauses.length === 0) return this.findById(id); // No actual fields to update other than updatedAt

      setClauses.push(`"updatedAt" = $${valueCount++}`);
      values.push(now);
      values.push(id); 
      values.push(userId);

      const query = `UPDATE domains SET ${setClauses.join(', ')} WHERE id = $${valueCount} AND "userId" = $${valueCount + 1} RETURNING *`;
      const res = await pool.query(query, values);
      
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.userId,
        domainName: row.domainName,
        type: row.type,
        verified: row.verified,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      };
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async delete(id: string, userId: string): Promise<{ success: boolean; message?: string }> { // Added userId for ownership check
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return { success: false, message: 'Invalid ID format' };
      const collection = await getMongoDomainsCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id), userId }); // Ensure user owns the domain
      return { success: result.deletedCount === 1 };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('DELETE FROM domains WHERE id = $1 AND "userId" = $2', [id, userId]); // Ensure user owns the domain
      return { success: res.rowCount === 1 };
    }
    throw new Error('Unsupported DB_TYPE');
  },
};
