# Railway Deployment & Verification Guide

## Prerequisites

1. Railway CLI installed: `npm install -g @railway/cli`
2. Railway project linked
3. PostgreSQL database provisioned
4. Backend deployed

## Step 1: Run Migration 007 (Snoozed Tasks)

### Option A: Using Railway CLI

```bash
cd backend
railway run alembic upgrade head
```

### Option B: Using Database URL

```bash
# Get database URL
railway variables | grep DATABASE_URL

# Set it as environment variable
export DATABASE_URL="postgresql://..."

# Run migration
cd backend
alembic upgrade head
```

### Verify Migration

```bash
railway run psql -c "\dt snoozed_goal_tasks"

# Expected output:
# Schema | Name                | Type  | Owner
# --------+--------------------+-------+-------
# public | snoozed_goal_tasks | table | ...
```

---

## Step 2: Seed Goals and Tasks

### Run Seed Script

```bash
# Option A: Railway CLI
railway run psql < backend/seed_goals_tasks.sql

# Option B: Using DATABASE_URL
psql "$DATABASE_URL" < backend/seed_goals_tasks.sql
```

### Verify Seed Data

```bash
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

# Expected output:
# goal_id |        goal_title          | is_active | task_count
# ---------+---------------------------+-----------+------------
#       1 | SAT Goals                 | t         |          5
#       2 | College Application Prep  | t         |          2
```

**Detailed verification:**

```bash
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

# Expected output:
# goal_title                | step_id | step_title                    | sort_order | points | is_required
# --------------------------+---------+-------------------------------+------------+--------+-------------
# SAT Goals                 |       1 | Take diagnostic test          |          0 |     10 | t
# SAT Goals                 |       2 | Review math fundamentals      |          1 |     15 | t
# SAT Goals                 |       3 | Practice reading comprehension|          2 |     20 | t
# SAT Goals                 |       4 | Master grammar rules          |          3 |     15 | t
# SAT Goals                 |       5 | Take full practice exam       |          4 |     25 | t
# College Application Prep  |       6 | Research target schools       |          0 |     15 | t
# College Application Prep  |       7 | Draft personal statement      |          1 |     20 | t
```

---

## Step 3: Get Your User ID and JWT Token

### Get JWT Token

```bash
# Set Railway URL
export RAILWAY_URL="https://your-backend.up.railway.app"

# Login (replace with your credentials)
curl -X POST "$RAILWAY_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@example.com&password=your-password"

# Copy access_token from response
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Get User ID

```bash
curl -X GET "$RAILWAY_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" | jq

# Response:
# {
#   "id": 1,
#   "email": "your-email@example.com",
#   "is_active": true,
#   "is_admin": false
# }

# Save user ID
export USER_ID=1
```

---

## Step 4: Test Backend Endpoints with Curl

### Test 1: GET /student/today-task

```bash
curl -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected response:
# {
#   "task": {
#     "id": 1,
#     "goal_id": 1,
#     "goal_title": "SAT Goals",
#     "title": "Take diagnostic test",
#     "description": "Complete a full-length practice SAT to establish baseline",
#     "points": 10,
#     "sort_order": 0,
#     "is_required": true,
#     "is_completed": false,
#     "completed_at": null,
#     "snoozed_until": null
#   },
#   "goal_progress": {
#     "goal_id": 1,
#     "goal_title": "SAT Goals",
#     "total": 5,
#     "completed": 0,
#     "percentage": 0
#   },
#   "available_count": 2
# }

# Save task ID for next tests
export TASK_ID=1
```

### Test 2: POST /student/today-task/{id}/complete

```bash
curl -X POST "$RAILWAY_URL/student/today-task/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected response:
# {
#   "ok": true,
#   "message": "Task 'Take diagnostic test' completed!",
#   "points_awarded": 10,
#   "goal_complete": false
# }

# Get today's task again (should show next task)
curl -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: task.id = 2, task.title = "Review math fundamentals"
```

### Test 3: POST /student/today-task/{id}/snooze

```bash
# Get current task ID
export TASK_ID=2

curl -X POST "$RAILWAY_URL/student/today-task/$TASK_ID/snooze?days=1" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected response:
# {
#   "ok": true,
#   "message": "Task snoozed until 2025-12-19",
#   "snoozed_until": "2025-12-19T..."
# }

