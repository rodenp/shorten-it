
import { pool, DB_TYPE } from './db'; // Ensure DB_TYPE is imported
import { LinkItem, LinkTarget, RetargetingPixel } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getShortenerDomain } from './mock-data'; 

// Add a top-level log to see initial values when linkService.ts is imported/run
console.log(`[linkService - Global] Initial DB_TYPE: ${DB_TYPE}, pool object initialized: ${!!pool}`);

if (DB_TYPE !== 'postgres' && pool) {
  console.warn(`[linkService - Global] Warning: DB_TYPE is ${DB_TYPE} but PostgreSQL pool is initialized. This might indicate an issue in db.ts or env config.`);
} else if (DB_TYPE === 'postgres' && !pool) {
  console.error('[linkService - Global] Error: DB_TYPE is postgres but PostgreSQL pool is NOT initialized. Check db.ts and POSTGRES_URI.');
}

async function getRetargetingPixelsForLink(linkId: string): Promise<RetargetingPixel[]> {
    if (DB_TYPE !== 'postgres' || !pool) {
        console.error('[linkService - getRetargetingPixelsForLink] PostgreSQL not configured.');
        return []; 
    }
    // Added logging for the specific call
    console.log(`[linkService - getRetargetingPixelsForLink] Fetching pixels for linkId: ${linkId}`);
    const query = `
        SELECT rp.id, rp."userId", rp.name, rp.type, rp."pixelIdValue", rp."createdAt", rp."updatedAt"
        FROM retargeting_pixels rp
        JOIN link_retargeting_pixels lrp ON rp.id = lrp."pixelId"
        WHERE lrp."linkId" = $1;
    `;
    try {
        const result = await pool.query(query, [linkId]);
        console.log(`[linkService - getRetargetingPixelsForLink] Found ${result.rowCount} pixels for linkId: ${linkId}`);
        return result.rows.map(row => ({
            id: row.id,
            userId: row.userId,
            name: row.name,
            type: row.type as RetargetingPixel['type'],
            pixelIdValue: row.pixelIdValue,
            createdAt: new Date(row.createdAt).toISOString(),
            updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
        }));
    } catch (err) {
        console.error(`[linkService - getRetargetingPixelsForLink] Error fetching pixels for linkId ${linkId}:`, err);
        throw err; // Re-throw error to allow caller to handle if necessary
    }
}

function formatLinkItem(row: any, pixels?: RetargetingPixel[]): LinkItem {
  const lastUsedTargetIndexFromDb = row.last_used_target_index;
  return {
    id: row.id,
    userId: row.userId,
    originalUrl: row.originalUrl,
    shortUrl: row.shortUrl, 
    slug: row.slug,
    clickCount: parseInt(row.clickCount, 10) || 0,
    title: row.title,
    tags: row.tags || [],
    isCloaked: row.isCloaked,
    customDomain: row.customDomainName, 
    customDomainId: row.customDomainId, 
    groupId: row.groupId,
    groupName: row.groupName, 
    deepLinkConfig: row.deepLinkConfig,
    abTestConfig: row.abTestConfig,
    targets: row.targets,
    retargetingPixels: pixels,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    lastUsedTargetIndex: typeof lastUsedTargetIndexFromDb === 'number' ? lastUsedTargetIndexFromDb : null,
  };
}

export async function getLinkById(id: string, userId: string): Promise<LinkItem | null> {
  console.log(`[linkService - getLinkById] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Fetching linkId: ${id} for userId: ${userId}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    console.error('[linkService - getLinkById] PostgreSQL not configured.');
    return null; 
  }
  try {
    const query = `
        SELECT l.*, l.last_used_target_index, 
               cd."domainName" as "customDomainName",
               lg.name as "groupName"
        FROM links l
        LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId" 
        WHERE l.id = $1 AND l."userId" = $2;
    `;
    const res = await pool.query(query, [id, userId]);
    if (res.rows.length === 0) {
        console.log(`[linkService - getLinkById] No link found for id: ${id}, userId: ${userId}`);
        return null;
    }
    console.log(`[linkService - getLinkById] Link found for id: ${id}. Row:`, JSON.stringify(res.rows[0]));
    const linkRow = res.rows[0];
    const pixels = await getRetargetingPixelsForLink(linkRow.id);
    return formatLinkItem(linkRow, pixels);

  } catch (err) {
    console.error(`[linkService - getLinkById] Error fetching link by id ${id}:`, err);
    throw new Error('Failed to retrieve link.');
  }
}

export async function getLinkBySlug(slug: string, userId: string): Promise<LinkItem | null> {
  console.log(`[linkService - getLinkBySlug] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Fetching slug: ${slug} for userId: ${userId}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    console.error('[linkService - getLinkBySlug] PostgreSQL not configured.');
    return null;
  }
  try {
    const query = `
        SELECT l.*, l.last_used_target_index, 
               cd."domainName" as "customDomainName",
               lg.name as "groupName"
        FROM links l
        LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId"
        WHERE l.slug = $1 AND l."userId" = $2; 
    `; 
    const res = await pool.query(query, [slug, userId]);
    if (res.rows.length === 0) {
      console.log(`[linkService - getLinkBySlug] No link found for slug: ${slug}, userId: ${userId}`);
      return null;
    }
    console.log(`[linkService - getLinkBySlug] Link found for slug: ${slug}. Row:`, JSON.stringify(res.rows[0]));
    const linkRow = res.rows[0];
    const pixels = await getRetargetingPixelsForLink(linkRow.id);
    return formatLinkItem(linkRow, pixels);

  } catch (err) {
    console.error(`[linkService - getLinkBySlug] Error fetching link by slug ${slug}:`, err);
    throw new Error('Failed to retrieve link by slug.');
  }
}

