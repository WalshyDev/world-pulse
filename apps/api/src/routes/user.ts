import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import type { ApiResponse, UserStats } from '@world-pulse/shared';
import { VotesStore, AchievementsStore } from '../db/stores';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get user stats (by IP)
app.get('/stats', async (c) => {
  const { CACHE } = c.env;
  const clientIP = c.get('clientIP');

  // Try cache first (keyed by IP hash for privacy)
  const cacheKey = `user-stats:${clientIP}`;
  const cached = await CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json<ApiResponse<UserStats>>({ success: true, data: cached as UserStats });
  }

  // Get vote history
  const voteHistory = await VotesStore.getUserHistory(clientIP);

  if (voteHistory.length === 0) {
    const emptyStats: UserStats = {
      streak: 0,
      totalVotes: 0,
      achievements: [],
      lastVotedAt: null,
    };
    return c.json<ApiResponse<UserStats>>({ success: true, data: emptyStats });
  }

  // Calculate streak
  let streak = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let checkDate = today;
  for (const vote of voteHistory) {
    const voteDate = new Date(vote.votedAt);
    voteDate.setUTCHours(0, 0, 0, 0);

    if (voteDate.getTime() === checkDate.getTime()) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (voteDate.getTime() < checkDate.getTime()) {
      break;
    }
  }

  // Get achievements
  const userAchievements = await AchievementsStore.getByUser(clientIP);

  const stats: UserStats = {
    streak,
    totalVotes: voteHistory.length,
    achievements: userAchievements,
    lastVotedAt: voteHistory[0]?.votedAt || null,
  };

  // Cache for 5 minutes (invalidated on vote)
  await CACHE.put(cacheKey, JSON.stringify(stats), { expirationTtl: 300 });

  return c.json<ApiResponse<UserStats>>({ success: true, data: stats });
});

export { app as userRoutes };
