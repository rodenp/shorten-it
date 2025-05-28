
import { DB_TYPE, pool, clientPromise } from '@/lib/db';
import { Collection, Db, ObjectId } from 'mongodb';

export type Theme = 'light' | 'dark' | 'system';

export interface UserPreference {
  userId: string; // In MongoDB, this could be an ObjectId string or native ObjectId depending on how users are stored.
                  // For this model, we'll assume it's the string ID consistent with UserModel.
  theme: Theme;
  isCompactMode: boolean;
  updatedAt: Date;
}

// For MongoDB (assuming a 'user_preferences' collection)
// We'll use userId as the primary key for simplicity in MongoDB as well for this model,
// though _id would normally be a separate ObjectId.
let userPreferencesCollection: Collection<UserPreference> | null = null;

async function getMongoUserPreferencesCollection(): Promise<Collection<UserPreference>> {
  if (userPreferencesCollection) {
    return userPreferencesCollection;
  }
  if (!clientPromise) {
    throw new Error('MongoDB client promise not initialized for user preferences');
  }
  const client = await clientPromise;
  const db: Db = client.db();
  userPreferencesCollection = db.collection<UserPreference>('user_preferences');
  // Create a unique index on userId if it's serving as a de facto PK
  await userPreferencesCollection.createIndex({ userId: 1 }, { unique: true });
  return userPreferencesCollection;
}

const defaultPreferences: Omit<UserPreference, 'userId' | 'updatedAt'> = {
  theme: 'system',
  isCompactMode: false,
};

export const UserPreferenceModel = {
  async findByUserId(userId: string): Promise<UserPreference> {
    let preferences;
    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoUserPreferencesCollection();
      preferences = await collection.findOne({ userId });
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      const res = await pool.query('SELECT "userId", theme, "isCompactMode", "updatedAt" FROM user_preferences WHERE "userId" = $1', [userId]);
      preferences = res.rows[0];
    }
    if (preferences) {
        // Ensure boolean is correctly interpreted if stored as something else or null
        preferences.isCompactMode = !!preferences.isCompactMode;
        return preferences;
    }
    // If no preferences found, return defaults associated with the userId but not yet saved.
    return {
        userId,
        ...defaultPreferences,
        updatedAt: new Date() // Placeholder, as these are not yet saved
    };
  },

  async upsert(userId: string, data: Partial<Pick<UserPreference, 'theme' | 'isCompactMode'>>): Promise<UserPreference> {
    const now = new Date();
    const updateData: Partial<UserPreference> = { updatedAt: now };
    if (data.theme !== undefined) updateData.theme = data.theme;
    if (data.isCompactMode !== undefined) updateData.isCompactMode = data.isCompactMode;

    if (DB_TYPE === 'mongodb') {
      const collection = await getMongoUserPreferencesCollection();
      const result = await collection.findOneAndUpdate(
        { userId },
        { 
          $set: updateData,
          $setOnInsert: { ...defaultPreferences, userId, createdAt: now } // createdAt is not in interface, but good practice
        },
        { upsert: true, returnDocument: 'after' }
      );
      if (!result) throw new Error('MongoDB upsert failed for user preferences');
      // Ensure boolean is correctly interpreted
      result.isCompactMode = !!result.isCompactMode;
      return result as UserPreference; // Cast needed as findOneAndUpdate can return different types
    } else if (DB_TYPE === 'postgres') {
      if (!pool) throw new Error('PostgreSQL pool not initialized.');
      // Build the SET clause for the fields that are actually being updated
      const setClauses: string[] = [];
      const values: any[] = [];
      let valueCount = 1;

      if (data.theme !== undefined) {
        setClauses.push(`theme = $${valueCount++}`);
        values.push(data.theme);
      }
      if (data.isCompactMode !== undefined) {
        setClauses.push(`"isCompactMode" = $${valueCount++}`);
        values.push(data.isCompactMode);
      }
      setClauses.push(`"updatedAt" = $${valueCount++}`);
      values.push(now);
      
      const query = `
        INSERT INTO user_preferences ("userId", theme, "isCompactMode", "updatedAt")
        VALUES ($${valueCount}, $${valueCount + 1}, $${valueCount + 2}, $${valueCount + 3})
        ON CONFLICT ("userId") DO UPDATE SET
        ${setClauses.join(', ')}
        RETURNING "userId", theme, "isCompactMode", "updatedAt";
      `;
      // Values for INSERT part
      const insertValues = [userId, data.theme ?? defaultPreferences.theme, data.isCompactMode ?? defaultPreferences.isCompactMode, now];
      // Values for UPDATE part (already constructed in 'values')
      const finalValues = insertValues.concat(values.slice(0, values.length -1)); // Remove last value (now) which is already in insertValues
      
      // Simpler upsert for PostgreSQL:
      const finalUpdateData = { ...defaultPreferences, ...data }; // Merge defaults with provided data
      const upsertQuery = `
        INSERT INTO user_preferences ("userId", theme, "isCompactMode", "updatedAt")
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ("userId") DO UPDATE SET
          theme = EXCLUDED.theme,
          "isCompactMode" = EXCLUDED."isCompactMode",
          "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "userId", theme, "isCompactMode", "updatedAt";
      `;
      const res = await pool.query(upsertQuery, [userId, finalUpdateData.theme, finalUpdateData.isCompactMode, now]);
      const upsertedPrefs = res.rows[0];
      upsertedPrefs.isCompactMode = !!upsertedPrefs.isCompactMode;
      return upsertedPrefs;
    }
    throw new Error('Unsupported DB_TYPE');
  },
};