export async function getLinkBySlugAndDomain(slug: string, domain: string): Promise<LinkItem | null> {
  console.log(`[linkService - getLinkBySlugAndDomain] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Fetching slug: ${slug}, domain: ${domain}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    console.error('[linkService - getLinkBySlugAndDomain] PostgreSQL not configured for link redirection lookup.');
    return null; 
  }
  try {
    let query;
    let queryParams;
    const defaultShortenerDomain = getShortenerDomain(); 

    const isLocalhostDomainInput = domain.startsWith('localhost:'); 

    if (domain === defaultShortenerDomain || isLocalhostDomainInput) {
      query = `
        SELECT l.*, l.last_used_target_index, 
               NULL as "customDomainName" 
        FROM links l
        WHERE l.slug = $1 AND l."customDomainId" IS NULL; 
      `;
      queryParams = [slug];
      if (isLocalhostDomainInput) {
        console.log(`[linkService - getLinkBySlugAndDomain] Handling '${domain}' as a localhost domain. Searching for slug with no customDomainId.`);
      }
    } else {
      query = `
        SELECT l.*, l.last_used_target_index, 
               cd."domainName" as "customDomainName"
        FROM links l
        JOIN custom_domains cd ON l."customDomainId" = cd.id
        WHERE l.slug = $1 AND cd."domainName" = $2 AND cd.verified = TRUE; 
      `; 
      queryParams = [slug, domain];
    }

    const res = await pool.query(query, queryParams);
    if (res.rows.length === 0) {
      console.log(`[linkService - getLinkBySlugAndDomain] No link found for slug: ${slug}, domain: ${domain}`);
      return null;
    }
    console.log(`[linkService - getLinkBySlugAndDomain] Link found for slug: ${slug}, domain: ${domain}. Row:`, JSON.stringify(res.rows[0]));
    const linkRow = res.rows[0];
    let link = formatLinkItem(linkRow, []); 

    let protocol = 'https://';
    const effectiveDomain = link.customDomain || defaultShortenerDomain;
    if (effectiveDomain.startsWith('localhost:')) {
        protocol = 'http://';
    }

    link.shortUrl = `${protocol}${effectiveDomain}/${link.slug}`;
    
    return link;

  } catch (err) {
    console.error(`[linkService - getLinkBySlugAndDomain] Error fetching link by slug '${slug}' and domain '${domain}':`, err);
    return null; 
  }
}


export async function getLinksByUserId(userId: string): Promise<LinkItem[]> {
  console.log(`[linkService - getLinksByUserId] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Fetching links for userId: ${userId}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    console.error('[linkService - getLinksByUserId] PostgreSQL not configured.');
    return [];
  }
  try {
    const query = `
        SELECT l.*, l.last_used_target_index, 
               cd."domainName" as "customDomainName",
               lg.name as "groupName"
        FROM links l
        LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId"
        WHERE l."userId" = $1 ORDER BY l."createdAt" DESC;
    `;
    const res = await pool.query(query, [userId]);
    console.log(`[linkService - getLinksByUserId] Found ${res.rowCount} links for userId: ${userId}`);
    const links: LinkItem[] = [];
    for (const row of res.rows) {
        const pixels = await getRetargetingPixelsForLink(row.id);
        links.push(formatLinkItem(row, pixels));
    }
    return links;
  } catch (err) {
    console.error(`[linkService - getLinksByUserId] Error fetching links for userId ${userId}:`, err);
    throw new Error('Failed to retrieve links.');
  }
}


