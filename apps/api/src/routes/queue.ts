import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import type { ApiResponse } from '@world-pulse/shared';
import { filterContentWithAI, QUESTION_MAX_LENGTH, OPTION_MAX_LENGTH } from '../lib/content-filter';
import { QueueStore, BansStore } from '../db/stores';

interface QueueSubmission {
  id: string;
  text: string;
  options: string[];
  upvotes: number;
  submittedAt: string;
}

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get question queue (pending submissions sorted by upvotes)
app.get('/', async (c) => {
  const clientIP = c.get('clientIP');

  const [submissions, upvotedIds, pendingCount] = await Promise.all([
    QueueStore.getSubmissions(50),
    QueueStore.getUserUpvotedIds(clientIP),
    QueueStore.getPendingCount(clientIP),
  ]);

  const items = submissions.map((submission: QueueSubmission) => ({
    ...submission,
    userUpvoted: upvotedIds.has(submission.id),
  }));

  return c.json<ApiResponse<{ submissions: typeof items; hasSubmitted: boolean }>>({
    success: true,
    data: {
      submissions: items,
      hasSubmitted: pendingCount > 0,
    },
  });
});

// Submit a new question
app.post('/', async (c) => {
  const { AI } = c.env;

  const clientIP = c.get('clientIP');

  const body = await c.req.json<{ text: string; options: string[] }>();

  if (!body.text || !body.options || body.options.length < 2) {
    return c.json<ApiResponse<never>>(
      { success: false, error: 'Question must have text and at least 2 options' },
      400,
    );
  }

  if (body.text.length > QUESTION_MAX_LENGTH) {
    return c.json<ApiResponse<never>>(
      { success: false, error: `Question too long (max ${QUESTION_MAX_LENGTH} characters)` },
      400,
    );
  }

  if (body.options.some((o) => o.length > OPTION_MAX_LENGTH)) {
    return c.json<ApiResponse<never>>(
      { success: false, error: `Options too long (max ${OPTION_MAX_LENGTH} characters each)` },
      400,
    );
  }

  // Check if user is banned (with cache)
  const { CACHE } = c.env;
  const banCacheKey = `ban:${clientIP}`;
  const cachedBan = await CACHE.get(banCacheKey);
  const isBanned = cachedBan === 'true' ? true : cachedBan === 'false' ? false : await BansStore.isBanned(clientIP);
  if (cachedBan === null) {
    await CACHE.put(banCacheKey, isBanned ? 'true' : 'false', { expirationTtl: 300 });
  }
  if (isBanned) {
    return c.json<ApiResponse<never>>(
      { success: false, error: 'You have been banned from submitting questions' },
      403,
    );
  }

  // Rate limit: only 1 pending question per IP at a time
  // Check this before AI to save on AI calls for rate-limited users
  const pendingCount = await QueueStore.getPendingCount(clientIP);
  if (pendingCount >= 1) {
    return c.json<ApiResponse<never>>(
      { success: false, error: 'You already have a question in the queue' },
      429,
    );
  }

  // AI-powered content filtering
  const filterResult = await filterContentWithAI(AI, body.text, body.options);
  if (!filterResult.allowed) {
    return c.json<ApiResponse<never>>(
      { success: false, error: filterResult.reason || 'Question not allowed' },
      400,
    );
  }

  const id = await QueueStore.createSubmission(body.text, body.options, clientIP);

  return c.json<ApiResponse<{ id: string }>>({ success: true, data: { id } }, 201);
});

// Upvote a submission
app.post('/:id/upvote', async (c) => {
  const { CACHE } = c.env;
  const clientIP = c.get('clientIP');
  const submissionId = c.req.param('id');

  // Check if user is banned (with cache)
  const banCacheKey = `ban:${clientIP}`;
  const cachedBan = await CACHE.get(banCacheKey);
  const isBanned = cachedBan === 'true' ? true : cachedBan === 'false' ? false : await BansStore.isBanned(clientIP);
  if (cachedBan === null) {
    await CACHE.put(banCacheKey, isBanned ? 'true' : 'false', { expirationTtl: 300 });
  }
  if (isBanned) {
    return c.json<ApiResponse<never>>(
      { success: false, error: 'You have been banned' },
      403,
    );
  }

  // Check if already upvoted
  const hasUpvoted = await QueueStore.hasUpvoted(submissionId, clientIP);
  if (hasUpvoted) {
    return c.json<ApiResponse<never>>(
      { success: false, error: 'Already upvoted' },
      409,
    );
  }

  await QueueStore.upvote(submissionId, clientIP);

  return c.json<ApiResponse<{ success: true }>>({ success: true });
});

export { app as queueRoutes };
