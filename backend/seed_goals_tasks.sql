-- Seed Goals and Tasks for Testing
-- Run this after migrations are applied

-- Goal 1: SAT Goals (main test goal)
INSERT INTO goals (title, description, is_active, created_at)
VALUES (
    'SAT Goals',
    'Prepare for the SAT exam with strategic steps',
    true,
    NOW()
) ON CONFLICT DO NOTHING;

-- Get the goal ID (for PostgreSQL, we'll use a variable)
DO $$
DECLARE
    sat_goal_id INTEGER;
    college_goal_id INTEGER;
BEGIN
    -- Get or create SAT Goals
    SELECT id INTO sat_goal_id FROM goals WHERE title = 'SAT Goals' LIMIT 1;

    -- Insert 5 goal_steps for SAT Goals
    INSERT INTO goal_steps (goal_id, title, description, sort_order, points, is_required, created_at)
    VALUES
        (sat_goal_id, 'Take diagnostic test', 'Complete a full-length practice SAT to establish baseline', 0, 10, true, NOW()),
        (sat_goal_id, 'Review math fundamentals', 'Study algebra, geometry, and data analysis basics', 1, 15, true, NOW()),
        (sat_goal_id, 'Practice reading comprehension', 'Complete 10 reading passages with analysis', 2, 20, true, NOW()),
        (sat_goal_id, 'Master grammar rules', 'Study and practice all SAT writing conventions', 3, 15, true, NOW()),
        (sat_goal_id, 'Take full practice exam', 'Complete timed full-length practice test', 4, 25, true, NOW())
    ON CONFLICT DO NOTHING;

    -- Goal 2: College Application (for swap/add-another testing)
    INSERT INTO goals (title, description, is_active, created_at)
    VALUES (
        'College Application Prep',
        'Get ready for college applications',
        true,
        NOW()
    ) ON CONFLICT DO NOTHING;

    SELECT id INTO college_goal_id FROM goals WHERE title = 'College Application Prep' LIMIT 1;

    -- Insert 2 goal_steps for College Application
    INSERT INTO goal_steps (goal_id, title, description, sort_order, points, is_required, created_at)
    VALUES
        (college_goal_id, 'Research target schools', 'Create a list of 5-10 colleges to apply to', 0, 15, true, NOW()),
        (college_goal_id, 'Draft personal statement', 'Write first draft of college essay', 1, 20, true, NOW())
    ON CONFLICT DO NOTHING;

END $$;

-- Verify the data
SELECT
    g.id as goal_id,
    g.title as goal_title,
    gs.id as step_id,
    gs.title as step_title,
    gs.sort_order,
    gs.points
FROM goals g
JOIN goal_steps gs ON g.id = gs.goal_id
WHERE g.is_active = true
ORDER BY g.id, gs.sort_order;