const generateDbSlug = async (customDomainId?: string): Promise<string> => {
  // Added entry logging
  console.log(`[linkService - generateDbSlug] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Generating slug for customDomainId: ${customDomainId}`);
  if (DB_TYPE !== 'postgres' || !pool) throw new Error("[linkService - generateDbSlug] Database pool not initialized for slug generation (requires PostgreSQL).");
  let slug = Math.random().toString(36).substring(2, 8);
  let query;
  let params;
  if (customDomainId) {
    query = 'SELECT id FROM links WHERE slug = $1 AND "customDomainId" = $2';
    params = [slug, customDomainId];
  } else {
    query = 'SELECT id FROM links WHERE slug = $1 AND "customDomainId" IS NULL';
    params = [slug];
  }
  let res = await pool.query(query, params);
  while (res.rows.length > 0) {
    slug = Math.random().toString(36).substring(2, 8);
    if (customDomainId) params = [slug, customDomainId];
    else params = [slug];
    res = await pool.query(query, params);
  }
  console.log(`[linkService - generateDbSlug] Generated slug: ${slug}`);
  return slug;
};

interface CreateLinkData {
  userId: string;
  originalUrl: string;
  targets: LinkTarget[];
  slug?: string; 
  title?: string;
  tags?: string[];
  isCloaked?: boolean;
  customDomainId?: string;
  groupId?: string;
  deepLinkConfig?: LinkItem['deepLinkConfig'];
  abTestConfig?: LinkItem['abTestConfig'];
  retargetingPixelIds?: string[];
}

