import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { BansStore } from '../db/stores';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// List all banned IPs
app.get('/', async (c) => {
  const bans = await BansStore.getAll();
  return c.json({ success: true, data: bans });
});

// Check if IP is banned
app.get('/check/:ip', async (c) => {
  const ip = c.req.param('ip');
  const isBanned = await BansStore.isBanned(ip);
  return c.json({ success: true, data: { ip, isBanned } });
});

// Ban an IP
app.post('/', async (c) => {
  const body = await c.req.json<{ ip: string; reason?: string }>();
  const userEmail = c.get('userEmail');

  if (!body.ip) {
    return c.json({ success: false, error: 'IP address required' }, 400);
  }

  // Basic IP validation
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipPattern.test(body.ip)) {
    return c.json({ success: false, error: 'Invalid IP address format' }, 400);
  }

  await BansStore.ban(body.ip, body.reason || null, userEmail);
  return c.json({ success: true }, 201);
});

// Unban an IP
app.delete('/:ip', async (c) => {
  const ip = c.req.param('ip');

  const success = await BansStore.unban(ip);

  if (!success) {
    return c.json({ success: false, error: 'IP not found in ban list' }, 404);
  }

  return c.json({ success: true });
});

export { app as banRoutes };
