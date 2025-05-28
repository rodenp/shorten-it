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
    return res.rows[0];
  }
};