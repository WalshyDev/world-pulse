import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, sql } from 'drizzle-orm';
import type { Env } from '../../types';

// Define schema inline
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';

const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  options: text('options').notNull(),
  createdAt: text('created_at').notNull(),
  activeFrom: text('active_from'),
  activeTo: text('active_to'),
  status: text('status').notNull(),
}, (table) => [
  index('idx_questions_status').on(table.status),
]);

export interface Question {
  id: string;
  text: string;
  options: Array<{ id: string; text: string; color: string }>;
  createdAt: string;
  activeFrom: string | null;
  activeTo: string | null;
  status: 'pending' | 'active' | 'archived';
}

const OPTION_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

class _AdminQuestionsStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  async getAll(status?: string): Promise<Question[]> {
    let query = this.db.select().from(questions).orderBy(desc(questions.createdAt));

    if (status) {
      query = query.where(eq(questions.status, status)) as typeof query;
    }

    const result = await query;

    return result.map((q) => ({
      ...q,
      options: JSON.parse(q.options),
      status: q.status as 'pending' | 'active' | 'archived',
    }));
  }

  async getById(id: string): Promise<Question | null> {
    const result = await this.db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const q = result[0];
    return {
      ...q,
      options: JSON.parse(q.options),
      status: q.status as 'pending' | 'active' | 'archived',
    };
  }

  async create(text: string, optionTexts: string[]): Promise<string> {
    const id = `q-${crypto.randomUUID().slice(0, 8)}`;
    const options = optionTexts.map((t, i) => ({
      id: `opt-${crypto.randomUUID().slice(0, 8)}`,
      text: t,
      color: OPTION_COLORS[i % OPTION_COLORS.length],
    }));

    await this.db.insert(questions).values({
      id,
      text,
      options: JSON.stringify(options),
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    return id;
  }

  async update(id: string, text: string, optionTexts: string[]): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) return false;

    // Preserve existing option IDs where possible
    const options = optionTexts.map((t, i) => ({
      id: existing.options[i]?.id || `opt-${crypto.randomUUID().slice(0, 8)}`,
      text: t,
      color: OPTION_COLORS[i % OPTION_COLORS.length],
    }));

    await this.db
      .update(questions)
      .set({ text, options: JSON.stringify(options) })
      .where(eq(questions.id, id));

    return true;
  }

  async activate(id: string): Promise<boolean> {
    // First archive any currently active question
    await this.db
      .update(questions)
      .set({ status: 'archived' })
      .where(eq(questions.status, 'active'));

    // Calculate end time (midnight UTC tomorrow)
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0,
    ));

    // Activate the specified question
    const result = await this.db
      .update(questions)
      .set({
        status: 'active',
        activeFrom: now.toISOString(),
        activeTo: tomorrow.toISOString(),
      })
      .where(eq(questions.id, id))
      .returning({ id: questions.id });

    return result.length > 0;
  }

  async archive(id: string): Promise<boolean> {
    const result = await this.db
      .update(questions)
      .set({ status: 'archived' })
      .where(eq(questions.id, id))
      .returning({ id: questions.id });

    return result.length > 0;
  }

  async delete(id: string): Promise<boolean> {
    // Only allow deleting pending questions
    const result = await this.db
      .delete(questions)
      .where(sql`${questions.id} = ${id} AND ${questions.status} = 'pending'`)
      .returning({ id: questions.id });

    return result.length > 0;
  }
}

export const AdminQuestionsStore = new _AdminQuestionsStore();
