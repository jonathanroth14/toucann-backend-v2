-- Reset Progress Script
-- Clears all user progress and snooze data for testing

-- WARNING: This will delete ALL user progress and snooze data
-- Only run this in development/testing environments

-- Clear snoozed tasks
DELETE FROM snoozed_goal_tasks;

-- Clear goal step progress
DELETE FROM user_goal_step_progress;

-- Clear goal progress (if you want to reset goal-level progress too)
-- Uncomment if needed:
-- DELETE FROM user_goal_progress;

-- Verify cleanup
SELECT 'Snoozed tasks remaining:' as check, COUNT(*) FROM snoozed_goal_tasks
UNION ALL
SELECT 'Step progress remaining:' as check, COUNT(*) FROM user_goal_step_progress;

-- Show available tasks for a user (replace YOUR_USER_ID)
-- Uncomment and replace with your user_id to verify:
-- SELECT
--     gs.id as step_id,
--     g.title as goal_title,
--     gs.title as step_title,
--     gs.sort_order,
--     gs.points,
--     CASE WHEN ugsp.id IS NOT NULL THEN 'COMPLETED' ELSE 'AVAILABLE' END as status
-- FROM goal_steps gs
-- JOIN goals g ON gs.goal_id = g.id
-- LEFT JOIN user_goal_step_progress ugsp ON ugsp.step_id = gs.id AND ugsp.user_id = YOUR_USER_ID
-- WHERE g.is_active = true
-- ORDER BY g.id, gs.sort_order;
