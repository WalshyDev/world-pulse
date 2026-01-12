import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import { votes, questions } from '../schema';
import type { Env } from '../../types';

class _VotesStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  async getUserVote(questionId: string, voterIp: string): Promise<string | null> {
    const result = await this.db
      .select({ optionId: votes.optionId })
      .from(votes)
      .where(and(eq(votes.questionId, questionId), eq(votes.voterIp, voterIp)))
      .limit(1);

    return result.length > 0 ? result[0].optionId : null;
  }

  async hasUserVoted(questionId: string, voterIp: string): Promise<boolean> {
    const result = await this.getUserVote(questionId, voterIp);
    return result !== null;
  }

  async create(
    questionId: string,
    optionId: string,
    countryCode: string,
    voterIp: string,
  ): Promise<string> {
    const id = crypto.randomUUID();
    await this.db.insert(votes).values({
      id,
      questionId,
      optionId,
      countryCode,
      voterIp,
    });
    return id;
  }

  async getCounts(questionId: string): Promise<Array<{ optionId: string; count: number }>> {
    const result = await this.db
      .select({
        optionId: votes.optionId,
        count: sql<number>`count(*)`,
      })
      .from(votes)
      .where(eq(votes.questionId, questionId))
      .groupBy(votes.optionId);

    return result;
  }

  async getUserHistory(voterIp: string): Promise<Array<{ votedAt: string; activeFrom: string | null }>> {
    const result = await this.db
      .select({
        votedAt: votes.votedAt,
        activeFrom: questions.activeFrom,
      })
      .from(votes)
      .innerJoin(questions, eq(votes.questionId, questions.id))
      .where(eq(votes.voterIp, voterIp))
      .orderBy(sql`${votes.votedAt} DESC`);

    return result;
  }

  async getCountriesVotedFrom(voterIp: string): Promise<Set<string>> {
    const result = await this.db
      .select({ countryCode: votes.countryCode })
      .from(votes)
      .where(eq(votes.voterIp, voterIp))
      .groupBy(votes.countryCode);

    return new Set(result.map((r) => r.countryCode).filter((c) => c !== 'XX' && c !== 'T1'));
  }
}

export const VotesStore = new _VotesStore();
