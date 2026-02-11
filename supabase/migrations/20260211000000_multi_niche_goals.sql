-- Add multi-select niches and goals columns
ALTER TABLE creator_profiles ADD COLUMN niches TEXT[] DEFAULT '{}';
ALTER TABLE creator_profiles ADD COLUMN goals TEXT[] DEFAULT '{}';

-- Migrate existing data from single to array
UPDATE creator_profiles
SET niches = ARRAY[primary_niche],
    goals = ARRAY[primary_goal]
WHERE primary_niche IS NOT NULL AND primary_goal IS NOT NULL;

-- Drop old single-value columns
ALTER TABLE creator_profiles DROP COLUMN primary_niche;
ALTER TABLE creator_profiles DROP COLUMN primary_goal;
