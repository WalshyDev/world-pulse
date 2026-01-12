import { DurableObject } from 'cloudflare:workers';
import type { GlobalVotes, VoteCount, CountryVotes } from '@world-pulse/shared';
import type { Env } from '../types';

interface VoteState {
  questionId: string;
  options: Map<string, number>;
  byCountry: Map<string, Map<string, number>>;
  lastUpdated: string;
}

export class VoteAggregator extends DurableObject {
  private votes: VoteState | null = null;
  private sessions: Set<WebSocket> = new Set();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Load state from storage
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<VoteState>('votes');
      if (stored) {
        this.votes = {
          ...stored,
          options: new Map(Object.entries(stored.options || {})),
          byCountry: new Map(
            Object.entries(stored.byCountry || {}).map(([k, v]) => [
              k,
              new Map(Object.entries(v as Record<string, number>)),
            ]),
          ),
        };
      }
    });
  }

  async vote(optionId: string, countryCode: string): Promise<GlobalVotes> {
    // Initialize if needed
    if (!this.votes) {
      this.votes = {
        questionId: '',
        options: new Map(),
        byCountry: new Map(),
        lastUpdated: new Date().toISOString(),
      };
    }

    // Update global option count
    const currentCount = this.votes.options.get(optionId) || 0;
    this.votes.options.set(optionId, currentCount + 1);

    // Update country count
    if (!this.votes.byCountry.has(countryCode)) {
      this.votes.byCountry.set(countryCode, new Map());
    }
    const countryMap = this.votes.byCountry.get(countryCode)!;
    const countryCount = countryMap.get(optionId) || 0;
    countryMap.set(optionId, countryCount + 1);

    this.votes.lastUpdated = new Date().toISOString();

    // Persist to storage
    await this.saveState();

    // Get formatted votes
    const globalVotes = this.formatVotes();

    // Broadcast to WebSocket clients
    this.broadcast({
      type: 'vote_update',
      payload: globalVotes,
    });

    return globalVotes;
  }

  async getVotes(): Promise<GlobalVotes> {
    return this.formatVotes();
  }

  private formatVotes(): GlobalVotes {
    if (!this.votes) {
      return {
        questionId: '',
        totalVotes: 0,
        options: [],
        byCountry: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    const options: VoteCount[] = Array.from(this.votes.options.entries()).map(
      ([optionId, count]) => ({ optionId, count }),
    );

    const totalVotes = options.reduce((sum, o) => sum + o.count, 0);

    const byCountry: CountryVotes[] = Array.from(
      this.votes.byCountry.entries(),
    ).map(([countryCode, optionMap]) => {
      const votes = Array.from(optionMap.entries()).map(([optionId, count]) => ({
        optionId,
        count,
      }));
      return {
        countryCode,
        votes,
        total: votes.reduce((sum, v) => sum + v.count, 0),
      };
    });

    return {
      questionId: this.votes.questionId,
      totalVotes,
      options,
      byCountry,
      lastUpdated: this.votes.lastUpdated,
    };
  }

  private async saveState(): Promise<void> {
    if (!this.votes) return;

    // Convert Maps to objects for storage
    const toStore = {
      ...this.votes,
      options: Object.fromEntries(this.votes.options),
      byCountry: Object.fromEntries(
        Array.from(this.votes.byCountry.entries()).map(([k, v]) => [
          k,
          Object.fromEntries(v),
        ]),
      ),
    };

    await this.ctx.storage.put('votes', toStore);
  }

  // WebSocket handling for real-time updates
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    this.sessions.add(server);

    // Send current state
    server.send(
      JSON.stringify({
        type: 'vote_update',
        payload: this.formatVotes(),
      }),
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  private broadcast(message: object): void {
    const data = JSON.stringify(message);
    for (const ws of this.sessions) {
      try {
        ws.send(data);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.sessions.delete(ws);
  }
}
