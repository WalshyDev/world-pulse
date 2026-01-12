import type { D1Database, KVNamespace, R2Bucket, Ai } from '@cloudflare/workers-types';
import type { VoteAggregator } from './durable-objects/VoteAggregator';
import type { CountryVotes } from './durable-objects/CountryVotes';

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace for caching
  CACHE: KVNamespace;

  // R2 Bucket for share cards
  SHARE_CARDS: R2Bucket;

  // Workers AI
  AI: Ai;

  // Durable Objects with RPC
  VOTE_AGGREGATOR: DurableObjectNamespace<VoteAggregator>;
  COUNTRY_VOTES: DurableObjectNamespace<CountryVotes>;

  // Assets binding (for serving frontend)
  ASSETS: Fetcher;

  ANALYTICS: AnalyticsEngineDataset;
}

export interface Variables {
  clientIP: string;
  countryCode: string;
  analytics: import('./analytics').Analytics;
}
