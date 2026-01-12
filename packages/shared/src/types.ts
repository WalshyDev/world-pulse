// Question types
export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
  createdAt: string;
  activeFrom?: string | null;
  activeTo?: string | null;
  status: 'pending' | 'active' | 'archived';
}

export interface QuestionOption {
  id: string;
  text: string;
  color: string;
}

// Vote types
export interface Vote {
  questionId: string;
  optionId: string;
  countryCode: string;
  votedAt: string;
}

export interface VoteCount {
  optionId: string;
  count: number;
}

export interface CountryVotes {
  countryCode: string;
  votes: VoteCount[];
  total: number;
}

export interface GlobalVotes {
  questionId: string;
  totalVotes: number;
  options: VoteCount[];
  byCountry: CountryVotes[];
  lastUpdated: string;
}

// Question queue types
export interface QuestionSubmission {
  id: string;
  text: string;
  options: string[];
  submittedAt: string;
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
}

// User engagement types
export interface UserStats {
  streak: number;
  totalVotes: number;
  achievements: Achievement[];
  lastVotedAt: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// WebSocket message types
export interface WSMessage {
  type: 'vote_update' | 'question_change' | 'ping';
  payload: unknown;
}

export interface VoteUpdatePayload {
  questionId: string;
  countryCode: string;
  optionId: string;
  newTotals: GlobalVotes;
}
