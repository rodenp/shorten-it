
import { DB_TYPE, pool, clientPromise } from '@/lib/db';
import { Collection, Db, ObjectId } from 'mongodb';

export interface SubDomain {
  id: string; // For postgres, this is the primary key. For mongo, it can map to _id.
  _id?: ObjectId; // MongoDB specific ID
  userId: string;
  subdomainName: string;
  createdAt: Date;
  updatedAt: Date;
}

// For MongoDB (assuming a 'sub_domains' collection)
let SubDomainsCollection: Collection<Omit<SubDomain, 'id'> & { _id: ObjectId }> | null = null;

async function getMongoSubDomainsCollection(): Promise<Collection<Omit<SubDomain, 'id'> & { _id: ObjectId }>> {
  if (SubDomainsCollection) {
    return SubDomainsCollection;
  }
  if (!clientPromise) {
    throw new Error('MongoDB client promise not initialized for custom domains');
  }
  const client = await clientPromise;
  const db: Db = client.db();
  SubDomainsCollection = db.collection('sub_domains');
  // Add any necessary indexes for MongoDB here, e.g., on userId and subdomainName
  await SubDomainsCollection.createIndex({ userId: 1, subdomainName: 1 }, { unique: true });
  return SubDomainsCollection;
}

function mapMongoDocToSubDomain(doc: (Omit<SubDomain, 'id'> & { _id: ObjectId }) | null): SubDomain | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export const SubDomainModel = {
  async findByUserId(userId: string): Promise<SubDomain[]> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoSubDomainsCollection();
      const docs = await collection.find({ userId }).toArray();
      return docs.map(doc => mapMongoDocToSubDomain(doc)!);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM sub_domains WHERE "userId" = $1 ORDER BY "createdAt" ASC', [userId]);
      return res.rows;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async findById(id: string): Promise<SubDomain | null> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoSubDomainsCollection();
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      return mapMongoDocToSubDomain(doc);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM sub_domains WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async create(userId: string, subdomainName: string): Promise<SubDomain> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoSubDomainsCollection();
      const result = await collection.insertOne({
        userId,
        subdomainName,
        createdAt: now,
        updatedAt: now,
      } as Omit<SubDomain, 'id' | '_id'> & { _id?: ObjectId }); // Casting to satisfy Mongo driver, _id will be generated
      const newDoc = await collection.findOne({_id: result.insertedId});
      return mapMongoDocToSubDomain(newDoc)!;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const newId = new ObjectId().toHexString(); // Generate a unique ID
      const res = await pool.query(
        'INSERT INTO sub_domains (id, "userId", "subdomainName", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [newId, userId, subdomainName, now, now]
      );
      return res.rows[0];
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async update(id: string, data: Partial<Pick<SubDomain, 'subdomainName' >>): Promise<SubDomain | null> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoSubDomainsCollection();
      const updateDoc: any = { $set: { updatedAt: now } };
      if (data.subdomainName !== undefined) updateDoc.$set.subdomainName = data.subdomainName;
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        updateDoc,
        { returnDocument: 'after' }
      );
      return result ? mapMongoDocToSubDomain(result) : null;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (data.subdomainName !== undefined) {
        setClauses.push(`"subdomainName" = $${valueCount++}`);
        values.push(data.subdomainName);
      }

      if (setClauses.length === 0) return this.findById(id); // No actual fields to update

      setClauses.push(`"updatedAt" = $${valueCount++}`);
      values.push(now);
      values.push(id); // For WHERE id = $last

      const query = `UPDATE sub_domains SET ${setClauses.join(', ')} WHERE id = $${valueCount} RETURNING *`;
      const res = await pool.query(query, values);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return { success: false, message: 'Invalid ID format' };
      const collection = await getMongoSubDomainsCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return { success: result.deletedCount === 1 };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('DELETE FROM sub_domains WHERE id = $1', [id]);
      return { success: res.rowCount === 1 };
    }
    throw new Error('Unsupported DB_TYPE');
  },
};
