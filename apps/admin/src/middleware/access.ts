import type { Context, Next } from 'hono';
import type { Env, Variables, AccessJWTPayload } from '../types';

// Cloudflare Access public keys endpoint
// Update this to match your Access team name in Cloudflare Zero Trust dashboard
const CERTS_URL = 'https://walshy.cloudflareaccess.com/cdn-cgi/access/certs';

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  e: string;
  n: string;
}

interface CertsResponse {
  keys: JWK[];
  public_cert: { kid: string; cert: string };
  public_certs: { kid: string; cert: string }[];
}

let cachedKeys: Map<string, CryptoKey> | null = null;
let cacheExpiry = 0;

async function getPublicKeys(): Promise<Map<string, CryptoKey>> {
  const now = Date.now();

  // Cache keys for 1 hour
  if (cachedKeys && now < cacheExpiry) {
    return cachedKeys;
  }

  const response = await fetch(CERTS_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Access public keys');
  }

  const data = await response.json() as CertsResponse;
  const keys = new Map<string, CryptoKey>();

  for (const jwk of data.keys) {
    const key = await crypto.subtle.importKey(
      'jwk',
      {
        kty: jwk.kty,
        e: jwk.e,
        n: jwk.n,
        alg: jwk.alg,
        use: jwk.use,
      },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    keys.set(jwk.kid, key);
  }

  cachedKeys = keys;
  cacheExpiry = now + 60 * 60 * 1000; // 1 hour

  return keys;
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyJWT(token: string): Promise<AccessJWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode header to get kid
  const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
  const header = JSON.parse(headerJson) as { kid: string; alg: string };

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported algorithm');
  }

  // Get public keys
  const keys = await getPublicKeys();
  const key = keys.get(header.kid);

  if (!key) {
    throw new Error('Unknown key ID');
  }

  // Verify signature
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature.buffer as ArrayBuffer,
    signedData,
  );

  if (!valid) {
    throw new Error('Invalid signature');
  }

  // Decode and validate payload
  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
  const payload = JSON.parse(payloadJson) as AccessJWTPayload;

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error('Token expired');
  }

  if (payload.nbf > now) {
    throw new Error('Token not yet valid');
  }

  return payload;
}

export async function accessMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next,
) {
  // Skip auth in development if no CF-Access-JWT-Assertion header
  const jwt = c.req.header('CF-Access-JWT-Assertion');

  if (!jwt) {
    // In development, allow access without JWT but set a placeholder email
    if (c.req.header('Host')?.includes('localhost')) {
      c.set('userEmail', 'dev@localhost');
      return next();
    }

    return c.json({ error: 'Unauthorized - No Access token' }, 401);
  }

  try {
    const payload = await verifyJWT(jwt);
    c.set('userEmail', payload.email);
    return next();
  } catch (error) {
    console.error('Access JWT validation failed:', error);
    return c.json({ error: 'Unauthorized - Invalid Access token' }, 401);
  }
}
