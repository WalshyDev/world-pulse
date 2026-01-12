import type { D1Database, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  // D1 Database (shared with main API)
  DB: D1Database;

  // KV Namespace for caching
  CACHE: KVNamespace;

  // Assets binding (for serving frontend)
  ASSETS: Fetcher;
}

export interface Variables {
  // User email from Access JWT
  userEmail: string;
}

// Access JWT payload structure
export interface AccessJWTPayload {
  aud: string[];
  email: string;
  exp: number;
  iat: number;
  nbf: number;
  iss: string;
  type: string;
  identity_nonce: string;
  sub: string;
  country: string;
}
