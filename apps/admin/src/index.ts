import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types';
import { accessMiddleware } from './middleware/access';
import { questionRoutes } from './routes/questions';
import { queueRoutes } from './routes/queue';
import { banRoutes } from './routes/bans';
import { statsRoutes } from './routes/stats';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// Access JWT validation for all API routes
app.use('/api/*', accessMiddleware);

// API Routes
app.route('/api/questions', questionRoutes);
app.route('/api/queue', queueRoutes);
app.route('/api/bans', banRoutes);
app.route('/api/stats', statsRoutes);

// Health check (no auth required for this)
app.get('/api/health', (c) => c.json({ status: 'ok', admin: true }));

// Who am I endpoint
app.get('/api/me', (c) => {
  return c.json({ email: c.get('userEmail') });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', async (c) => {
  const { ASSETS } = c.env;
  const url = new URL(c.req.url);

  // Try to serve the exact path first (for static assets)
  const response = await ASSETS.fetch(new Request(url.toString(), c.req.raw));

  // If 404 and not an API route, serve index.html for SPA routing
  if (response.status === 404 && !url.pathname.startsWith('/api/')) {
    return ASSETS.fetch(new Request(new URL('/', url.origin).toString(), c.req.raw));
  }

  return response;
});

export default app;
