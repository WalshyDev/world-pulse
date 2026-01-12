import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

interface CountryVoteState {
  countryCode: string;
  questionId: string;
  options: Map<string, number>;
  total: number;
}

export class CountryVotes extends DurableObject {
  private votes: CountryVoteState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Load state from storage
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<CountryVoteState>('votes');
      if (stored) {
        this.votes = {
          ...stored,
          options: new Map(Object.entries(stored.options || {})),
        };
      }
    });
  }

  async vote(optionId: string): Promise<void> {
    // Initialize if needed
    if (!this.votes) {
      this.votes = {
        countryCode: '',
        questionId: '',
        options: new Map(),
        total: 0,
      };
    }

    // Update count
    const currentCount = this.votes.options.get(optionId) || 0;
    this.votes.options.set(optionId, currentCount + 1);
    this.votes.total++;

    // Persist to storage
    await this.saveState();
  }

  async getVotes(): Promise<{ countryCode: string; votes: { optionId: string; count: number }[]; total: number }> {
    if (!this.votes) {
      return { countryCode: '', votes: [], total: 0 };
    }

    const votes = Array.from(this.votes.options.entries()).map(
      ([optionId, count]) => ({ optionId, count }),
    );

    return {
      countryCode: this.votes.countryCode,
      votes,
      total: this.votes.total,
    };
  }

  private async saveState(): Promise<void> {
    if (!this.votes) return;

    const toStore = {
      ...this.votes,
      options: Object.fromEntries(this.votes.options),
    };

    await this.ctx.storage.put('votes', toStore);
  }
}