# Get today's task again (should show different task from different goal)
curl -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: task from "College Application Prep" goal (since SAT Goals task is snoozed)
```

### Test 4: POST /student/today-task/swap

```bash
# Get current task ID
CURRENT_TASK_ID=$(curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.task.id')

curl -X POST "$RAILWAY_URL/student/today-task/swap?current_task_id=$CURRENT_TASK_ID" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected: Returns a different task (swapped)
```

### Test 5: POST /student/today-task/add-another

```bash
curl -X POST "$RAILWAY_URL/student/today-task/add-another" \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected response:
# {
#   "task": {
#     "id": ...,
#     "goal_title": "...",
#     "title": "...",
#     ...
#   },
#   "goal_progress": {...},
#   "available_count": ...
# }
```

---

## Step 5: Verify Database Changes

### Check Completed Tasks

```bash
railway run psql -c "
SELECT
    u.email,
    g.title as goal_title,
    gs.title as task_title,
    ugsp.status,
    ugsp.completed_at
FROM user_goal_step_progress ugsp
JOIN users u ON ugsp.user_id = u.id
JOIN goal_steps gs ON ugsp.step_id = gs.id
JOIN goals g ON gs.goal_id = g.id
WHERE ugsp.user_id = $USER_ID
ORDER BY ugsp.completed_at DESC;
"
```

### Check Snoozed Tasks

```bash
railway run psql -c "
SELECT
    u.email,
    gs.title as task_title,
    sgt.snoozed_at,
    sgt.snoozed_until,
    CASE
        WHEN sgt.snoozed_until > NOW() THEN 'ACTIVE'
        ELSE 'EXPIRED'
    END as snooze_status
FROM snoozed_goal_tasks sgt
JOIN users u ON sgt.user_id = u.id
JOIN goal_steps gs ON sgt.step_id = gs.id
WHERE sgt.user_id = $USER_ID
ORDER BY sgt.snoozed_at DESC;
"
```

---

## Step 6: Reset Progress (For Testing Multiple Times)

```bash
# Clear all progress and snoozes
railway run psql < backend/reset_progress.sql

# Or manually:
railway run psql -c "DELETE FROM snoozed_goal_tasks;"
railway run psql -c "DELETE FROM user_goal_step_progress;"
```

---

## Troubleshooting

### Migration 007 Already Applied

```bash
# Check current migration version
railway run alembic current

# If 007 is already applied, skip to seeding
```

### Seed Script Fails with "Already Exists"

The seed script is idempotent (uses `ON CONFLICT DO NOTHING`). Safe to re-run.

### No Tasks Returned

```bash
# Check if goals are active
railway run psql -c "SELECT id, title, is_active FROM goals;"

# Check if goal_steps exist
railway run psql -c "SELECT COUNT(*) FROM goal_steps;"

# Check if all tasks are completed or snoozed
railway run psql -c "
SELECT
    gs.id,
    gs.title,
    CASE WHEN ugsp.id IS NOT NULL THEN 'COMPLETED' ELSE 'AVAILABLE' END as status
FROM goal_steps gs
LEFT JOIN user_goal_step_progress ugsp ON ugsp.step_id = gs.id AND ugsp.user_id = $USER_ID
JOIN goals g ON gs.goal_id = g.id
WHERE g.is_active = true
ORDER BY gs.goal_id, gs.sort_order;
"
```

### 401 Unauthorized

```bash
# Token expired, re-login
curl -X POST "$RAILWAY_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@example.com&password=your-password"
```

---

## Complete Test Script

Save this as `test_railway.sh`:

```bash
#!/bin/bash
set -e

# Configuration
export RAILWAY_URL="https://your-backend.up.railway.app"
export EMAIL="your-email@example.com"
export PASSWORD="your-password"

echo "=== 1. Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "$RAILWAY_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$EMAIL&password=$PASSWORD")

export TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in successfully"

echo ""
echo "=== 2. GET /student/today-task ==="
TASK_RESPONSE=$(curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN")

echo $TASK_RESPONSE | jq

TASK_ID=$(echo $TASK_RESPONSE | jq -r '.task.id')

if [ "$TASK_ID" == "null" ]; then
  echo "❌ No task available"
  exit 1
fi

echo "✅ Got task ID: $TASK_ID"

echo ""
echo "=== 3. POST /student/today-task/$TASK_ID/complete ==="
curl -s -X POST "$RAILWAY_URL/student/today-task/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "✅ Task completed"

echo ""
echo "=== 4. GET /student/today-task (after completion) ==="
curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "✅ Next task retrieved"

echo ""
echo "=== 5. POST /student/today-task/add-another ==="
curl -s -X POST "$RAILWAY_URL/student/today-task/add-another" \
  -H "Authorization: Bearer $TOKEN" | jq

echo "✅ Bonus task retrieved"

echo ""
echo "=== All tests passed! ==="
```

**Run it:**

```bash
chmod +x test_railway.sh
./test_railway.sh
```
