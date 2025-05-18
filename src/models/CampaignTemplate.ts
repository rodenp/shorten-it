import { pool } from '@/lib/db';

export interface CampaignTemplate {
  id: string;
  userId: string;
  name: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CampaignTemplateModel = {
  async findByUserId(userId: string): Promise<CampaignTemplate[]> {
    const res = await pool.query(
      'SELECT * FROM campaign_templates WHERE "userId" = $1 ORDER BY "createdAt" ASC',
      [userId]
    );
    return res.rows;
  },

  async create(userId: string, data: Partial<CampaignTemplate>): Promise<CampaignTemplate> {
    const id = crypto.randomUUID();
    const { name, source, medium, campaign, term, content } = data;

    const res = await pool.query(
      `INSERT INTO campaign_templates (id, "userId", name, source, medium, campaign, term, content) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, userId, name, source, medium, campaign, term, content]
    );
    return res.rows[0];
  },

  async update(id: string, userId: string, data: Partial<CampaignTemplate>): Promise<CampaignTemplate> {
    const { name, source, medium, campaign, term, content } = data;
    const res = await pool.query(
      `UPDATE campaign_templates 
       SET name = $1, source = $2, medium = $3, campaign = $4, term = $5, content = $6, "updatedAt" = NOW()
       WHERE id = $7 AND "userId" = $8
       RETURNING *`,
      [name, source, medium, campaign, term, content, id, userId]
    );
    return res.rows[0];
  },

  async delete(id: string, userId: string): Promise<void> {
    await pool.query(
      'DELETE FROM campaign_templates WHERE id = $1 AND "userId" = $2',
      [id, userId]
    );
  },

  async findById(id: string, userId: string): Promise<CampaignTemplate | null> {
    const res = await pool.query(
      'SELECT * FROM campaign_templates WHERE id = $1 AND "userId" = $2',
      [id, userId]
    );
    return res.rows[0] || null;
  }
};