export async function createLink(data: CreateLinkData): Promise<LinkItem> {
  console.log(`[linkService - createLink] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Creating link with title: ${data.title}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    console.error('[linkService - createLink] PostgreSQL not configured, cannot create link.');
    throw new Error('Database not configured for link creation.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const linkId = uuidv4();
    const createdAt = new Date().toISOString();
    const slugToUse = data.slug ? data.slug.trim() : await generateDbSlug(data.customDomainId); 

    let slugConflictQuery, slugConflictParams;
    if (data.customDomainId) {
        slugConflictQuery = 'SELECT id FROM links WHERE slug = $1 AND "customDomainId" = $2';
        slugConflictParams = [slugToUse, data.customDomainId];
    } else {
        slugConflictQuery = 'SELECT id FROM links WHERE slug = $1 AND "customDomainId" IS NULL';
        slugConflictParams = [slugToUse];
    }
    const slugCheck = await client.query(slugConflictQuery, slugConflictParams);
    if (slugCheck.rows.length > 0) {
        throw new Error(`Slug '${slugToUse}' is already taken${data.customDomainId ? ' on this domain' : ''}.`);
    }

    let actualShortUrlBase: string;
    let customDomainName; // This will be used for the returned LinkItem

    if (data.customDomainId) {
        const domainRes = await client.query('SELECT "domainName" FROM custom_domains WHERE id = $1 AND "userId" = $2', [data.customDomainId, data.userId]);
        if (domainRes.rows.length > 0) {
            customDomainName = domainRes.rows[0].domainName;
            actualShortUrlBase = customDomainName;
        } else {
            throw new Error('Custom domain not found or not authorized.');
        }
    } else {
        actualShortUrlBase = getShortenerDomain();
    }

    let protocol = 'https://'; 
    if (actualShortUrlBase === 'localhost' || actualShortUrlBase.startsWith('localhost:')) {
        protocol = 'http://';
    }
    const shortUrl = `${protocol}${actualShortUrlBase}/${slugToUse}`; 

    const linkQuery = `
      INSERT INTO links 
        (id, "userId", "originalUrl", "shortUrl", slug, title, tags, "isCloaked", "customDomainId", "groupId", "deepLinkConfig", "abTestConfig", targets, "createdAt", "updatedAt", "clickCount", last_used_target_index)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, 0, NULL)
      RETURNING *, last_used_target_index;
    `;
    const linkParams = [
      linkId, data.userId, data.originalUrl, shortUrl, slugToUse, data.title,
      data.tags, data.isCloaked ?? false, data.customDomainId, data.groupId,
      data.deepLinkConfig ? JSON.stringify(data.deepLinkConfig) : null,
      data.abTestConfig ? JSON.stringify(data.abTestConfig) : null,
      JSON.stringify(data.targets), 
      createdAt
    ];
    const res = await client.query(linkQuery, linkParams);
    let newLinkRow = res.rows[0];
    newLinkRow.customDomainName = customDomainName; 
    if (newLinkRow.groupId) {
        const groupRes = await client.query('SELECT name FROM link_groups WHERE id = $1 AND "userId" = $2', [newLinkRow.groupId, data.userId]);
        if (groupRes.rows.length > 0) newLinkRow.groupName = groupRes.rows[0].name;
    }
    let createdPixels: RetargetingPixel[] = [];
    if (data.retargetingPixelIds && data.retargetingPixelIds.length > 0) {
      for (const pixelId of data.retargetingPixelIds) {
        await client.query('INSERT INTO link_retargeting_pixels ("linkId", "pixelId") VALUES ($1, $2) ON CONFLICT DO NOTHING',[linkId, pixelId]);
      }
      createdPixels = await getRetargetingPixelsForLink(linkId);
    }
    await client.query('COMMIT');
    console.log(`[linkService - createLink] Link created successfully with ID: ${linkId}`);
    const finalLink = formatLinkItem(newLinkRow, createdPixels);
    // The shortUrl constructed with correct protocol and base is already in finalLink via formatLinkItem 
    // if it was correctly set in newLinkRow.shortUrl when inserted. Let's ensure the DB value is used.
    // No, formatLinkItem uses row.shortUrl which is from DB, so it is already correct.
    return finalLink;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[linkService - createLink] Error creating link:', err);
    if (err.message.includes('already taken') || err.message.includes('Custom domain not found')) throw err;
    if (err.constraint === 'links_shortUrl_key') throw new Error('Generated short URL conflict, please try again.');
    if (err.constraint === 'unique_slug_on_domain') throw new Error(`Slug '${data.slug}' is already taken${data.customDomainId ? ' on this domain' : ''}.`);
    throw new Error('Failed to create link.');
  } finally {
    client.release();
  }
}

export async function updateLink(linkId: string, userId: string, updates: Partial<CreateLinkData> & { originalUrl?: string, targets?: LinkTarget[], lastUsedTargetIndex?: number | null }): Promise<LinkItem | null> {
    console.log(`[linkService - updateLink] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Updating linkId: ${linkId}`);
    if (DB_TYPE !== 'postgres' || !pool) {
        console.error('[linkService - updateLink] PostgreSQL not configured, cannot update link.');
        throw new Error('Database not configured for link update.');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const existingLinkRes = await client.query('SELECT * FROM links WHERE id = $1 AND "userId" = $2', [linkId, userId]);
        if (existingLinkRes.rows.length === 0) throw new Error('Link not found or you do not have permission to update it.');
        const updatableFields = ['originalUrl', 'title', 'tags', 'isCloaked', 'groupId','deepLinkConfig', 'abTestConfig', 'targets', 'lastUsedTargetIndex'];
        const setClauses: string[] = [];
        const queryParams: any[] = [linkId, userId];
        let paramIndex = 3;
        for (const field of updatableFields) {
            if ((updates as any)[field] !== undefined) {
                setClauses.push(`"${field === 'lastUsedTargetIndex' ? 'last_used_target_index' : field}" = $${paramIndex++}`);
                let value = (updates as any)[field];
                if (field === 'deepLinkConfig' || field === 'abTestConfig' || field === 'targets') value = value ? JSON.stringify(value) : null;
                if (field === 'tags' && !Array.isArray(value)) value = value ? (value as string).split(',').map(t=>t.trim()) : null;
                queryParams.push(value);
            }
        }
        let needsDbUpdate = setClauses.length > 0;
        if (needsDbUpdate) {
            queryParams.push(new Date().toISOString()); 
            setClauses.push(`"updatedAt" = $${paramIndex++}`);
            const updateQuery = `UPDATE links SET ${setClauses.join(', ')} WHERE id = $1 AND "userId" = $2 RETURNING *, last_used_target_index;`;
            console.log(`[linkService - updateLink] Executing update for linkId ${linkId} with query: ${updateQuery.substring(0, 100)}... and params: ${JSON.stringify(queryParams)}`);
            await client.query(updateQuery, queryParams);
        }
        if (updates.retargetingPixelIds !== undefined) {
            needsDbUpdate = true; 
            await client.query('DELETE FROM link_retargeting_pixels WHERE "linkId" = $1', [linkId]);
            if (updates.retargetingPixelIds.length > 0) {
                for (const pixelId of updates.retargetingPixelIds) {
                    await client.query('INSERT INTO link_retargeting_pixels ("linkId", "pixelId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [linkId, pixelId]);
                }
            }
            if (setClauses.length === 0) await client.query('UPDATE links SET "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 AND "userId" = $2', [linkId, userId]);
        }
        if (!needsDbUpdate) {
             console.log(`[linkService - updateLink] No actual DB update needed for linkId ${linkId}. Rolling back.`);
             await client.query('ROLLBACK'); client.release(); return getLinkById(linkId, userId); 
        }
        await client.query('COMMIT');
        console.log(`[linkService - updateLink] Link updated successfully for linkId ${linkId}`);
        const updatedLinkDataRes = await client.query('SELECT l.*, l.last_used_target_index, cd."domainName" as "customDomainName", lg.name as "groupName" FROM links l LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId" WHERE l.id = $1 AND l."userId" = $2', [linkId, userId]);
        if(updatedLinkDataRes.rows.length === 0) return null; 
        const pixels = await getRetargetingPixelsForLink(linkId);
        return formatLinkItem(updatedLinkDataRes.rows[0], pixels);
    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[linkService - updateLink] Error updating link ${linkId}:`, err);
        throw new Error(err.message || 'Failed to update link.');
    } finally {
        client.release();
    }
}

