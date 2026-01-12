import { VotesStore, AchievementsStore } from '../db/stores';
import type { Achievement } from '@world-pulse/shared';

interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

const ACHIEVEMENT_DEFS: Record<string, AchievementDef> = {
  early_bird: {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Voted within the first hour of a question',
  },
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Voted in the final hour of a question',
  },
  contrarian: {
    id: 'contrarian',
    name: 'Contrarian',
    description: 'Voted with less than 10% of respondents',
  },
  mainstream: {
    id: 'mainstream',
    name: 'Mainstream',
    description: 'Voted with the majority 10 times',
  },
  globe_trotter: {
    id: 'globe_trotter',
    name: 'Globe Trotter',
    description: 'Voted from 5+ different countries',
  },
  first_vote: {
    id: 'first_vote',
    name: 'First Vote',
    description: 'Cast your first vote on WorldPulse',
  },
  week_streak: {
    id: 'week_streak',
    name: 'Week Warrior',
    description: 'Voted 7 days in a row',
  },
};

interface CheckResult {
  newAchievements: Achievement[];
}

export async function checkAndGrantAchievements(
  voterIp: string,
  questionId: string,
  optionId: string,
  countryCode: string,
  activeFrom: string | null,
  activeTo: string | null,
): Promise<CheckResult> {
  const newAchievements: Achievement[] = [];

  // Get existing achievements
  const existingAchievements = await AchievementsStore.getByUser(voterIp);
  const existingIds = new Set(existingAchievements.map((a) => a.name));

  // Helper to grant an achievement
  const grant = async (def: AchievementDef) => {
    if (existingIds.has(def.name)) return;

    await AchievementsStore.create(voterIp, def.name, def.description);
    newAchievements.push({
      id: def.id,
      name: def.name,
      description: def.description,
      unlockedAt: new Date().toISOString(),
    });
    existingIds.add(def.name);
  };

  // First Vote - check if this is their first vote ever
  const voteHistory = await VotesStore.getUserHistory(voterIp);
  if (voteHistory.length === 1) {
    await grant(ACHIEVEMENT_DEFS.first_vote);
  }

  // Early Bird - voted in first hour
  if (activeFrom && !existingIds.has('Early Bird')) {
    const questionStart = new Date(activeFrom).getTime();
    const now = Date.now();
    const oneHourAfterStart = questionStart + 60 * 60 * 1000;

    if (now <= oneHourAfterStart) {
      await grant(ACHIEVEMENT_DEFS.early_bird);
    }
  }

  // Night Owl - voted in final hour
  if (activeTo && !existingIds.has('Night Owl')) {
    const questionEnd = new Date(activeTo).getTime();
    const now = Date.now();
    const oneHourBeforeEnd = questionEnd - 60 * 60 * 1000;

    if (now >= oneHourBeforeEnd) {
      await grant(ACHIEVEMENT_DEFS.night_owl);
    }
  }

  // Week Streak - voted 7 days in a row (check from vote history)
  if (!existingIds.has('Week Warrior') && voteHistory.length >= 7) {
    // Group votes by question start date
    const voteDates = new Set<string>();
    for (const vote of voteHistory) {
      if (vote.activeFrom) {
        const date = vote.activeFrom.split('T')[0];
        voteDates.add(date);
      }
    }

    // Check for 7 consecutive days
    const sortedDates = [...voteDates].sort().reverse();
    let streak = 1;
    for (let i = 1; i < sortedDates.length && streak < 7; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 7) {
      await grant(ACHIEVEMENT_DEFS.week_streak);
    }
  }

  // Globe Trotter - voted from 5+ countries
  if (!existingIds.has('Globe Trotter')) {
    const countriesVotedFrom = await VotesStore.getCountriesVotedFrom(voterIp);
    if (countriesVotedFrom.size >= 5) {
      await grant(ACHIEVEMENT_DEFS.globe_trotter);
    }
  }

  return { newAchievements };
}

// Check vote-percentage-based achievements (called after vote is aggregated)
export async function checkVoteBasedAchievements(
  voterIp: string,
  optionId: string,
  totalVotes: number,
  optionVotes: number,
): Promise<Achievement[]> {
  const newAchievements: Achievement[] = [];

  const existingAchievements = await AchievementsStore.getByUser(voterIp);
  const existingIds = new Set(existingAchievements.map((a) => a.name));

  const grant = async (def: AchievementDef) => {
    if (existingIds.has(def.name)) return;

    await AchievementsStore.create(voterIp, def.name, def.description);
    newAchievements.push({
      id: def.id,
      name: def.name,
      description: def.description,
      unlockedAt: new Date().toISOString(),
    });
    existingIds.add(def.name);
  };

  if (totalVotes > 0) {
    const percentage = (optionVotes / totalVotes) * 100;

    // Contrarian - voted with <10%
    if (!existingIds.has('Contrarian') && percentage < 10) {
      await grant(ACHIEVEMENT_DEFS.contrarian);
    }

    // Mainstream - count majority votes
    if (!existingIds.has('Mainstream') && percentage > 50) {
      // Check how many times they've voted with the majority
      const majorityCount = await AchievementsStore.getMajorityVoteCount(voterIp);
      if (majorityCount >= 10) {
        await grant(ACHIEVEMENT_DEFS.mainstream);
      }
    }
  }

  return newAchievements;
}
