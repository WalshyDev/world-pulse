-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array of {id, text, color}
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    active_from TEXT,
    active_to TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'archived'))
);

-- Index for finding active question
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(status, active_from, active_to);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    option_id TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'XX',
    voter_ip TEXT NOT NULL,
    voted_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- Index for checking duplicate votes
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique ON votes(question_id, voter_ip);
-- Index for aggregating by country
CREATE INDEX IF NOT EXISTS idx_votes_country ON votes(question_id, country_code, option_id);

-- Question submissions (community queue)
CREATE TABLE IF NOT EXISTS question_submissions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    options TEXT NOT NULL, -- JSON array of option strings
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_by_ip TEXT NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Index for finding top submissions
CREATE INDEX IF NOT EXISTS idx_submissions_pending ON question_submissions(status, upvotes DESC);

-- Submission upvotes (to prevent duplicate upvotes)
CREATE TABLE IF NOT EXISTS submission_upvotes (
    submission_id TEXT NOT NULL,
    voter_ip TEXT NOT NULL,
    voted_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (submission_id, voter_ip),
    FOREIGN KEY (submission_id) REFERENCES question_submissions(id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    voter_ip TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for user achievements
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(voter_ip);
