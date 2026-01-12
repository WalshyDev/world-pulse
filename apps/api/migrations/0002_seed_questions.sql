-- Seed initial questions
INSERT INTO questions (id, text, options, status) VALUES
(
    'q-pineapple-pizza',
    'Pineapple on pizza?',
    '[{"id":"opt-yes","text":"Yes, delicious!","color":"#3B82F6"},{"id":"opt-no","text":"No, never!","color":"#EF4444"}]',
    'pending'
),
(
    'q-hot-dog-sandwich',
    'Is a hot dog a sandwich?',
    '[{"id":"opt-yes","text":"Yes","color":"#3B82F6"},{"id":"opt-no","text":"No","color":"#EF4444"}]',
    'pending'
),
(
    'q-morning-night',
    'Morning person or night owl?',
    '[{"id":"opt-morning","text":"Morning person","color":"#F59E0B"},{"id":"opt-night","text":"Night owl","color":"#6366F1"}]',
    'pending'
),
(
    'q-cats-dogs',
    'Cats or dogs?',
    '[{"id":"opt-cats","text":"Cats","color":"#8B5CF6"},{"id":"opt-dogs","text":"Dogs","color":"#F97316"}]',
    'pending'
),
(
    'q-water-wet',
    'Is water wet?',
    '[{"id":"opt-yes","text":"Yes","color":"#3B82F6"},{"id":"opt-no","text":"No","color":"#EF4444"}]',
    'pending'
),
(
    'q-toilet-paper',
    'Toilet paper: over or under?',
    '[{"id":"opt-over","text":"Over","color":"#10B981"},{"id":"opt-under","text":"Under","color":"#EC4899"}]',
    'pending'
),
(
    'q-mars-trip',
    'Would you take a one-way trip to Mars?',
    '[{"id":"opt-yes","text":"Yes, adventure awaits!","color":"#EF4444"},{"id":"opt-no","text":"No, Earth is home","color":"#3B82F6"}]',
    'pending'
);
