import { pool } from '@/lib/db';

export interface Folder {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export const FolderModel = {
  async listByUser(userId: string): Promise<Folder[]> {
    const res = await pool!.query(
      `SELECT id, "userId", name, "createdAt" FROM folders WHERE "userId" = $1 ORDER BY "createdAt"`
      , [userId]
    );
    return res.rows;
  },

  async create(userId: string, name: string): Promise<Folder> {
    const res = await pool!.query(
      `INSERT INTO folders ("userId", name) VALUES ($1, $2) RETURNING id, "userId", name, "createdAt"`
      , [userId, name]
    );
    const row = res.rows[0];
    return { ...row, id: String(row.id) }; // Ensure id is string
  },

  async update(id: string, userId: string, data: { name: string }): Promise<Folder | null> {
    if (!pool) throw new Error('PostgreSQL pool not initialized.');
    
    const folderId = parseInt(id, 10);
    if (isNaN(folderId)) {
      console.error("[FolderModel.update] Invalid folder ID format:", id);
      return null;
    }

    // The 'folders' table does not have an 'updatedAt' field in the current schema.
    // If it did, it should be updated here: SET name = $1, "updatedAt" = NOW()
    const res = await pool.query(
      `UPDATE folders 
       SET name = $1 
       WHERE id = $2 AND "userId" = $3
       RETURNING id, "userId", name, "createdAt"`,
      [data.name, folderId, userId]
    );
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return { ...row, id: String(row.id) }; // Ensure id is string
  }
};