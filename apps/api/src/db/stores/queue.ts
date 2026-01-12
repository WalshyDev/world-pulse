import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, sql } from 'drizzle-orm';
import { questionSubmissions, submissionUpvotes } from '../schema';
import { OPTION_COLORS } from '@world-pulse/shared';
import type { Env } from '../../types';

class _QueueStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  private get d1() {
    return (env as Env).DB;
  }

  async getSubmissions(limit = 50): Promise<
    Array<{
      id: string;
      text: string;
      options: string[];
      submittedAt: string;
      upvotes: number;
      status: 'pending' | 'approved' | 'rejected';
    }>
  > {
    const result = await this.db
      .select()
      .from(questionSubmissions)
      .where(eq(questionSubmissions.status, 'pending'))
      .orderBy(desc(questionSubmissions.upvotes))
      .limit(limit);

    return result.map((row) => ({
      id: row.id,
      text: row.text,
      options: JSON.parse(row.options),
      submittedAt: row.submittedAt,
      upvotes: row.upvotes,
      status: row.status,
    }));
  }

  async getUserUpvotedIds(voterIp: string): Promise<Set<string>> {
    const result = await this.db
      .select({ submissionId: submissionUpvotes.submissionId })
      .from(submissionUpvotes)
      .where(eq(submissionUpvotes.voterIp, voterIp));

    return new Set(result.map((r) => r.submissionId));
  }

  async getPendingCount(voterIp: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(questionSubmissions)
      .where(
        and(
          eq(questionSubmissions.submittedByIp, voterIp),
          eq(questionSubmissions.status, 'pending'),
        ),
      );

    return result[0]?.count ?? 0;
  }

  async createSubmission(text: string, options: string[], voterIp: string): Promise<string> {
    const id = crypto.randomUUID();

    await this.d1.batch([
      this.d1.prepare(`
        INSERT INTO question_submissions (id, text, options, submitted_at, submitted_by_ip, upvotes, status)
        VALUES (?, ?, ?, datetime('now'), ?, 1, 'pending')
      `).bind(id, text, JSON.stringify(options), voterIp),
      this.d1.prepare(`
        INSERT INTO submission_upvotes (submission_id, voter_ip, voted_at)
        VALUES (?, ?, datetime('now'))
      `).bind(id, voterIp),
    ]);

    return id;
  }

  async hasUpvoted(submissionId: string, voterIp: string): Promise<boolean> {
    const result = await this.db
      .select({ submissionId: submissionUpvotes.submissionId })
      .from(submissionUpvotes)
      .where(
        and(
          eq(submissionUpvotes.submissionId, submissionId),
          eq(submissionUpvotes.voterIp, voterIp),
        ),
      )
      .limit(1);

    return result.length > 0;
  }

  async upvote(submissionId: string, voterIp: string): Promise<void> {
    await this.d1.batch([
      this.d1.prepare(`
        INSERT INTO submission_upvotes (submission_id, voter_ip, voted_at)
        VALUES (?, ?, datetime('now'))
      `).bind(submissionId, voterIp),
      this.d1.prepare(`
        UPDATE question_submissions
        SET upvotes = upvotes + 1
        WHERE id = ?
      `).bind(submissionId),
    ]);
  }

  async getTopSubmission(): Promise<{
    id: string;
    text: string;
    options: string[];
  } | null> {
    const result = await this.db
      .select({
        id: questionSubmissions.id,
        text: questionSubmissions.text,
        options: questionSubmissions.options,
      })
      .from(questionSubmissions)
      .where(eq(questionSubmissions.status, 'pending'))
      .orderBy(desc(questionSubmissions.upvotes))
      .limit(1);

    if (result.length === 0) return null;

    return {
      id: result[0].id,
      text: result[0].text,
      options: JSON.parse(result[0].options),
    };
  }

  async approve(id: string): Promise<void> {
    await this.db
      .update(questionSubmissions)
      .set({ status: 'approved' })
      .where(eq(questionSubmissions.id, id));
  }

  async promoteToQuestion(submissionId: string): Promise<string> {
    const submission = await this.getTopSubmission();
    if (!submission || submission.id !== submissionId) {
      throw new Error('Submission not found');
    }

    const questionId = crypto.randomUUID();
    const options = submission.options.map((text, i) => ({
      id: crypto.randomUUID(),
      text,
      color: OPTION_COLORS[i] || OPTION_COLORS[0],
    }));

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    await this.d1.batch([
      this.d1.prepare(`
        INSERT INTO questions (id, text, options, created_at, active_from, active_to, status)
        VALUES (?, ?, ?, datetime('now'), datetime('now'), ?, 'active')
      `).bind(questionId, submission.text, JSON.stringify(options), tomorrow.toISOString()),
      this.d1.prepare(`
        UPDATE question_submissions SET status = 'approved' WHERE id = ?
      `).bind(submissionId),
    ]);

    return questionId;
  }
}

export const QueueStore = new _QueueStore();
