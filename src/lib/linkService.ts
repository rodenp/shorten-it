
import { pool, DB_TYPE } from './db'; // Ensure DB_TYPE is imported
import { LinkItem, LinkTarget, RetargetingPixel } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getShortenerDomain } from './mock-data'; 
import { debugLog, debugWarn } from '@/lib/logging';
import { debug } from 'console';

// Add a top-level log to see initial values when linkService.ts is imported/run
debugLog(`[linkService - Global] Initial DB_TYPE: ${DB_TYPE}, pool object initialized: ${!!pool}`);

if (DB_TYPE !== 'postgres' && pool) {
  debugWarn(`[linkService - Global] Warning: DB_TYPE is ${DB_TYPE} but PostgreSQL pool is initialized. This might indicate an issue in db.ts or env config.`);
} else if (DB_TYPE === 'postgres' && !pool) {
  console.error('[linkService - Global] Error: DB_TYPE is postgres but PostgreSQL pool is NOT initialized. Check db.ts and POSTGRES_URI.');
}

async function getRetargetingPixelsForLink(linkId: string): Promise<RetargetingPixel[]> {
    if (DB_TYPE !== 'postgres' || !pool) {
        console.error('[linkService - getRetargetingPixelsForLink] PostgreSQL not configured.');
        return []; 
    }
    debugLog(`[linkService - getRetargetingPixelsForLink] Fetching pixels for linkId: ${linkId}`);
    const query = `
        SELECT rp.id, rp."userId", rp.name, rp.type, rp."pixelIdValue", rp."createdAt", rp."updatedAt"
        FROM retargeting_pixels rp
        JOIN link_retargeting_pixels lrp ON rp.id = lrp."pixelId"
        WHERE lrp."linkId" = $1;
    `;
    try {
        const result = await pool.query(query, [linkId]);
        debugLog(`[linkService - getRetargetingPixelsForLink] Found ${result.rowCount} pixels for linkId: ${linkId}`);
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
        throw err; 
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
    domainId: row.domainId, 
    groupId: row.groupId,
    groupName: row.groupName, 
    deepLinkConfig: row.deepLinkConfig,
    abTestConfig: row.abTestConfig,
    targets: row.targets,
    folderId: row.folderId || null,
    retargetingPixels: pixels,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    lastUsedTargetIndex: typeof lastUsedTargetIndexFromDb === 'number' ? lastUsedTargetIndexFromDb : null,
    rotationStart: row.rotation_start,
    rotationEnd: row.rotation_end,
    clickLimit: row.click_limit,
  };
}

export async function getLinkById(id: string, userId: string): Promise<LinkItem | null> {
  debugLog(`[linkService - getLinkById] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Fetching linkId: ${id} for userId: ${userId}`);
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
        LEFT JOIN domains cd ON l."domainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId" 
        WHERE l.id = $1 AND l."userId" = $2;
    `;
    const res = await pool.query(query, [id, userId]);
    if (res.rows.length === 0) {
        debugLog(`[linkService - getLinkById] No link found for id: ${id}, userId: ${userId}`);
        return null;
    }
    debugLog(`[linkService - getLinkById] Link found for id: ${id}. Row:`, JSON.stringify(res.rows[0]));
    const linkRow = res.rows[0];
    const pixels = await getRetargetingPixelsForLink(linkRow.id);
    return formatLinkItem(linkRow, pixels);

  } catch (err) {
    console.error(`[linkService - getLinkById] Error fetching link by id ${id}:`, err);
    throw new Error('Failed to retrieve link.');
  }
}

export async function getLinkBySlug(slug: string, userId: string): Promise<LinkItem | null> {
  debugLog(`[linkService - getLinkBySlug] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Fetching slug: ${slug} for userId: ${userId}`);
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
        LEFT JOIN domains cd ON l."domainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId"
        WHERE l.slug = $1 AND l."userId" = $2; 
    `; 
    const res = await pool.query(query, [slug, userId]);
    if (res.rows.length === 0) {
      debugLog(`[linkService - getLinkBySlug] No link found for slug: ${slug}, userId: ${userId}`);
      return null;
    }
    debugLog(`[linkService - getLinkBySlug] Link found for slug: ${slug}. Row:`, JSON.stringify(res.rows[0]));
    const linkRow = res.rows[0];
    const pixels = await getRetargetingPixelsForLink(linkRow.id);
    return formatLinkItem(linkRow, pixels);

  } catch (err) {
    console.error(`[linkService - getLinkBySlug] Error fetching link by slug ${slug}:`, err);
    throw new Error('Failed to retrieve link by slug.');
  }
}

