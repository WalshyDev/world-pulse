import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { StatsStore } from '../db/stores';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get overview stats
app.get('/overview', async (c) => {
  const stats = await StatsStore.getOverview();
  return c.json({ success: true, data: stats });
});

// Get country breakdown
app.get('/countries', async (c) => {
  const stats = await StatsStore.getCountryStats();
  return c.json({ success: true, data: stats });
});

// Get stats for a specific question
app.get('/questions/:id', async (c) => {
  const id = c.req.param('id');
  const stats = await StatsStore.getQuestionStats(id);

  if (!stats) {
    return c.json({ success: false, error: 'Question not found' }, 404);
  }

  return c.json({ success: true, data: stats });
});

// Get recent votes
app.get('/votes/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const votes = await StatsStore.getRecentVotes(Math.min(limit, 100));
  return c.json({ success: true, data: votes });
});

export { app as statsRoutes };
