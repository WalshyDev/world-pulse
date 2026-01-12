import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { QuestionsStore, VotesStore } from '../db/stores';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Generate or retrieve share card image
app.get('/:questionId/:optionId', async (c) => {
  const { SHARE_CARDS } = c.env;

  const questionId = c.req.param('questionId');
  const optionId = c.req.param('optionId');
  const cacheKey = `${questionId}-${optionId}.svg`;

  // Try to get from R2 cache first
  const cached = await SHARE_CARDS.get(cacheKey);
  if (cached) {
    const body = await cached.arrayBuffer();
    return new Response(body, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Fetch question and vote data
  const question = await QuestionsStore.getById(questionId);
  if (!question) {
    return c.json({ success: false, error: 'Question not found' }, 404);
  }

  const options = await QuestionsStore.getOptions(questionId);
  const voteCounts = await VotesStore.getCounts(questionId);

  const userOption = options.find((o) => o.id === optionId);
  if (!userOption) {
    return c.json({ success: false, error: 'Option not found' }, 404);
  }

  // Calculate percentages
  const total = voteCounts.reduce((sum, v) => sum + v.count, 0);
  const optionResults = options.map((opt) => {
    const count = voteCounts.find((v) => v.optionId === opt.id)?.count || 0;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return { ...opt, count, percentage };
  });

  // Generate SVG
  const svg = generateShareCardSVG(question.text, optionResults, optionId);

  // Store in R2
  await SHARE_CARDS.put(cacheKey, svg, {
    httpMetadata: { contentType: 'image/svg+xml' },
  });

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

// Generate Open Graph metadata page for sharing
app.get('/:questionId/:optionId/og', async (c) => {
  const questionId = c.req.param('questionId');
  const optionId = c.req.param('optionId');

  const question = await QuestionsStore.getById(questionId);
  if (!question) {
    return c.redirect('/');
  }

  const options = await QuestionsStore.getOptions(questionId);
  const userOption = options.find((o) => o.id === optionId);
  const voteCounts = await VotesStore.getCounts(questionId);
  const total = voteCounts.reduce((sum, v) => sum + v.count, 0);
  const userVoteCount = voteCounts.find((v) => v.optionId === optionId)?.count || 0;
  const userPercentage = total > 0 ? Math.round((userVoteCount / total) * 100) : 0;

  // Use X-Forwarded-Host or Host header for correct URL in proxied environments
  const forwardedHost = c.req.header('X-Forwarded-Host');
  const forwardedProto = c.req.header('X-Forwarded-Proto') || 'https';
  const host = forwardedHost || c.req.header('Host') || new URL(c.req.url).host;
  const protocol = forwardedHost ? forwardedProto : new URL(c.req.url).protocol.replace(':', '');
  const baseUrl = `${protocol}://${host}`;
  const imageUrl = `${baseUrl}/api/share/${questionId}/${optionId}`;

  const description = userOption
    ? `I voted "${userOption.text}" (${userPercentage}%) on WorldPulse!`
    : 'Join the global conversation!';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${question.text} - WorldPulse</title>
  <meta property="og:title" content="${escapeHtml(question.text)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(question.text)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${imageUrl}">
  <meta http-equiv="refresh" content="0; url=/">
</head>
<body>
  <p>Redirecting to WorldPulse...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
});

function generateShareCardSVG(
  questionText: string,
  options: { id: string; text: string; color: string; percentage: number }[],
  userOptionId: string,
): string {
  const width = 1200;
  const height = 630;

  // Sort options by percentage descending
  const sortedOptions = [...options].sort((a, b) => b.percentage - a.percentage);

  // Escape text for SVG
  const safeQuestion = escapeHtml(questionText);

  // Generate option bars
  const barHeight = 50;
  const barGap = 16;
  const barStartY = 280;
  const barMaxWidth = 900;

  const optionBars = sortedOptions
    .map((opt, i) => {
      const y = barStartY + i * (barHeight + barGap);
      const barWidth = Math.max(10, (opt.percentage / 100) * barMaxWidth);
      const isUserVote = opt.id === userOptionId;
      const safeText = escapeHtml(opt.text);

      return `
      <g>
        <!-- Background bar -->
        <rect x="150" y="${y}" width="${barMaxWidth}" height="${barHeight}" rx="8" fill="#1E293B" />
        <!-- Progress bar -->
        <rect x="150" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" fill="${opt.color}" opacity="0.8" />
        <!-- Option text -->
        <text x="170" y="${y + 32}" font-family="system-ui, sans-serif" font-size="20" fill="white" font-weight="${isUserVote ? 'bold' : 'normal'}">
          ${safeText}${isUserVote ? ' (My vote)' : ''}
        </text>
        <!-- Percentage -->
        <text x="${150 + barMaxWidth + 20}" y="${y + 32}" font-family="system-ui, sans-serif" font-size="24" fill="white" font-weight="bold">
          ${opt.percentage}%
        </text>
      </g>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F172A" />
      <stop offset="100%" style="stop-color:#1E293B" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />

  <!-- Logo -->
  <text x="150" y="80" font-family="system-ui, sans-serif" font-size="32" fill="white" font-weight="bold">
    World<tspan fill="#3B82F6">Pulse</tspan>
  </text>

  <!-- Question -->
  <text x="150" y="180" font-family="system-ui, sans-serif" font-size="40" fill="white" font-weight="bold">
    ${wrapText(safeQuestion, 50)}
  </text>

  <!-- Option bars -->
  ${optionBars}

  <!-- Footer -->
  <text x="${width / 2}" y="${height - 40}" font-family="system-ui, sans-serif" font-size="18" fill="#64748B" text-anchor="middle">
    worldpulse.quickbyte.games - One question. One day. One world.
  </text>
</svg>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  // For SVG, we need tspan elements for multiple lines
  if (lines.length === 1) return lines[0];

  return lines
    .map((line, i) => (i === 0 ? line : `<tspan x="150" dy="50">${line}</tspan>`))
    .join('');
}

export { app as shareRoutes };
