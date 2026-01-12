import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import type { Question, ApiResponse, GlobalVotes } from '@world-pulse/shared';
import { QuestionsStore, VotesStore } from '../db/stores';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

interface QuestionWithVotes extends Question {
  votes: GlobalVotes;
}

// Get archived questions with vote results
app.get('/history', async (c) => {
  const questions = await QuestionsStore.getArchived(20);

  // Fetch vote counts for each question
  const questionsWithVotes: QuestionWithVotes[] = await Promise.all(
    questions.map(async (q) => {
      const voteCounts = await VotesStore.getCounts(q.id);
      const totalVotes = voteCounts.reduce((sum, v) => sum + v.count, 0);

      return {
        ...q,
        votes: {
          questionId: q.id,
          totalVotes,
          options: q.options.map((opt) => ({
            optionId: opt.id,
            count: voteCounts.find((v) => v.optionId === opt.id)?.count || 0,
          })),
          byCountry: [],
          lastUpdated: q.activeTo || new Date().toISOString(),
        },
      };
    }),
  );

  return c.json<ApiResponse<QuestionWithVotes[]>>({ success: true, data: questionsWithVotes });
});

// Get current active question
app.get('/current', async (c) => {
  const { CACHE } = c.env;

  // Try cache first
  const cached = await CACHE.get('current-question', 'json');
  if (cached) {
    return c.json<ApiResponse<Question>>({ success: true, data: cached as Question });
  }

  const question = await QuestionsStore.getCurrentQuestion();

  if (!question) {
    return c.json<ApiResponse<Question>>({ success: false, error: 'No active question' }, 404);
  }

  // Cache until question expires (or 24h max)
  const expiresAt = question.activeTo ? new Date(question.activeTo).getTime() : Date.now() + 86400000;
  const ttl = Math.min(Math.max(Math.floor((expiresAt - Date.now()) / 1000), 60), 86400);
  await CACHE.put('current-question', JSON.stringify(question), { expirationTtl: ttl });

  return c.json<ApiResponse<Question>>({ success: true, data: question });
});

// Get question by ID
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const question = await QuestionsStore.getById(id);

  if (!question) {
    return c.json<ApiResponse<Question>>({ success: false, error: 'Question not found' }, 404);
  }

  return c.json<ApiResponse<Question>>({ success: true, data: question });
});

// Admin: Create a new question
app.post('/', async (c) => {
  const body = await c.req.json<{ text: string; options: string[] }>();

  if (!body.text || !body.options || body.options.length < 2) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Invalid question data' }, 400);
  }

  const id = await QuestionsStore.create(body.text, body.options);

  return c.json<ApiResponse<{ id: string }>>({ success: true, data: { id } }, 201);
});

// Admin: Activate a question
app.post('/:id/activate', async (c) => {
  const { CACHE } = c.env;
  const id = c.req.param('id');

  // Calculate end time (midnight UTC tomorrow)
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));

  await QuestionsStore.activate(id, tomorrow);

  // Clear cache
  await CACHE.delete('current-question');

  return c.json<ApiResponse<{ success: true }>>({ success: true });
});

export { app as questionRoutes };
