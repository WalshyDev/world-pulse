import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { bannedIps } from '../schema';
import type { Env } from '../../types';

class _BansStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  async isBanned(ip: string): Promise<boolean> {
    const result = await this.db
      .select({ ip: bannedIps.ip })
      .from(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .limit(1);

    return result.length > 0;
  }
}

export const BansStore = new _BansStore();
