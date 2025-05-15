
import { pool, DB_TYPE } from './db';
import { LinkItem, LinkTarget, RetargetingPixel } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { getShortenerDomain } from './mock-data'; // Temporary for shortUrl generation logic

if (DB_TYPE !== 'postgres' || !pool) {
  console.warn('Link service currently only supports PostgreSQL. DB_TYPE is set to:', DB_TYPE);
}

async function getRetargetingPixelsForLink(linkId: string): Promise<RetargetingPixel[]> {
    if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
    const query = `
        SELECT rp.id, rp."userId", rp.name, rp.type, rp."pixelIdValue", rp."createdAt", rp."updatedAt"
        FROM retargeting_pixels rp
        JOIN link_retargeting_pixels lrp ON rp.id = lrp."pixelId"
        WHERE lrp."linkId" = $1;
    `;
    const result = await pool.query(query, [linkId]);
    return result.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        name: row.name,
        type: row.type as RetargetingPixel['type'],
        pixelIdValue: row.pixelIdValue,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
    }));
}

function formatLinkItem(row: any, pixels?: RetargetingPixel[]): LinkItem {
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
    customDomain: row.customDomainName, // From custom_domains join
    customDomainId: row.customDomainId, // The ID itself
    groupId: row.groupId,
    groupName: row.groupName, // From link_groups join
    deepLinkConfig: row.deepLinkConfig,
    abTestConfig: row.abTestConfig,
    targets: row.targets,
    retargetingPixels: pixels,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
  };
}

export async function getLinkById(id: string, userId: string): Promise<LinkItem | null> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const query = `
        SELECT l.*, 
               cd."domainName" as "customDomainName",
               lg.name as "groupName"
        FROM links l
        LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId" 
        WHERE l.id = $1 AND l."userId" = $2;
    `;
    const res = await pool.query(query, [id, userId]);
    if (res.rows.length === 0) return null;
    
    const linkRow = res.rows[0];
    const pixels = await getRetargetingPixelsForLink(linkRow.id);
    let link = formatLinkItem(linkRow, pixels);

    if (link.customDomain) {
        link.shortUrl = `https://${link.customDomain}/${link.slug}`;
    } else {
        link.shortUrl = `https://${getShortenerDomain()}/${link.slug}`;
    }
    return link;

  } catch (err) {
    console.error('Error fetching link by id:', err);
    throw new Error('Failed to retrieve link.');
  }
}

export async function getLinkBySlug(slug: string, userId: string): Promise<LinkItem | null> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    // Query by slug and userId. If slugs are unique per domain, you might need to add a customDomainId condition.
    const query = `
        SELECT l.*, 
               cd."domainName" as "customDomainName",
               lg.name as "groupName"
        FROM links l
        LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId"
        WHERE l.slug = $1 AND l."userId" = $2; 
    `; 
    // If slugs are only unique in the context of a specific custom domain OR the default domain,
    // the query would be more complex, potentially needing to check for customDomainId OR customDomainId IS NULL.
    // For now, this assumes slug is unique enough when combined with userId.
    const res = await pool.query(query, [slug, userId]);
    if (res.rows.length === 0) return null;
    
    const linkRow = res.rows[0];
    const pixels = await getRetargetingPixelsForLink(linkRow.id); // Use the actual ID of the found link
    let link = formatLinkItem(linkRow, pixels);

    if (link.customDomain) {
        link.shortUrl = `https://${link.customDomain}/${link.slug}`;
    } else {
        link.shortUrl = `https://${getShortenerDomain()}/${link.slug}`;
    }
    return link;

  } catch (err) {
    console.error('Error fetching link by slug:', err);
    throw new Error('Failed to retrieve link by slug.');
  }
}


export async function getLinksByUserId(userId: string): Promise<LinkItem[]> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  try {
    const query = `
        SELECT l.*, 
               cd."domainName" as "customDomainName",
               lg.name as "groupName"
        FROM links l
        LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id
        LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId"
        WHERE l."userId" = $1 ORDER BY l."createdAt" DESC;
    `;
    const res = await pool.query(query, [userId]);
    const links: LinkItem[] = [];
    for (const row of res.rows) {
        const pixels = await getRetargetingPixelsForLink(row.id);
        let link = formatLinkItem(row, pixels);
        if (link.customDomain) {
            link.shortUrl = `https://${link.customDomain}/${link.slug}`;
        } else {
            link.shortUrl = `https://${getShortenerDomain()}/${link.slug}`;
        }
        links.push(link);
    }
    return links;
  } catch (err) {
    console.error('Error fetching links by userId:', err);
    throw new Error('Failed to retrieve links.');
  }
}


