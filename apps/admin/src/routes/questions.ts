import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { AdminQuestionsStore } from '../db/stores';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// List all questions
app.get('/', async (c) => {
  const status = c.req.query('status');
  const questions = await AdminQuestionsStore.getAll(status);
  return c.json({ success: true, data: questions });
});

// Get single question
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const question = await AdminQuestionsStore.getById(id);

  if (!question) {
    return c.json({ success: false, error: 'Question not found' }, 404);
  }

  return c.json({ success: true, data: question });
});

// Create question
app.post('/', async (c) => {
  const body = await c.req.json<{ text: string; options: string[] }>();

  if (!body.text || !body.options || body.options.length < 2) {
    return c.json({ success: false, error: 'Text and at least 2 options required' }, 400);
  }

  const id = await AdminQuestionsStore.create(body.text, body.options);
  return c.json({ success: true, data: { id } }, 201);
});

// Update question
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ text: string; options: string[] }>();

  if (!body.text || !body.options || body.options.length < 2) {
    return c.json({ success: false, error: 'Text and at least 2 options required' }, 400);
  }

  const success = await AdminQuestionsStore.update(id, body.text, body.options);

  if (!success) {
    return c.json({ success: false, error: 'Question not found' }, 404);
  }

  return c.json({ success: true });
});

// Activate question
app.post('/:id/activate', async (c) => {
  const { CACHE } = c.env;
  const id = c.req.param('id');

  const success = await AdminQuestionsStore.activate(id);

  if (!success) {
    return c.json({ success: false, error: 'Question not found' }, 404);
  }

  // Clear cache
  await CACHE.delete('current-question');

  return c.json({ success: true });
});

// Archive question
app.post('/:id/archive', async (c) => {
  const { CACHE } = c.env;
  const id = c.req.param('id');

  const success = await AdminQuestionsStore.archive(id);

  if (!success) {
    return c.json({ success: false, error: 'Question not found' }, 404);
  }

  // Clear cache
  await CACHE.delete('current-question');

  return c.json({ success: true });
});

// Delete pending question
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  const success = await AdminQuestionsStore.delete(id);

  if (!success) {
    return c.json({ success: false, error: 'Question not found or not pending' }, 404);
  }

  return c.json({ success: true });
});

export { app as questionRoutes };
