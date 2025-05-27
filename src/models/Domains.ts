
import { DB_TYPE, pool, clientPromise } from '@/lib/db';
import type { DomainType } from '@/types'; 
import { Collection, Db, ObjectId } from 'mongodb';
import { debugLog } from '@/lib/logging';

export interface Domain {
  id: string; // For postgres, this is the primary key. For mongo, it can map to _id.
  _id?: ObjectId; // MongoDB specific ID
  userId: string;
  domainName: string;
  type: DomainType;
  createdAt: string;
  updatedAt: string;
}

// For MongoDB (assuming a 'sub_domains' collection)
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
  DomainsCollection = db.collection('sub_domains');
  // Add any necessary indexes for MongoDB here, e.g., on userId and DomainName
  await DomainsCollection.createIndex({ userId: 1, DomainName: 1 }, { unique: true });
  return DomainsCollection;
}

function mapMongoDocToDomain(doc: (Omit<Domain, 'id'> & { _id: ObjectId }) | null): Domain | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export const DomainModel = {
  async findByUserId(userId: string, types?: DomainType[]): Promise<Domain[]> {
    if (DB_TYPE === 'mongodb') {
      // … your Mongo code …
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
        id:         r.id,
        userId:     r.userId,
        domainName: r.domainName,
        type:       r.type,
        createdAt:  r.createdAt.toISOString(),
        updatedAt:  r.updatedAt.toISOString(),
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
      const res = await pool.query('SELECT * FROM domains WHERE id = $1', [id]);
      return res.rows[0] || null;
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
        createdAt: now,
        updatedAt: now,
      } as Omit<Domain, 'id' | '_id'> & { _id?: ObjectId }); // Casting to satisfy Mongo driver, _id will be generated
      const newDoc = await collection.findOne({_id: result.insertedId});
      return mapMongoDocToDomain(newDoc)!;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const newId = new ObjectId().toHexString(); // Generate a unique ID
      const res = await pool.query(
        'INSERT INTO domains (id, "userId", "domainName", "type", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [newId, userId, domainName, type, now, now]
      );
      return res.rows[0];
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return { success: false, message: 'Invalid ID format' };
      const collection = await getMongoDomainsCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return { success: result.deletedCount === 1 };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('DELETE FROM domains WHERE id = $1', [id]);
      return { success: res.rowCount === 1 };
    }
    throw new Error('Unsupported DB_TYPE');
  },
};
