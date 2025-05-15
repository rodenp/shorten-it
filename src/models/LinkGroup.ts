
import { DB_TYPE, pool, clientPromise } from '@/lib/db';
import { Collection, Db, ObjectId } from 'mongodb';

export interface LinkGroup {
  id: string; 
  _id?: ObjectId; // MongoDB specific
  userId: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // linkCount?: number; // This would typically be a derived property or fetched separately
}

// For MongoDB (assuming a 'link_groups' collection)
let linkGroupsCollection: Collection<Omit<LinkGroup, 'id'> & { _id: ObjectId }> | null = null;

async function getMongoLinkGroupsCollection(): Promise<Collection<Omit<LinkGroup, 'id'> & { _id: ObjectId }>> {
  if (linkGroupsCollection) {
    return linkGroupsCollection;
  }
  if (!clientPromise) {
    throw new Error('MongoDB client promise not initialized for link groups');
  }
  const client = await clientPromise;
  const db: Db = client.db();
  linkGroupsCollection = db.collection('link_groups');
  // Add any necessary indexes for MongoDB here, e.g., on userId and name
  await linkGroupsCollection.createIndex({ userId: 1, name: 1 }, { unique: true });
  return linkGroupsCollection;
}

function mapMongoDocToLinkGroup(doc: (Omit<LinkGroup, 'id'> & { _id: ObjectId }) | null): LinkGroup | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toHexString(), ...rest };
}

export const LinkGroupModel = {
  async findByUserId(userId: string): Promise<LinkGroup[]> {
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoLinkGroupsCollection();
      const docs = await collection.find({ userId }).sort({ name: 1 }).toArray();
      return docs.map(doc => mapMongoDocToLinkGroup(doc)!);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM link_groups WHERE "userId" = $1 ORDER BY name ASC', [userId]);
      return res.rows;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async findById(id: string): Promise<LinkGroup | null> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoLinkGroupsCollection();
      const doc = await collection.findOne({ _id: new ObjectId(id) });
      return mapMongoDocToLinkGroup(doc);
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT * FROM link_groups WHERE id = $1', [id]);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async create(userId: string, name: string, description?: string | null): Promise<LinkGroup> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoLinkGroupsCollection();
      const result = await collection.insertOne({
        userId,
        name,
        description: description || null,
        createdAt: now,
        updatedAt: now,
      } as Omit<LinkGroup, 'id' | '_id'> & { _id?: ObjectId }); 
      const newDoc = await collection.findOne({_id: result.insertedId});
      return mapMongoDocToLinkGroup(newDoc)!;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const newId = new ObjectId().toHexString(); // Generate a unique ID
      const res = await pool.query(
        'INSERT INTO link_groups (id, "userId", name, description, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [newId, userId, name, description || null, now, now]
      );
      return res.rows[0];
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async update(id: string, userId: string, data: Partial<Pick<LinkGroup, 'name' | 'description'>>): Promise<LinkGroup | null> {
    const now = new Date();
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return null;
      const collection = await getMongoLinkGroupsCollection();
      const updateDoc: any = { $set: { updatedAt: now } };
      if (data.name !== undefined) updateDoc.$set.name = data.name;
      if (data.description !== undefined) updateDoc.$set.description = data.description || null;
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id), userId }, // Ensure user owns the group
        updateDoc,
        { returnDocument: 'after' }
      );
      return result ? mapMongoDocToLinkGroup(result) : null;
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (data.name !== undefined) {
        setClauses.push(`name = $${valueCount++}`);
        values.push(data.name);
      }
      if (data.description !== undefined) {
        setClauses.push(`description = $${valueCount++}`);
        values.push(data.description || null);
      }
      if (setClauses.length === 0) return this.findById(id); 

      setClauses.push(`"updatedAt" = $${valueCount++}`);
      values.push(now);
      values.push(id); // For WHERE id = $id
      values.push(userId); // For WHERE "userId" = $userId

      const query = `UPDATE link_groups SET ${setClauses.join(', ')} WHERE id = $${valueCount} AND "userId" = $${valueCount+1} RETURNING *`;
      const res = await pool.query(query, values);
      return res.rows[0] || null;
    }
    throw new Error('Unsupported DB_TYPE');
  },

  async delete(id: string, userId: string): Promise<{ success: boolean; message?: string }> {
    if (DB_TYPE === 'mongodb') {
      if (!ObjectId.isValid(id)) return { success: false, message: 'Invalid ID format' };
      const collection = await getMongoLinkGroupsCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id), userId }); // Ensure user owns the group
      return { success: result.deletedCount === 1 };
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('DELETE FROM link_groups WHERE id = $1 AND "userId" = $2', [id, userId]);
      return { success: res.rowCount === 1 };
    }
    throw new Error('Unsupported DB_TYPE');
  },
};
