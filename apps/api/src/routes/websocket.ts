import { Hono } from 'hono';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// WebSocket upgrade endpoint
app.get('/', async (c) => {
  const { VOTE_AGGREGATOR } = c.env;
  const questionId = c.req.query('questionId');

  if (!questionId) {
    return c.json({ error: 'Missing questionId' }, 400);
  }

  // Get the aggregator DO to handle the WebSocket
  const aggregatorId = VOTE_AGGREGATOR.idFromName(questionId);
  const aggregatorStub = VOTE_AGGREGATOR.get(aggregatorId);

  // Forward the upgrade request to the Durable Object
  return aggregatorStub.fetch(c.req.raw);
});

export { app as wsRoutes };
