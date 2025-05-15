
import { pool, DB_TYPE } from './db';
import { RetargetingPixel } from '@/types';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

if (DB_TYPE !== 'postgres') {
  // Potentially throw an error or log a warning if services for other DBs are not implemented
  console.warn('RetargetingPixel service currently only supports PostgreSQL. DB_TYPE is set to:', DB_TYPE);
  // Fallback to mock implementation or throw error if strict PGSQL dependency
}

/**
 * Formats a database row to a RetargetingPixel object.
 */
function formatPixel(row: any): RetargetingPixel {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    type: row.type as RetargetingPixel['type'],
    pixelIdValue: row.pixelIdValue,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

export async function getRetargetingPixelsByUserId(userId: string): Promise<RetargetingPixel[]> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const res = await pool.query(
      'SELECT id, "userId", name, type, "pixelIdValue", "createdAt", "updatedAt" FROM retargeting_pixels WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [userId]
    );
    return res.rows.map(formatPixel);
  } catch (err) {
    console.error('Error fetching retargeting pixels by userId:', err);
    throw new Error('Failed to retrieve retargeting pixels.');
  }
}

export async function getRetargetingPixelById(id: string, userId: string): Promise<RetargetingPixel | null> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const res = await pool.query(
      'SELECT id, "userId", name, type, "pixelIdValue", "createdAt", "updatedAt" FROM retargeting_pixels WHERE id = $1 AND "userId" = $2',
      [id, userId]
    );
    if (res.rows.length === 0) {
      return null;
    }
    return formatPixel(res.rows[0]);
  } catch (err) {
    console.error('Error fetching retargeting pixel by id:', err);
    throw new Error('Failed to retrieve retargeting pixel.');
  }
}

export async function addRetargetingPixel(
  userId: string,
  name: string,
  type: RetargetingPixel['type'],
  pixelIdValue: string
): Promise<RetargetingPixel> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  try {
    // Check for existing pixel with the same name for this user
    const checkRes = await pool.query(
      'SELECT id FROM retargeting_pixels WHERE "userId" = $1 AND name = $2',
      [userId, name]
    );
    if (checkRes.rows.length > 0) {
      throw new Error('A retargeting pixel with this name already exists for this user.');
    }

    const res = await pool.query(
      'INSERT INTO retargeting_pixels (id, "userId", name, type, "pixelIdValue", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id, "userId", name, type, "pixelIdValue", "createdAt", "updatedAt"',
      [id, userId, name, type, pixelIdValue, createdAt]
    );
    return formatPixel(res.rows[0]);
  } catch (err: any) {
    console.error('Error adding retargeting pixel:', err);
    // Re-throw specific errors or a generic one
    if (err.message.includes('already exists')) {
        throw err;
    }
    throw new Error('Failed to add retargeting pixel.');
  }
}

export async function updateRetargetingPixel(
  id: string,
  userId: string,
  name: string,
  type: RetargetingPixel['type'],
  pixelIdValue: string
): Promise<RetargetingPixel | null> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  const updatedAt = new Date().toISOString();
  try {
    // Check if another pixel with the same name exists for this user
    const checkRes = await pool.query(
      'SELECT id FROM retargeting_pixels WHERE "userId" = $1 AND name = $2 AND id != $3',
      [userId, name, id]
    );
    if (checkRes.rows.length > 0) {
      throw new Error('Another retargeting pixel with this name already exists for this user.');
    }

    const res = await pool.query(
      'UPDATE retargeting_pixels SET name = $1, type = $2, "pixelIdValue" = $3, "updatedAt" = $4 WHERE id = $5 AND "userId" = $6 RETURNING id, "userId", name, type, "pixelIdValue", "createdAt", "updatedAt"',
      [name, type, pixelIdValue, updatedAt, id, userId]
    );
    if (res.rows.length === 0) {
      return null; // Or throw an error indicating not found or not authorized
    }
    return formatPixel(res.rows[0]);
  } catch (err: any) {
    console.error('Error updating retargeting pixel:', err);
    if (err.message.includes('already exists')) {
        throw err;
    }
    throw new Error('Failed to update retargeting pixel.');
  }
}

export async function deleteRetargetingPixel(id: string, userId: string): Promise<boolean> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const res = await pool.query(
      'DELETE FROM retargeting_pixels WHERE id = $1 AND "userId" = $2',
      [id, userId]
    );
    return res.rowCount > 0;
  } catch (err) {
    console.error('Error deleting retargeting pixel:', err);
    throw new Error('Failed to delete retargeting pixel.');
  }
}
