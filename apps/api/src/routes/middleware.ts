import { Context, Next } from 'hono';
import { Analytics } from '../analytics';
import { Env, Variables } from '../types';
import { routePath } from 'hono/route';

export async function analyticsMiddleware(
  ctx: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  const analytics = new Analytics();

  const clientIP = ctx.req.header('CF-Connecting-IP') || 'unknown';
  const countryCode = ctx.req.header('CF-IPCountry') || 'XX';

  ctx.set('clientIP', clientIP);
  ctx.set('countryCode', countryCode);
  ctx.set('analytics', analytics);

  analytics.setData({
    indexId: clientIP || '',
    method: ctx.req.method,
    path: routePath(ctx),
    ip: clientIP || 'unknown',
    country: countryCode || 'XX',
    userAgent: ctx.req.header('User-Agent') || 'unknown',
    referrer: ctx.req.header('Referer') || 'unknown',
  });

  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  analytics.setData({
    path: routePath(ctx),
    responseTimeMs: duration,
    status: ctx.res.status,
  });

  analytics.write();
}
