import { sqliteTable, text, integer, primaryKey, index } from 'drizzle-orm/sqlite-core';

// Questions table
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  options: text('options').notNull(), // JSON array of {id, text, color}
  createdAt: text('created_at').notNull().default("(datetime('now'))"),
  activeFrom: text('active_from'),
  activeTo: text('active_to'),
  status: text('status', { enum: ['pending', 'active', 'archived'] }).notNull().default('pending'),
}, (table) => [
  index('idx_questions_status').on(table.status),
]);

// Votes table
export const votes = sqliteTable('votes', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => questions.id),
  optionId: text('option_id').notNull(),
  countryCode: text('country_code').notNull().default('XX'),
  voterIp: text('voter_ip').notNull(),
  votedAt: text('voted_at').notNull().default("(datetime('now'))"),
}, (table) => [
  index('idx_votes_question_ip').on(table.questionId, table.voterIp),
  index('idx_votes_country').on(table.questionId, table.countryCode, table.optionId),
]);

// Question submissions (community queue)
export const questionSubmissions = sqliteTable('question_submissions', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  options: text('options').notNull(), // JSON array of option strings
  submittedAt: text('submitted_at').notNull().default("(datetime('now'))"),
  submittedByIp: text('submitted_by_ip').notNull(),
  upvotes: integer('upvotes').notNull().default(0),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
}, (table) => [
  index('idx_submissions_pending').on(table.status, table.upvotes),
]);

// Submission upvotes
export const submissionUpvotes = sqliteTable('submission_upvotes', {
  submissionId: text('submission_id').notNull().references(() => questionSubmissions.id),
  voterIp: text('voter_ip').notNull(),
  votedAt: text('voted_at').notNull().default("(datetime('now'))"),
}, (table) => [
  primaryKey({ columns: [table.submissionId, table.voterIp] }),
]);

// Achievements
export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  voterIp: text('voter_ip').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  unlockedAt: text('unlocked_at').notNull().default("(datetime('now'))"),
}, (table) => [
  index('idx_achievements_user').on(table.voterIp),
]);

// Banned IPs table
export const bannedIps = sqliteTable('banned_ips', {
  ip: text('ip').primaryKey(),
  reason: text('reason'),
  bannedAt: text('banned_at').notNull().default("(datetime('now'))"),
  bannedBy: text('banned_by'),
});

// Type exports for use in the app
export type BannedIp = typeof bannedIps.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type QuestionSubmission = typeof questionSubmissions.$inferSelect;
export type NewQuestionSubmission = typeof questionSubmissions.$inferInsert;
export type SubmissionUpvote = typeof submissionUpvotes.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
