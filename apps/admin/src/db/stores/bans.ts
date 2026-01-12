import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../../types';

// Define the schema inline since we can't import from api
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

const bannedIps = sqliteTable('banned_ips', {
  ip: text('ip').primaryKey(),
  reason: text('reason'),
  bannedAt: text('banned_at').notNull(),
  bannedBy: text('banned_by'),
});

export interface BannedIp {
  ip: string;
  reason: string | null;
  bannedAt: string;
  bannedBy: string | null;
}

class _BansStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  async getAll(): Promise<BannedIp[]> {
    const result = await this.db
      .select()
      .from(bannedIps)
      .orderBy(desc(bannedIps.bannedAt));

    return result;
  }

  async isBanned(ip: string): Promise<boolean> {
    const result = await this.db
      .select({ ip: bannedIps.ip })
      .from(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .limit(1);

    return result.length > 0;
  }

  async ban(ip: string, reason: string | null, bannedBy: string): Promise<void> {
    await this.db.insert(bannedIps).values({
      ip,
      reason,
      bannedAt: new Date().toISOString(),
      bannedBy,
    }).onConflictDoUpdate({
      target: bannedIps.ip,
      set: { reason, bannedBy },
    });
  }

  async unban(ip: string): Promise<boolean> {
    const result = await this.db
      .delete(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .returning({ ip: bannedIps.ip });

    return result.length > 0;
  }
}

export const BansStore = new _BansStore();
