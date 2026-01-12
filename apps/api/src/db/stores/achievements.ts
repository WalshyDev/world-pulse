import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { achievements } from '../schema';
import type { Env } from '../../types';

class _AchievementsStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  private get d1() {
    return (env as Env).DB;
  }

  async getByUser(voterIp: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      unlockedAt: string;
    }>
  > {
    const result = await this.db
      .select()
      .from(achievements)
      .where(eq(achievements.voterIp, voterIp));

    return result.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      unlockedAt: a.unlockedAt,
    }));
  }

  async has(voterIp: string, name: string): Promise<boolean> {
    const result = await this.db
      .select({ id: achievements.id })
      .from(achievements)
      .where(and(eq(achievements.voterIp, voterIp), eq(achievements.name, name)))
      .limit(1);

    return result.length > 0;
  }

  async create(voterIp: string, name: string, description: string): Promise<string> {
    const id = crypto.randomUUID();
    await this.db.insert(achievements).values({
      id,
      voterIp,
      name,
      description,
    });
    return id;
  }

  async getMajorityVoteCount(voterIp: string): Promise<number> {
    const result = await this.d1.prepare(`
      WITH user_votes AS (
        SELECT v.question_id, v.option_id
        FROM votes v
        WHERE v.voter_ip = ?
      ),
      question_winners AS (
        SELECT question_id, option_id, count
        FROM (
          SELECT question_id, option_id, COUNT(*) as count,
                 ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY COUNT(*) DESC) as rn
          FROM votes
          GROUP BY question_id, option_id
        )
        WHERE rn = 1
      )
      SELECT COUNT(*) as majority_count
      FROM user_votes uv
      JOIN question_winners qw ON uv.question_id = qw.question_id AND uv.option_id = qw.option_id
    `).bind(voterIp).first<{ majority_count: number }>();

    return result?.majority_count ?? 0;
  }
}

export const AchievementsStore = new _AchievementsStore();
