import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import type { ApiResponse, GlobalVotes, Achievement } from '@world-pulse/shared';
import { VotesStore, QuestionsStore, BansStore } from '../db/stores';
import { checkAndGrantAchievements, checkVoteBasedAchievements } from '../lib/achievements';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Check if user has voted on a question
app.get('/:questionId/check', async (c) => {
  const clientIP = c.get('clientIP');
  const questionId = c.req.param('questionId');

  const optionId = await VotesStore.getUserVote(questionId, clientIP);

  return c.json<ApiResponse<{ voted: boolean; optionId: string | null }>>({
    success: true,
    data: {
      voted: optionId !== null,
      optionId,
    },
  });
});

// Submit a vote
app.post('/', async (c) => {
  const { VOTE_AGGREGATOR, COUNTRY_VOTES, CACHE } = c.env;

  const clientIP = c.get('clientIP');
  const countryCode = c.get('countryCode');

  const body = await c.req.json<{ questionId: string; optionId: string }>();

  if (!body.questionId || !body.optionId) {
    return c.json<ApiResponse<never>>({ success: false, error: 'Missing questionId or optionId' }, 400);
  }

  // Check if user is banned (with cache)
  const banCacheKey = `ban:${clientIP}`;
  const cachedBan = await CACHE.get(banCacheKey);
  const isBanned = cachedBan === 'true' ? true : cachedBan === 'false' ? false : await BansStore.isBanned(clientIP);
  if (cachedBan === null) {
    // Cache ban status for 5 minutes
    await CACHE.put(banCacheKey, isBanned ? 'true' : 'false', { expirationTtl: 300 });
  }
  if (isBanned) {
    return c.json<ApiResponse<never>>({ success: false, error: 'You have been banned from voting' }, 403);
  }

  // Check if already voted (by IP) - with cache
  const votedCacheKey = `voted:${body.questionId}:${clientIP}`;
  const cachedVoted = await CACHE.get(votedCacheKey);
  if (cachedVoted === 'true') {
    return c.json<ApiResponse<never>>({ success: false, error: 'Already voted' }, 409);
  }
  const hasVoted = await VotesStore.hasUserVoted(body.questionId, clientIP);
  if (hasVoted) {
    await CACHE.put(votedCacheKey, 'true', { expirationTtl: 86400 }); // Cache for 24h
    return c.json<ApiResponse<never>>({ success: false, error: 'Already voted' }, 409);
  }

  // Record vote in D1
  await VotesStore.create(body.questionId, body.optionId, countryCode, clientIP);

  // Mark as voted in cache
  await CACHE.put(votedCacheKey, 'true', { expirationTtl: 86400 });

  // Update country-level Durable Object via RPC
  const countryDoId = COUNTRY_VOTES.idFromName(`${body.questionId}:${countryCode}`);
  const countryStub = COUNTRY_VOTES.get(countryDoId);
  await countryStub.vote(body.optionId);

  // Update global aggregator via RPC
  const aggregatorId = VOTE_AGGREGATOR.idFromName(body.questionId);
  const aggregatorStub = VOTE_AGGREGATOR.get(aggregatorId);
  const votes = await aggregatorStub.vote(body.optionId, countryCode);

  // Clear cached data
  await CACHE.delete(`votes:${body.questionId}`);
  await CACHE.delete(`user-stats:${clientIP}`);

  // Check and grant achievements
  const question = await QuestionsStore.getById(body.questionId);
  const { newAchievements } = await checkAndGrantAchievements(
    clientIP,
    body.questionId,
    body.optionId,
    countryCode,
    question?.activeFrom || null,
    question?.activeTo || null,
  );

  // Check vote-percentage-based achievements
  const optionVotes = votes.options.find((o) => o.optionId === body.optionId)?.count || 0;
  const additionalAchievements = await checkVoteBasedAchievements(
    clientIP,
    body.optionId,
    votes.totalVotes,
    optionVotes,
  );

  const allNewAchievements = [...newAchievements, ...additionalAchievements];

  return c.json<ApiResponse<{ votes: GlobalVotes; newAchievements: Achievement[] }>>({
    success: true,
    data: { votes, newAchievements: allNewAchievements },
  });
});

// Get votes for a question
app.get('/:questionId', async (c) => {
  const { VOTE_AGGREGATOR, CACHE } = c.env;
  const questionId = c.req.param('questionId');

  // Try cache first
  const cached = await CACHE.get(`votes:${questionId}`, 'json');
  if (cached) {
    return c.json<ApiResponse<GlobalVotes>>({ success: true, data: cached as GlobalVotes });
  }

  // Get from Durable Object via RPC
  const aggregatorId = VOTE_AGGREGATOR.idFromName(questionId);
  const aggregatorStub = VOTE_AGGREGATOR.get(aggregatorId);
  const votes = await aggregatorStub.getVotes();

  // Cache for 60 seconds (KV minimum TTL)
  await CACHE.put(`votes:${questionId}`, JSON.stringify(votes), { expirationTtl: 60 });

  return c.json<ApiResponse<GlobalVotes>>({ success: true, data: votes });
});

export { app as voteRoutes };
