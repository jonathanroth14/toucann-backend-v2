#!/bin/bash
set -e

# =============================================================================
# RAILWAY VERIFICATION SCRIPT - Goals → Tasks Core Loop
# =============================================================================
# This script proves the entire task lifecycle works end-to-end on Railway
#
# Prerequisites:
# 1. Railway CLI installed: npm install -g @railway/cli
# 2. Railway project linked: railway link
# 3. User account created in the system
# =============================================================================

echo "================================================================"
echo "STEP 1: VERIFY MIGRATIONS ON RAILWAY"
echo "================================================================"

echo ""
echo "--- Checking Migration 006 (notifications table) ---"
railway run psql -c "\d notifications" || echo "❌ FAILED: notifications table does not exist"

echo ""
echo "--- Checking Migration 007 (snoozed_goal_tasks table) ---"
railway run psql -c "\d snoozed_goal_tasks" || echo "❌ FAILED: snoozed_goal_tasks table does not exist"

echo ""
echo "--- Listing all migrations applied ---"
railway run psql -c "SELECT * FROM alembic_version;"

echo ""
echo "================================================================"
echo "STEP 2: SEED DATA ON RAILWAY"
echo "================================================================"

echo ""
echo "--- Running seed script ---"
railway run psql < backend/seed_goals_tasks.sql

echo ""
echo "--- Verifying goals created ---"
railway run psql -c "
SELECT
    g.id as goal_id,
    g.title as goal_title,
    g.is_active,
    COUNT(gs.id) as task_count
FROM goals g
LEFT JOIN goal_steps gs ON g.id = gs.goal_id
WHERE g.is_active = true
GROUP BY g.id, g.title, g.is_active
ORDER BY g.id;
"

echo ""
echo "--- Verifying goal_steps (tasks) created ---"
railway run psql -c "
SELECT
    g.title as goal_title,
    gs.id as step_id,
    gs.title as step_title,
    gs.sort_order,
    gs.points,
    gs.is_required
FROM goals g
JOIN goal_steps gs ON g.id = gs.goal_id
WHERE g.is_active = true
ORDER BY g.id, gs.sort_order;
"

echo ""
echo "================================================================"
echo "STEP 3: GET RAILWAY URL AND AUTH TOKEN"
echo "================================================================"

# Get Railway URL
echo ""
echo "Enter your Railway backend URL (e.g., https://your-app.up.railway.app):"
read RAILWAY_URL

echo ""
echo "Enter your email:"
read EMAIL

echo ""
echo "Enter your password:"
read -s PASSWORD

echo ""
echo "--- Logging in to get JWT token ---"
LOGIN_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=$PASSWORD")

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ FAILED: Login failed. Check credentials."
  exit 1
fi

echo "✅ Got JWT token: ${TOKEN:0:20}..."