const generateDbSlug = async (customDomainId?: string): Promise<string> => {
  if (!pool) throw new Error("Database pool not initialized for slug generation.");
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
    // Re-assign params with the new slug for the next check
    if (customDomainId) params = [slug, customDomainId];
    else params = [slug];
    res = await pool.query(query, params);
  }
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
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const linkId = uuidv4();
    const createdAt = new Date().toISOString();

    const slug = data.slug ? data.slug.trim() : await generateDbSlug(data.customDomainId);

    let slugConflictQuery, slugConflictParams;
    if (data.customDomainId) {
        slugConflictQuery = 'SELECT id FROM links WHERE slug = $1 AND "customDomainId" = $2';
        slugConflictParams = [slug, data.customDomainId];
    } else {
        slugConflictQuery = 'SELECT id FROM links WHERE slug = $1 AND "customDomainId" IS NULL';
        slugConflictParams = [slug];
    }
    const slugCheck = await client.query(slugConflictQuery, slugConflictParams);
    if (slugCheck.rows.length > 0) {
        throw new Error(`Slug '${slug}' is already taken${data.customDomainId ? ' on this domain' : ''}.`);
    }

    let shortUrlBase = getShortenerDomain(); 
    let customDomainName;
    if (data.customDomainId) {
        const domainRes = await client.query('SELECT "domainName" FROM custom_domains WHERE id = $1 AND "userId" = $2', [data.customDomainId, data.userId]);
        if (domainRes.rows.length > 0) {
            customDomainName = domainRes.rows[0].domainName;
            shortUrlBase = customDomainName;
        } else {
            throw new Error('Custom domain not found or not authorized.');
        }
    }
    const shortUrl = `https://${shortUrlBase}/${slug}`;

    const linkQuery = `
      INSERT INTO links 
        (id, "userId", "originalUrl", "shortUrl", slug, title, tags, "isCloaked", "customDomainId", "groupId", "deepLinkConfig", "abTestConfig", targets, "createdAt", "updatedAt", "clickCount")
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14, 0)
      RETURNING *;
    `;

    const linkParams = [
      linkId, data.userId, data.originalUrl, shortUrl, slug, data.title,
      data.tags, data.isCloaked ?? false, data.customDomainId, data.groupId,
      data.deepLinkConfig ? JSON.stringify(data.deepLinkConfig) : null,
      data.abTestConfig ? JSON.stringify(data.abTestConfig) : null,
      JSON.stringify(data.targets), 
      createdAt
    ];

    const res = await client.query(linkQuery, linkParams);
    let newLinkRow = res.rows[0];
    newLinkRow.customDomainName = customDomainName; // Add for formatLinkItem

    // Fetch groupName if groupId exists
    if (newLinkRow.groupId) {
        const groupRes = await client.query('SELECT name FROM link_groups WHERE id = $1 AND "userId" = $2', [newLinkRow.groupId, data.userId]);
        if (groupRes.rows.length > 0) {
            newLinkRow.groupName = groupRes.rows[0].name;
        }
    }

    let createdPixels: RetargetingPixel[] = [];
    if (data.retargetingPixelIds && data.retargetingPixelIds.length > 0) {
      for (const pixelId of data.retargetingPixelIds) {
        await client.query(
          'INSERT INTO link_retargeting_pixels ("linkId", "pixelId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [linkId, pixelId]
        );
      }
      createdPixels = await getRetargetingPixelsForLink(linkId); 
    }

    await client.query('COMMIT');
    const finalLink = formatLinkItem(newLinkRow, createdPixels);
    finalLink.shortUrl = shortUrl; 
    return finalLink;

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Error creating link:', err);
    if (err.message.includes('already taken') || err.message.includes('Custom domain not found')) throw err;
    if (err.constraint === 'links_shortUrl_key') throw new Error('Generated short URL conflict, please try again.');
    if (err.constraint === 'unique_slug_on_domain') throw new Error(`Slug '${data.slug}' is already taken${data.customDomainId ? ' on this domain' : ''}.`);
    throw new Error('Failed to create link.');
  } finally {
    client.release();
  }
}

