import { env } from 'cloudflare:workers';
import type { Env } from '../../types';

interface OverviewStats {
  totalQuestions: number;
  activeQuestions: number;
  totalVotes: number;
  uniqueVoters: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  bannedIps: number;
}

interface CountryStats {
  countryCode: string;
  voteCount: number;
}

interface QuestionStats {
  questionId: string;
  questionText: string;
  totalVotes: number;
  options: Array<{
    optionId: string;
    optionText: string;
    count: number;
    percentage: number;
  }>;
}

class _StatsStore {
  private get d1() {
    return (env as Env).DB;
  }

  async getOverview(): Promise<OverviewStats> {
    const [questions, votes, submissions, bans] = await Promise.all([
      this.d1.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
        FROM questions
      `).first<{ total: number; active: number }>(),

      this.d1.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(DISTINCT voter_ip) as unique_voters
        FROM votes
      `).first<{ total: number; unique_voters: number }>(),

      this.d1.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM question_submissions
      `).first<{ total: number; pending: number }>(),

      this.d1.prepare('SELECT COUNT(*) as total FROM banned_ips').first<{ total: number }>(),
    ]);

    return {
      totalQuestions: questions?.total ?? 0,
      activeQuestions: questions?.active ?? 0,
      totalVotes: votes?.total ?? 0,
      uniqueVoters: votes?.unique_voters ?? 0,
      totalSubmissions: submissions?.total ?? 0,
      pendingSubmissions: submissions?.pending ?? 0,
      bannedIps: bans?.total ?? 0,
    };
  }

  async getCountryStats(): Promise<CountryStats[]> {
    const result = await this.d1.prepare(`
      SELECT country_code as countryCode, COUNT(*) as voteCount
      FROM votes
      WHERE country_code != 'XX' AND country_code != 'T1'
      GROUP BY country_code
      ORDER BY voteCount DESC
      LIMIT 50
    `).all<CountryStats>();

    return result.results;
  }

  async getQuestionStats(questionId: string): Promise<QuestionStats | null> {
    // Get question info
    const question = await this.d1.prepare(`
      SELECT id, text, options FROM questions WHERE id = ?
    `).bind(questionId).first<{ id: string; text: string; options: string }>();

    if (!question) return null;

    // Get vote counts
    const voteCounts = await this.d1.prepare(`
      SELECT option_id as optionId, COUNT(*) as count
      FROM votes
      WHERE question_id = ?
      GROUP BY option_id
    `).bind(questionId).all<{ optionId: string; count: number }>();

    const options = JSON.parse(question.options) as Array<{ id: string; text: string }>;
    const totalVotes = voteCounts.results.reduce((sum, v) => sum + v.count, 0);

    const optionStats = options.map((opt) => {
      const count = voteCounts.results.find((v) => v.optionId === opt.id)?.count ?? 0;
      return {
        optionId: opt.id,
        optionText: opt.text,
        count,
        percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
      };
    });

    return {
      questionId: question.id,
      questionText: question.text,
      totalVotes,
      options: optionStats,
    };
  }

  async getRecentVotes(limit = 50): Promise<Array<{
    questionId: string;
    optionId: string;
    countryCode: string;
    votedAt: string;
  }>> {
    const result = await this.d1.prepare(`
      SELECT question_id as questionId, option_id as optionId,
             country_code as countryCode, voted_at as votedAt
      FROM votes
      ORDER BY voted_at DESC
      LIMIT ?
    `).bind(limit).all();

    return result.results as Array<{
      questionId: string;
      optionId: string;
      countryCode: string;
      votedAt: string;
    }>;
  }
}

export const StatsStore = new _StatsStore();
