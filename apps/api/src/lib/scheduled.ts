import type { Env } from '../types';
import { QuestionsStore, QueueStore } from '../db/stores';

/**
 * Rotates the daily question at midnight UTC:
 * 1. Archives the current active question
 * 2. Promotes the top-voted submission from the queue
 * 3. Clears the vote aggregator for the new question
 */
export async function rotateQuestion(env: Env): Promise<void> {
  const { CACHE } = env;

  console.log('[Scheduled] Starting daily question rotation...');

  // 1. Archive current active question
  const archivedId = await QuestionsStore.archiveActive();
  if (archivedId) {
    console.log(`[Scheduled] Archived question: ${archivedId}`);
  }

  // 2. Get top-voted submission from queue and promote it
  const topSubmission = await QueueStore.getTopSubmission();

  if (topSubmission) {
    const questionId = await QueueStore.promoteToQuestion(topSubmission.id);
    console.log(`[Scheduled] Activated question from submission: ${topSubmission.id} -> ${questionId}`);
  } else {
    // No submissions in queue - try to activate a pending seed question
    const seedQuestion = await QuestionsStore.getNextPending();

    if (seedQuestion) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      await QuestionsStore.activate(seedQuestion.id, tomorrow);
      console.log(`[Scheduled] Activated seed question: ${seedQuestion.id}`);
    } else {
      console.log('[Scheduled] No questions available to activate');
    }
  }

  // 3. Clear caches
  await CACHE.delete('current-question');
  console.log('[Scheduled] Cleared caches');

  console.log('[Scheduled] Daily rotation complete');
}
