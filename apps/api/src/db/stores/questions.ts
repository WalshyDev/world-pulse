import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, sql } from 'drizzle-orm';
import { questions } from '../schema';
import { OPTION_COLORS } from '@world-pulse/shared';
import type { Question as SharedQuestion } from '@world-pulse/shared';
import type { Env } from '../../types';

class _QuestionsStore {
  private get db() {
    return drizzle((env as Env).DB);
  }

  async getCurrentQuestion(): Promise<SharedQuestion | null> {
    const now = new Date().toISOString();
    const result = await this.db
      .select()
      .from(questions)
      .where(
        and(
          eq(questions.status, 'active'),
          sql`datetime(${questions.activeFrom}) <= datetime(${now})`,
          sql`datetime(${questions.activeTo}) > datetime(${now})`,
        ),
      )
      .limit(1);

    if (result.length === 0) return null;

    const q = result[0];
    return {
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options),
      createdAt: q.createdAt,
      activeFrom: q.activeFrom,
      activeTo: q.activeTo,
      status: q.status,
    };
  }

  async getById(id: string): Promise<SharedQuestion | null> {
    const result = await this.db
      .select()
      .from(questions)
      .where(eq(questions.id, id))
      .limit(1);

    if (result.length === 0) return null;

    const q = result[0];
    return {
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options),
      createdAt: q.createdAt,
      activeFrom: q.activeFrom,
      activeTo: q.activeTo,
      status: q.status,
    };
  }

  async getOptions(questionId: string): Promise<Array<{ id: string; text: string; color: string }>> {
    const question = await this.getById(questionId);
    if (!question) return [];
    return question.options;
  }

  async create(text: string, optionTexts: string[]): Promise<string> {
    const id = crypto.randomUUID();
    const options = optionTexts.map((text, i) => ({
      id: crypto.randomUUID(),
      text,
      color: OPTION_COLORS[i] || OPTION_COLORS[0],
    }));

    await this.db.insert(questions).values({
      id,
      text,
      options: JSON.stringify(options),
      status: 'pending',
    });

    return id;
  }

  async archiveActive(): Promise<string | null> {
    const active = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.status, 'active'))
      .limit(1);

    if (active.length === 0) return null;

    const id = active[0].id;
    await this.db
      .update(questions)
      .set({ status: 'archived' })
      .where(eq(questions.id, id));

    return id;
  }

  async activate(id: string, activeTo: Date): Promise<void> {
    await this.db
      .update(questions)
      .set({ status: 'archived' })
      .where(eq(questions.status, 'active'));

    await this.db
      .update(questions)
      .set({
        status: 'active',
        activeFrom: new Date().toISOString(),
        activeTo: activeTo.toISOString(),
      })
      .where(eq(questions.id, id));
  }

  async getNextPending(): Promise<{ id: string } | null> {
    const result = await this.db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.status, 'pending'))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  async getArchived(limit = 20): Promise<SharedQuestion[]> {
    const result = await this.db
      .select()
      .from(questions)
      .where(eq(questions.status, 'archived'))
      .orderBy(sql`datetime(${questions.activeTo}) DESC`)
      .limit(limit);

    return result.map((q) => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options),
      createdAt: q.createdAt,
      activeFrom: q.activeFrom,
      activeTo: q.activeTo,
      status: q.status,
    }));
  }
}

export const QuestionsStore = new _QuestionsStore();