export async function deleteLink(id: string, userId: string): Promise<boolean> {
  console.log(`[linkService - deleteLink] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Deleting linkId: ${id}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    console.error('[linkService - deleteLink] PostgreSQL not configured, cannot delete link.');
    throw new Error('Database not configured for link deletion.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM link_retargeting_pixels WHERE "linkId" = $1', [id]);
    await client.query('DELETE FROM analytic_events WHERE "linkId" = $1', [id]);
    const res = await client.query('DELETE FROM links WHERE id = $1 AND "userId" = $2', [id, userId]);
    if (res.rowCount === 0) { 
        console.warn(`[linkService - deleteLink] Link not found for deletion or user not authorized. LinkId: ${id}`);
        await client.query('ROLLBACK'); return false; 
    }
    await client.query('COMMIT');
    console.log(`[linkService - deleteLink] Link deleted successfully: ${id}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[linkService - deleteLink] Error deleting link ${id}:`, err);
    throw new Error('Failed to delete link.');
  } finally {
    client.release();
  }
}

export async function incrementLinkClickCount(linkId: string): Promise<void> {
    console.log(`[linkService - incrementLinkClickCount] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Incrementing click for linkId: ${linkId}`);
    if (DB_TYPE !== 'postgres' || !pool) {
        console.error('[linkService - incrementLinkClickCount] PostgreSQL not configured for incrementing click count.');
        return;
    }
    try {
        const result = await pool.query('UPDATE links SET "clickCount" = "clickCount" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1', [linkId]);
        if (result.rowCount > 0) {
            console.log(`[linkService - incrementLinkClickCount] Click count incremented successfully for ${linkId}. Rows affected: ${result.rowCount}`);
        } else {
            console.warn(`[linkService - incrementLinkClickCount] Failed to increment click count for ${linkId}. Link not found or no change made. Row count: ${result.rowCount}`);
        }
    } catch (err) {
        console.error(`[linkService - incrementLinkClickCount] Error incrementing click count for linkId ${linkId}:`, err);
    }
}

export async function updateLinkLastUsedTarget(linkId: string, index: number): Promise<void> {
    console.log(`[linkService - updateLinkLastUsedTarget] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Updating last_used_target_index to ${index} for linkId ${linkId}`);
    if (DB_TYPE !== 'postgres' || !pool) {
        console.error('[linkService - updateLinkLastUsedTarget] PostgreSQL not configured for updating last used target index.');
        return; 
    }
    try {
        // console.log(`[linkService - updateLinkLastUsedTarget] Attempting to update last_used_target_index to ${index} for linkId ${linkId}`); // This log is redundant with the one above
        const query = 'UPDATE links SET "last_used_target_index" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, last_used_target_index;';
        const result = await pool.query(query, [index, linkId]);
        if (result.rowCount > 0 && result.rows[0]) { 
            console.log(`[linkService - updateLinkLastUsedTarget] Successfully updated last_used_target_index to ${result.rows[0].last_used_target_index} for link ${result.rows[0].id}. Rows affected: ${result.rowCount}`);
        } else {
            console.warn(`[linkService - updateLinkLastUsedTarget] Failed to update last_used_target_index for link ${linkId}. Link not found or no change made. Row count: ${result.rowCount}`);
        }
    } catch (err) {
        console.error(`[linkService - updateLinkLastUsedTarget] Error in updateLinkLastUsedTarget for link ${linkId}:`, err);
    }
}

