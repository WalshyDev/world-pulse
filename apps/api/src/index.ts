import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types';
import { questionRoutes } from './routes/questions';
import { voteRoutes } from './routes/votes';
import { userRoutes } from './routes/user';
import { wsRoutes } from './routes/websocket';
import { queueRoutes } from './routes/queue';
import { shareRoutes } from './routes/share';
import { rotateQuestion } from './lib/scheduled';
import { analyticsMiddleware } from './routes/middleware';

// Export Durable Objects
export { VoteAggregator } from './durable-objects/VoteAggregator';
export { CountryVotes } from './durable-objects/CountryVotes';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', analyticsMiddleware);
app.use('*', logger());
app.use('/api/*', cors());

// API Routes
app.route('/api/question', questionRoutes);
app.route('/api/vote', voteRoutes);
app.route('/api/votes', voteRoutes);
app.route('/api/user', userRoutes);
app.route('/api/ws', wsRoutes);
app.route('/api/queue', queueRoutes);
app.route('/api/share', shareRoutes);

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.onError((err, ctx) => {
  console.error('Error occurred:', err);
  ctx.get('analytics').setData({ error: err.message.substring(0, 100) || 'Unknown error' });

  return ctx.json({ error: 'Internal Server Error' }, 500);
});
app.notFound((ctx) => ctx.json({ error: 'Not Found' }, 404));

// Export with scheduled handler
export default {
  fetch: app.fetch,
  async scheduled(_: ScheduledEvent, env: Env) {
    await rotateQuestion(env);
  },
};
