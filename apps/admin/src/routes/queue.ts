import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { AdminQueueStore } from '../db/stores';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// List all submissions
app.get('/', async (c) => {
  const status = c.req.query('status');
  const submissions = await AdminQueueStore.getAll(status);
  return c.json({ success: true, data: submissions });
});

// Approve submission
app.post('/:id/approve', async (c) => {
  const id = c.req.param('id');

  const success = await AdminQueueStore.approve(id);

  if (!success) {
    return c.json({ success: false, error: 'Submission not found' }, 404);
  }

  return c.json({ success: true });
});

// Reject submission
app.post('/:id/reject', async (c) => {
  const id = c.req.param('id');

  const success = await AdminQueueStore.reject(id);

  if (!success) {
    return c.json({ success: false, error: 'Submission not found' }, 404);
  }

  return c.json({ success: true });
});

// Promote submission to active question
app.post('/:id/promote', async (c) => {
  const { CACHE } = c.env;
  const id = c.req.param('id');

  const questionId = await AdminQueueStore.promoteToQuestion(id);

  if (!questionId) {
    return c.json({ success: false, error: 'Submission not found' }, 404);
  }

  // Clear cache
  await CACHE.delete('current-question');

  return c.json({ success: true, data: { questionId } });
});

// Delete submission
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const success = await AdminQueueStore.delete(id);

  if (!success) {
    return c.json({ success: false, error: 'Submission not found' }, 404);
  }

  return c.json({ success: true });
});

export { app as queueRoutes };
