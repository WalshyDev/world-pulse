import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import type { Env } from '../../types';

// Define schema inline
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

const questionSubmissions = sqliteTable('question_submissions', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  options: text('options').notNull(),
  submittedAt: text('submitted_at').notNull(),
  submittedByIp: text('submitted_by_ip').notNull(),
  upvotes: integer('upvotes').notNull(),
  status: text('status').notNull(),
}, (table) => [
  index('idx_submissions_pending').on(table.status, table.upvotes),
]);

const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  options: text('options').notNull(),
  createdAt: text('created_at').notNull(),
  activeFrom: text('active_from'),
  activeTo: text('active_to'),
  status: text('status').notNull(),
});

export interface Submission {
  id: string;
  text: string;
  options: string[];
  submittedAt: string;
  submittedByIp: string;
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
}

const OPTION_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

class _AdminQueueStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  private get d1() {
    return (env as Env).DB;
  }

  async getAll(status?: string): Promise<Submission[]> {
    let query = this.db
      .select()
      .from(questionSubmissions)
      .orderBy(desc(questionSubmissions.upvotes), desc(questionSubmissions.submittedAt));

    if (status) {
      query = query.where(eq(questionSubmissions.status, status)) as typeof query;
    }

    const result = await query;

    return result.map((s) => ({
      ...s,
      options: JSON.parse(s.options),
      status: s.status as 'pending' | 'approved' | 'rejected',
    }));
  }

  async approve(id: string): Promise<boolean> {
    const result = await this.db
      .update(questionSubmissions)
      .set({ status: 'approved' })
      .where(eq(questionSubmissions.id, id))
      .returning({ id: questionSubmissions.id });

    return result.length > 0;
  }

  async reject(id: string): Promise<boolean> {
    const result = await this.db
      .update(questionSubmissions)
      .set({ status: 'rejected' })
      .where(eq(questionSubmissions.id, id))
      .returning({ id: questionSubmissions.id });

    return result.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    // Delete upvotes first (foreign key constraint), then the submission
    await this.d1.batch([
      this.d1.prepare('DELETE FROM submission_upvotes WHERE submission_id = ?').bind(id),
      this.d1.prepare('DELETE FROM question_submissions WHERE id = ?').bind(id),
    ]);

    return true;
  }

  async promoteToQuestion(submissionId: string): Promise<string | null> {
    // Get the submission
    const submissions = await this.db
      .select()
      .from(questionSubmissions)
      .where(eq(questionSubmissions.id, submissionId))
      .limit(1);

    if (submissions.length === 0) return null;

    const submission = submissions[0];
    const optionTexts = JSON.parse(submission.options) as string[];

    // Create question from submission
    const questionId = `q-${crypto.randomUUID().slice(0, 8)}`;
    const options = optionTexts.map((t, i) => ({
      id: `opt-${crypto.randomUUID().slice(0, 8)}`,
      text: t,
      color: OPTION_COLORS[i % OPTION_COLORS.length],
    }));

    // Archive any currently active question
    await this.db
      .update(questions)
      .set({ status: 'archived' })
      .where(eq(questions.status, 'active'));

    // Calculate end time
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0,
    ));

    // Create and activate the question
    await this.db.insert(questions).values({
      id: questionId,
      text: submission.text,
      options: JSON.stringify(options),
      createdAt: new Date().toISOString(),
      activeFrom: now.toISOString(),
      activeTo: tomorrow.toISOString(),
      status: 'active',
    });

    // Mark submission as approved
    await this.db
      .update(questionSubmissions)
      .set({ status: 'approved' })
      .where(eq(questionSubmissions.id, submissionId));

    return questionId;
  }
}

export const AdminQueueStore = new _AdminQueueStore();
