
import { DB_TYPE, pool, clientPromise } from '@/lib/db';
import { Collection, Db, ObjectId } from 'mongodb';

export interface CustomDomain {
  id: string; // For postgres, this is the primary key. For mongo, it can map to _id.
  _id?: ObjectId; // MongoDB specific ID
  userId: string;
  domainName: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// For MongoDB (assuming a 'custom_domains' collection)
let customDomainsCollection: Collection<Omit<CustomDomain, 'id'> & { _id: ObjectId }> | null = null;

async function getMongoCustomDomainsCollection(): Promise<Collection<Omit<CustomDomain, 'id'> & { _id: ObjectId }>> {
  if (customDomainsCollection) {
    return customDomainsCollection;
  }
  if (!clientPromise) {
    throw new Error('MongoDB client promise not initialized for custom domains');
  }
  const client = await clientPromise;
  const db: Db = client.db();
  customDomainsCollection = db.collection('custom_domains');
  // Add any necessary indexes for MongoDB here, e.g., on userId and domainName
  await customDomainsCollection.createIndex({ userId: 1, domainName: 1 }, { unique: true });
  return customDomainsCollection;
}

function mapMongoDocToCustomDomain(doc: (Omit<CustomDomain, 'id'> & { _id: ObjectId }) | null): CustomDomain | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export const CustomDomainModel = {
  async findByUserId(userId: string): Promise<CustomDomain[]> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoCustomDomainsCollection();
      const docs = await collection.find({ userId }).toArray();
      return docs.map(doc => mapMongoDocToCustomDomain(doc)!);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM custom_domains WHERE "userId" = $1 ORDER BY "createdAt" ASC', [userId]);
      return res.rows;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async findById(id: string): Promise<CustomDomain | null> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoCustomDomainsCollection();
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      return mapMongoDocToCustomDomain(doc);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM custom_domains WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async create(userId: string, domainName: string): Promise<CustomDomain> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoCustomDomainsCollection();
      const result = await collection.insertOne({
        userId,
        domainName,
        verified: false,
        createdAt: now,
        updatedAt: now,
      } as Omit<CustomDomain, 'id' | '_id'> & { _id?: ObjectId }); // Casting to satisfy Mongo driver, _id will be generated
      const newDoc = await collection.findOne({_id: result.insertedId});
      return mapMongoDocToCustomDomain(newDoc)!;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const newId = new ObjectId().toHexString(); // Generate a unique ID
      const res = await pool.query(
        'INSERT INTO custom_domains (id, "userId", "domainName", verified, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [newId, userId, domainName, false, now, now]
      );
      return res.rows[0];
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async update(id: string, data: Partial<Pick<CustomDomain, 'domainName' | 'verified'>>): Promise<CustomDomain | null> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoCustomDomainsCollection();
      const updateDoc: any = { $set: { updatedAt: now } };
      if (data.domainName !== undefined) updateDoc.$set.domainName = data.domainName;
      if (data.verified !== undefined) updateDoc.$set.verified = data.verified;
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        updateDoc,
        { returnDocument: 'after' }
      );
      return result ? mapMongoDocToCustomDomain(result) : null;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (data.domainName !== undefined) {
        setClauses.push(`"domainName" = $${valueCount++}`);
        values.push(data.domainName);
      }
      if (data.verified !== undefined) {
        setClauses.push(`verified = $${valueCount++}`);
        values.push(data.verified);
      }
      if (setClauses.length === 0) return this.findById(id); // No actual fields to update

      setClauses.push(`"updatedAt" = $${valueCount++}`);
      values.push(now);
      values.push(id); // For WHERE id = $last

      const query = `UPDATE custom_domains SET ${setClauses.join(', ')} WHERE id = $${valueCount} RETURNING *`;
      const res = await pool.query(query, values);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return { success: false, message: 'Invalid ID format' };
      const collection = await getMongoCustomDomainsCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return { success: result.deletedCount === 1 };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('DELETE FROM custom_domains WHERE id = $1', [id]);
      return { success: res.rowCount === 1 };
    }
    throw new Error('Unsupported DB_TYPE');
  },
};