export async function getLinkBySlugAndDomain(slug: string, domain: string): Promise<LinkItem | null> {
  debugLog(`[linkService - getLinkBySlugAndDomain] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Fetching slug: ${slug}, domain: ${domain}`);
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
        WHERE l.slug = $1 AND l."domainId" IS NULL; 
      `;
      queryParams = [slug];
      if (isLocalhostDomainInput) {
        debugLog(`[linkService - getLinkBySlugAndDomain] Handling '${domain}' as a localhost domain. Searching for slug with no domainId.`);
      }
    } else {
      query = `
        SELECT l.*, l.last_used_target_index, 
               cd."domainName" as "customDomainName"
        FROM links l
        JOIN domains cd ON l."domainId" = cd.id
        WHERE l.slug = $1 AND cd."domainName" = $2 AND cd.verified = TRUE; 
      `; 
      queryParams = [slug, domain];
    }

    const res = await pool.query(query, queryParams);
    if (res.rows.length === 0) {
      debugLog(`[linkService - getLinkBySlugAndDomain] No link found for slug: ${slug}, domain: ${domain}`);
      return null;
    }
    debugLog(`[linkService - getLinkBySlugAndDomain] Link found for slug: ${slug}, domain: ${domain}. Row:`, JSON.stringify(res.rows[0]));
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
export async function getLinksByUserId(
  userId: string,
  folderId?: string
): Promise<LinkItem[]> {

  if (DB_TYPE !== 'postgres' || !pool) return [];
  let sql = `
    SELECT l.*, l.last_used_target_index,
           cd."domainName" AS customDomainName,
           lg.name AS groupName
      FROM links l
 LEFT JOIN domains cd ON l."domainId" = cd.id
 LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId"
     WHERE l."userId" = $1`;
  const params: any[] = [userId];
  if (folderId) {
    sql += ` AND l."folderId" = $2`;
    params.push(folderId);
  }
  sql += ` ORDER BY l."createdAt" DESC;`;
  const res = await pool.query(sql, params);
  debugLog(`[linkService] getLinksByUserId: userId=${userId}, folderId=${folderId}, linkDetails={res}`);
  return Promise.all(
    res.rows.map(async row => formatLinkItem(row, await getRetargetingPixelsForLink(row.id)))
  );
}


const generateDbSlug = async (domainId?: string): Promise<string> => {
  debugLog(`[linkService - generateDbSlug] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Generating slug for domainId: ${domainId}`);
  if (DB_TYPE !== 'postgres' || !pool) throw new Error("[linkService - generateDbSlug] Database pool not initialized for slug generation (requires PostgreSQL).");
  let slug = Math.random().toString(36).substring(2, 8);
  let query;
  let params;
  if (domainId) {
    query = 'SELECT id FROM links WHERE slug = $1 AND "domainId" = $2';
    params = [slug, domainId];
  } else {
    query = 'SELECT id FROM links WHERE slug = $1 AND "domainId" IS NULL';
    params = [slug];
  }
  let res = await pool.query(query, params);
  while (res.rows.length > 0) {
    slug = Math.random().toString(36).substring(2, 8);
    if (domainId) params = [slug, domainId];
    else params = [slug];
    res = await pool.query(query, params);
  }
  debugLog(`[linkService - generateDbSlug] Generated slug: ${slug}`);
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
  domainId?: string;
  groupId?: string;
  deepLinkConfig?: LinkItem['deepLinkConfig'];
  abTestConfig?: LinkItem['abTestConfig'];
  retargetingPixelIds?: string[];
  folderId?: string;
  rotationStart?: string
  rotationEnd?: string
  clickLimit?: number
}

export async function createLink(data: CreateLinkData): Promise<LinkItem> {
  debugLog(`[linkService - createLink] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Creating link with title: ${data.title}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    console.error('[linkService - createLink] PostgreSQL not configured, cannot create link.');
    throw new Error('Database not configured for link creation.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const linkId = uuidv4();
    const createdAt = new Date().toISOString();
    const slugToUse = data.slug ? data.slug.trim() : await generateDbSlug(data.domainId); 

    let slugConflictQuery, slugConflictParams;
    if (data.domainId) {
        slugConflictQuery = 'SELECT id FROM links WHERE slug = $1 AND "domainId" = $2';
        slugConflictParams = [slugToUse, data.domainId];
    } else {
        slugConflictQuery = 'SELECT id FROM links WHERE slug = $1 AND "domainId" IS NULL';
        slugConflictParams = [slugToUse];
    }
    const slugCheck = await client.query(slugConflictQuery, slugConflictParams);
    if (slugCheck.rows.length > 0) {
        throw new Error(`Slug '${slugToUse}' is already taken${data.domainId ? ' on this domain' : ''}.`);
    }

    let actualShortUrlBase: string;
    let customDomainName; // This will be used for the returned LinkItem

    if (data.domainId) {
        const domainRes = await client.query('SELECT "domainName" FROM domains WHERE id = $1 AND "userId" = $2', [data.domainId, data.userId]);
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
        (id, "userId", "originalUrl", "shortUrl", slug, title, tags, "isCloaked",
         "domainId", "groupId", "deepLinkConfig", "abTestConfig",
         targets, "folderId", "clickCount", last_used_target_index, "createdAt", "updatedAt", 
         "rotationStart", "rotationEnd", "clickLimit")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,NULL,$15,$15,$16,$17,$18)
      RETURNING *, last_used_target_index;
    `;

    const linkParams = [
      linkId, data.userId, data.originalUrl, shortUrl, slugToUse, data.title,
      data.tags, data.isCloaked ?? false, data.domainId, data.groupId,
      data.deepLinkConfig ? JSON.stringify(data.deepLinkConfig) : null,
      data.abTestConfig ? JSON.stringify(data.abTestConfig) : null,
      JSON.stringify(data.targets), 
      data.folderId,
      createdAt,
      data.rotationStart,
      data.rotationEnd,
      data.clickLimit,
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
    debugLog(`[linkService - createLink] Link created successfully with ID: ${linkId}`);
    const finalLink = formatLinkItem(newLinkRow, createdPixels);
    return finalLink;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[linkService - createLink] Error creating link:', err);
    if (err.message.includes('already taken') || err.message.includes('Custom domain not found')) throw err;
    if (err.constraint === 'links_shortUrl_key') throw new Error('Generated short URL conflict, please try again.');
    if (err.constraint === 'unique_slug_on_domain') throw new Error(`Slug '${data.slug}' is already taken${data.domainId ? ' on this domain' : ''}.`);
    throw new Error('Failed to create link.');
  } finally {
    client.release();
  }
}

export async function updateLink(
  linkId: string,
  userId: string,
  updates: Partial<CreateLinkData & { lastUsedTargetIndex?: number }>
): Promise<LinkItem | null> {
  debugLog(`[linkService - updateLink] Updating linkId: ${linkId}`);
  if (DB_TYPE !== 'postgres' || !pool) {
    throw new Error('Database not configured for link update.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure the link exists and belongs to this user
    const existing = await client.query(
      `SELECT * FROM links WHERE id = $1 AND "userId" = $2`,
      [linkId, userId]
    );
    if (existing.rows.length === 0) {
      throw new Error('Link not found or you do not have permission to update it.');
    }

    // 1) List all fields we now allow updating, including rotation and clickLimit
    const updatableFields = [
      'originalUrl',
      'title',
      'tags',
      'isCloaked',
      'groupId',
      'deepLinkConfig',
      'abTestConfig',
      'targets',
      'lastUsedTargetIndex',
      'folderId',
      'rotationStart',
      'rotationEnd',
      'clickLimit',
    ];

    // 2) Build SET clauses dynamically
    const setClauses: string[] = [];
    const queryParams: any[] = [linkId, userId];
    let idx = 3; // next placeholder index

    for (const field of updatableFields) {
      if ((updates as any)[field] !== undefined) {
        // Map JS field name → PostgreSQL column name
        let column = field;
        if (field === 'lastUsedTargetIndex') column = 'last_used_target_index';
        else if (field === 'rotationStart')     column = 'rotation_start';
        else if (field === 'rotationEnd')       column = 'rotation_end';
        else if (field === 'clickLimit')        column = 'click_limit';
        debugLog(`[linkService - updateLink] Updating field: ${field} to column: ${column}`);

        setClauses.push(`"${column}" = $${idx}`);

        let value = (updates as any)[field];
        // JSON-encode complex objects
        if (field === 'deepLinkConfig' || field === 'abTestConfig' || field === 'targets') {
          value = value ? JSON.stringify(value) : null;
        }
        // Normalize tags into a text[]
        if (field === 'tags' && !Array.isArray(value)) {
          value = value ? (value as string).split(',').map(t => t.trim()) : null;
        }

        queryParams.push(value);
        idx++;
      }
    }

    // 3) If nothing to update, rollback
    if (setClauses.length === 0) {
      await client.query('ROLLBACK');
      return getLinkById(linkId, userId);
    }

    // 4) Always bump updatedAt
    setClauses.push(`"updatedAt" = $${idx}`);
    queryParams.push(new Date().toISOString());
    idx++;

    // 5) Execute UPDATE
    const sql = `
      UPDATE links
      SET ${setClauses.join(', ')}
      WHERE id = $1 AND "userId" = $2
      RETURNING *
    `;
    debugLog(`[linkService - updateLink] Executing SQL: ${sql} with params: ${JSON.stringify(queryParams)}`);
    await client.query(sql, queryParams);

    await client.query('COMMIT');

    // 6) Re‐fetch and return the updated row
    const refreshed = await client.query(
      `SELECT l.*, cd."domainName" AS "customDomainName", lg.name AS "groupName"
         FROM links l
         LEFT JOIN domains cd ON l."domainId" = cd.id
         LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId"
        WHERE l.id = $1 AND l."userId" = $2`,
      [linkId, userId]
    );
    if (refreshed.rows.length === 0) return null;

    const pixels = await getRetargetingPixelsForLink(linkId);
    return formatLinkItem(refreshed.rows[0], pixels);

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error(`Error updating link ${linkId}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteLink(id: string, userId: string): Promise<boolean> {
  debugLog(`[linkService - deleteLink] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Deleting linkId: ${id}`);
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
        debugWarn(`[linkService - deleteLink] Link not found for deletion or user not authorized. LinkId: ${id}`);
        await client.query('ROLLBACK'); return false; 
    }
    await client.query('COMMIT');
    debugLog(`[linkService - deleteLink] Link deleted successfully: ${id}`);
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
    debugLog(`[linkService - incrementLinkClickCount] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Incrementing click for linkId: ${linkId}`);
    if (DB_TYPE !== 'postgres' || !pool) {
        console.error('[linkService - incrementLinkClickCount] PostgreSQL not configured for incrementing click count.');
        return;
    }
    try {
        const result = await pool.query('UPDATE links SET "clickCount" = "clickCount" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1', [linkId]);
        if (result.rowCount > 0) {
            debugLog(`[linkService - incrementLinkClickCount] Click count incremented successfully for ${linkId}. Rows affected: ${result.rowCount}`);
        } else {
            debugWarn(`[linkService - incrementLinkClickCount] Failed to increment click count for ${linkId}. Link not found or no change made. Row count: ${result.rowCount}`);
        }
    } catch (err) {
        console.error(`[linkService - incrementLinkClickCount] Error incrementing click count for linkId ${linkId}:`, err);
    }
}

export async function updateLinkLastUsedTarget(linkId: string, index: number): Promise<void> {
    debugLog(`[linkService - updateLinkLastUsedTarget] DB_TYPE: ${DB_TYPE}, pool initialized: ${!!pool}. Updating last_used_target_index to ${index} for linkId ${linkId}`);
    if (DB_TYPE !== 'postgres' || !pool) {
        console.error('[linkService - updateLinkLastUsedTarget] PostgreSQL not configured for updating last used target index.');
        return; 
    }
    try {
        const query = 'UPDATE links SET "last_used_target_index" = $1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, last_used_target_index;';
        const result = await pool.query(query, [index, linkId]);
        if (result.rowCount > 0 && result.rows[0]) { 
            debugLog(`[linkService - updateLinkLastUsedTarget] Successfully updated last_used_target_index to ${result.rows[0].last_used_target_index} for link ${result.rows[0].id}. Rows affected: ${result.rowCount}`);
        } else {
            debugWarn(`[linkService - updateLinkLastUsedTarget] Failed to update last_used_target_index for link ${linkId}. Link not found or no change made. Row count: ${result.rowCount}`);
        }
    } catch (err) {
        console.error(`[linkService - updateLinkLastUsedTarget] Error in updateLinkLastUsedTarget for link ${linkId}:`, err);
    }
}

