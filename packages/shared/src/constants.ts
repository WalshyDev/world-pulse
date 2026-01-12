// Color palette for vote options
export const OPTION_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
] as const;

// Achievement definitions
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_vote',
    name: 'First Vote',
    description: 'Cast your first vote on WorldPulse',
    icon: '🗳️',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Voted in the first hour of a question',
    icon: '🌅',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Voted in the final hour of a question',
    icon: '🦉',
  },
  {
    id: 'week_streak',
    name: 'Week Warrior',
    description: '7-day voting streak',
    icon: '🔥',
  },
  {
    id: 'contrarian',
    name: 'Contrarian',
    description: 'Voted with the <10% minority',
    icon: '🎭',
  },
  {
    id: 'mainstream',
    name: 'Mainstream',
    description: 'Voted with the majority 10 times',
    icon: '📊',
  },
  {
    id: 'globe_trotter',
    name: 'Globe Trotter',
    description: 'Voted from 5+ different countries',
    icon: '🌍',
  },
];

// Legacy format for backwards compatibility
export const ACHIEVEMENTS = {
  FIRST_VOTE: ACHIEVEMENT_DEFS[0],
  EARLY_BIRD: ACHIEVEMENT_DEFS[1],
  NIGHT_OWL: ACHIEVEMENT_DEFS[2],
  WEEK_WARRIOR: ACHIEVEMENT_DEFS[3],
  CONTRARIAN: ACHIEVEMENT_DEFS[4],
  MAINSTREAM: ACHIEVEMENT_DEFS[5],
  GLOBE_TROTTER: ACHIEVEMENT_DEFS[6],
} as const;

// Seed questions for launch
export const SEED_QUESTIONS = [
  {
    text: 'Pineapple on pizza?',
    options: ['Yes, delicious!', 'No, never!'],
  },
  {
    text: 'Is a hot dog a sandwich?',
    options: ['Yes', 'No'],
  },
  {
    text: 'Morning person or night owl?',
    options: ['Morning person', 'Night owl'],
  },
  {
    text: 'Cats or dogs?',
    options: ['Cats', 'Dogs'],
  },
  {
    text: 'Is water wet?',
    options: ['Yes', 'No'],
  },
  {
    text: 'Toilet paper: over or under?',
    options: ['Over', 'Under'],
  },
  {
    text: 'Would you take a one-way trip to Mars?',
    options: ['Yes, adventure awaits!', 'No, Earth is home'],
  },
] as const;