export async function updateLink(linkId: string, userId: string, updates: Partial<CreateLinkData> & { originalUrl?: string, targets?: LinkTarget[] }): Promise<LinkItem | null> {
    if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existingLinkRes = await client.query('SELECT * FROM links WHERE id = $1 AND "userId" = $2', [linkId, userId]);
        if (existingLinkRes.rows.length === 0) {
            throw new Error('Link not found or you do not have permission to update it.');
        }

        const updatableFields = [
            'originalUrl', 'title', 'tags', 'isCloaked', 'groupId',
            'deepLinkConfig', 'abTestConfig', 'targets'
        ];

        const setClauses: string[] = [];
        const queryParams: any[] = [linkId, userId];
        let paramIndex = 3;

        for (const field of updatableFields) {
            if (updates[field as keyof typeof updates] !== undefined) {
                setClauses.push(`"${field}" = $${paramIndex++}`);
                let value = updates[field as keyof typeof updates];
                if (field === 'deepLinkConfig' || field === 'abTestConfig' || field === 'targets') {
                    value = value ? JSON.stringify(value) : null;
                }
                if (field === 'tags' && !Array.isArray(value)) { 
                    value = value ? (value as string).split(',').map(t=>t.trim()) : null;
                } 
                queryParams.push(value);
            }
        }
        
        let needsDbUpdate = setClauses.length > 0;
        if (needsDbUpdate) {
            queryParams.push(new Date().toISOString()); 
            setClauses.push(`"updatedAt" = $${paramIndex++}`);
            const updateQuery = `UPDATE links SET ${setClauses.join(', ')} WHERE id = $1 AND "userId" = $2 RETURNING *;`;
            await client.query(updateQuery, queryParams);
        }
                
        if (updates.retargetingPixelIds !== undefined) {
            needsDbUpdate = true; // Mark that an update happened even if only pixels changed
            await client.query('DELETE FROM link_retargeting_pixels WHERE "linkId" = $1', [linkId]);
            if (updates.retargetingPixelIds.length > 0) {
                for (const pixelId of updates.retargetingPixelIds) {
                    await client.query(
                        'INSERT INTO link_retargeting_pixels ("linkId", "pixelId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [linkId, pixelId]
                    );
                }
            }
             // If only pixels changed, we still need to mark updatedAt on the main link for consistency
            if (setClauses.length === 0) { // only pixels changed, no other fields from updatableFields
                 await client.query('UPDATE links SET "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1 AND "userId" = $2', [linkId, userId]);
            }
        }

        if (!needsDbUpdate) {
             await client.query('ROLLBACK');
             client.release();
             return getLinkById(linkId, userId); // Return existing if no actual changes were made
        }

        await client.query('COMMIT');
        
        const updatedLinkDataRes = await client.query(
          'SELECT l.*, cd."domainName" as "customDomainName", lg.name as "groupName" FROM links l LEFT JOIN custom_domains cd ON l."customDomainId" = cd.id LEFT JOIN link_groups lg ON l."groupId" = lg.id AND lg."userId" = l."userId" WHERE l.id = $1 AND l."userId" = $2',
          [linkId, userId]
        );
        if(updatedLinkDataRes.rows.length === 0) return null; 

        const pixels = await getRetargetingPixelsForLink(linkId);
        const finalUpdatedLink = formatLinkItem(updatedLinkDataRes.rows[0], pixels);
        if (finalUpdatedLink.customDomain) {
            finalUpdatedLink.shortUrl = `https://${finalUpdatedLink.customDomain}/${finalUpdatedLink.slug}`;
        } else {
            finalUpdatedLink.shortUrl = `https://${getShortenerDomain()}/${finalUpdatedLink.slug}`;
        }
        return finalUpdatedLink;

    } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('Error updating link:', err);
        throw new Error(err.message || 'Failed to update link.');
    } finally {
        client.release();
    }
}


export async function deleteLink(id: string, userId: string): Promise<boolean> {
  if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM link_retargeting_pixels WHERE "linkId" = $1', [id]);
    // Delete analytic events associated with the link
    await client.query('DELETE FROM analytic_events WHERE "linkId" = $1', [id]);

    const res = await client.query('DELETE FROM links WHERE id = $1 AND "userId" = $2', [id, userId]);
    if (res.rowCount === 0) {
        await client.query('ROLLBACK');
        return false; 
    }
    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting link:', err);
    throw new Error('Failed to delete link.');
  } finally {
    client.release();
  }
}

export async function incrementLinkClickCount(linkId: string): Promise<void> {
    if (DB_TYPE !== 'postgres' || !pool) throw new Error('PostgreSQL not configured');
    try {
        await pool.query('UPDATE links SET "clickCount" = "clickCount" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1', [linkId]);
    } catch (err) {
        console.error('Error incrementing click count:', err);
    }
}