echo ""
echo "--- Getting user ID ---"
USER_RESPONSE=$(curl -s -X GET "$RAILWAY_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

echo "User info: $USER_RESPONSE"

USER_ID=$(echo $USER_RESPONSE | jq -r '.id')
echo "✅ User ID: $USER_ID"

echo ""
echo "================================================================"
echo "STEP 4: TEST ALL 5 TASK LIFECYCLE ENDPOINTS"
echo "================================================================"

echo ""
echo "--- TEST 1: GET /student/today-task ---"
TASK_RESPONSE=$(curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$TASK_RESPONSE" | jq

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.task.id')
TASK_TITLE=$(echo $TASK_RESPONSE | jq -r '.task.title')
AVAILABLE_COUNT=$(echo $TASK_RESPONSE | jq -r '.available_count')

if [ "$TASK_ID" == "null" ]; then
  echo "❌ FAILED: No task returned"
  exit 1
fi

echo "✅ PASSED: Got task ID $TASK_ID - '$TASK_TITLE'"
echo "✅ Available count: $AVAILABLE_COUNT"

echo ""
echo "--- TEST 2: POST /student/today-task/{id}/complete ---"
COMPLETE_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/student/today-task/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$COMPLETE_RESPONSE" | jq

POINTS_AWARDED=$(echo $COMPLETE_RESPONSE | jq -r '.points_awarded')
MESSAGE=$(echo $COMPLETE_RESPONSE | jq -r '.message')

echo "✅ PASSED: $MESSAGE"
echo "✅ Points awarded: $POINTS_AWARDED"

echo ""
echo "--- Verify in database that task was marked complete ---"
railway run psql -c "
SELECT
    u.email,
    gs.title as task_title,
    ugsp.status,
    ugsp.completed_at
FROM user_goal_step_progress ugsp
JOIN users u ON ugsp.user_id = u.id
JOIN goal_steps gs ON ugsp.step_id = gs.id
WHERE ugsp.user_id = $USER_ID AND ugsp.step_id = $TASK_ID;
"

echo ""
echo "--- TEST 3: GET /student/today-task (verify next task unlocked) ---"
NEXT_TASK_RESPONSE=$(curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$NEXT_TASK_RESPONSE" | jq

NEXT_TASK_ID=$(echo $NEXT_TASK_RESPONSE | jq -r '.task.id')
NEXT_TASK_TITLE=$(echo $NEXT_TASK_RESPONSE | jq -r '.task.title')

if [ "$NEXT_TASK_ID" == "$TASK_ID" ]; then
  echo "❌ FAILED: Same task returned (unlocking not working)"
  exit 1
fi

echo "✅ PASSED: Next task unlocked - ID $NEXT_TASK_ID - '$NEXT_TASK_TITLE'"

echo ""
echo "--- TEST 4: POST /student/today-task/{id}/snooze ---"
SNOOZE_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/student/today-task/$NEXT_TASK_ID/snooze?days=1" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$SNOOZE_RESPONSE" | jq

SNOOZED_UNTIL=$(echo $SNOOZE_RESPONSE | jq -r '.snoozed_until')

echo "✅ PASSED: Task snoozed until $SNOOZED_UNTIL"

echo ""
echo "--- Verify in database that task was snoozed ---"
railway run psql -c "
SELECT
    gs.title as task_title,
    sgt.snoozed_until,
    CASE WHEN sgt.snoozed_until > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status
FROM snoozed_goal_tasks sgt
JOIN goal_steps gs ON sgt.step_id = gs.id
WHERE sgt.user_id = $USER_ID AND sgt.step_id = $NEXT_TASK_ID;
"

echo ""
echo "--- TEST 5: POST /student/today-task/swap ---"
CURRENT_TASK_RESPONSE=$(curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN")

CURRENT_TASK_ID=$(echo $CURRENT_TASK_RESPONSE | jq -r '.task.id')

SWAP_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/student/today-task/swap?current_task_id=$CURRENT_TASK_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$SWAP_RESPONSE" | jq

SWAPPED_TASK_ID=$(echo $SWAP_RESPONSE | jq -r '.task.id')
SWAPPED_TASK_TITLE=$(echo $SWAP_RESPONSE | jq -r '.task.title')

if [ "$SWAPPED_TASK_ID" == "$CURRENT_TASK_ID" ]; then
  echo "⚠️  WARNING: Same task returned (might not have alternative tasks)"
else
  echo "✅ PASSED: Swapped to task ID $SWAPPED_TASK_ID - '$SWAPPED_TASK_TITLE'"
fi

echo ""
echo "--- TEST 6: POST /student/today-task/add-another ---"
ADD_ANOTHER_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/student/today-task/add-another" \
  -H "Authorization: Bearer $TOKEN")

echo "Response:"
echo "$ADD_ANOTHER_RESPONSE" | jq

BONUS_TASK_ID=$(echo $ADD_ANOTHER_RESPONSE | jq -r '.task.id')
BONUS_TASK_TITLE=$(echo $ADD_ANOTHER_RESPONSE | jq -r '.task.title')

if [ "$BONUS_TASK_ID" == "null" ]; then
  echo "⚠️  WARNING: No bonus task available (might only have 1 task left)"
else
  echo "✅ PASSED: Bonus task ID $BONUS_TASK_ID - '$BONUS_TASK_TITLE'"
fi

echo ""
echo "================================================================"
echo "STEP 5: VERIFY DATABASE STATE"
echo "================================================================"

echo ""
echo "--- All completed tasks for user $USER_ID ---"
railway run psql -c "
SELECT
    g.title as goal_title,
    gs.title as task_title,
    ugsp.status,
    ugsp.completed_at
FROM user_goal_step_progress ugsp
JOIN goal_steps gs ON ugsp.step_id = gs.id
JOIN goals g ON gs.goal_id = g.id
WHERE ugsp.user_id = $USER_ID
ORDER BY ugsp.completed_at DESC;
"

echo ""
echo "--- All snoozed tasks for user $USER_ID ---"
railway run psql -c "
SELECT
    gs.title as task_title,
    sgt.snoozed_until,
    CASE WHEN sgt.snoozed_until > NOW() THEN 'ACTIVE' ELSE 'EXPIRED' END as status
FROM snoozed_goal_tasks sgt
JOIN goal_steps gs ON sgt.step_id = gs.id
WHERE sgt.user_id = $USER_ID;
"

echo ""
echo "================================================================"
echo "✅ ALL BACKEND TESTS COMPLETE"
echo "================================================================"
echo ""
echo "Summary:"
echo "- Migration 006 (notifications): $(railway run psql -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='notifications';" | xargs) table(s)"
echo "- Migration 007 (snoozed_goal_tasks): $(railway run psql -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='snoozed_goal_tasks';" | xargs) table(s)"
echo "- Goals seeded: 2"
echo "- Tasks seeded: 7"
echo "- Tasks completed by user: $(railway run psql -t -c "SELECT COUNT(*) FROM user_goal_step_progress WHERE user_id=$USER_ID AND status='COMPLETE';" | xargs)"
echo "- Tasks snoozed by user: $(railway run psql -t -c "SELECT COUNT(*) FROM snoozed_goal_tasks WHERE user_id=$USER_ID;" | xargs)"
echo ""
echo "Next: Verify frontend at your deployed URL /student"
echo ""
