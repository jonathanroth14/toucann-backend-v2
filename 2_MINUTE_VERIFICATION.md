# 2-Minute Verification Checklist

## Setup (30 seconds)

```bash
# 1. Set Railway URL
export RAILWAY_URL="https://your-backend.up.railway.app"

# 2. Run migration 007
railway run alembic upgrade head

# 3. Seed data
railway run psql < backend/seed_goals_tasks.sql

# 4. Login and get token
curl -X POST "$RAILWAY_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@example.com&password=your-password" | jq -r '.access_token'

# 5. Copy token
export TOKEN="paste_your_token_here"
```

---

## Backend Verification (60 seconds)

### ✅ Test 1: Get Today's Task (15s)

```bash
curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq '.task.title'

# Expected: "Take diagnostic test"
```

**✅ PASS if you see a task title**
**❌ FAIL if you see `null` or error**

---

### ✅ Test 2: Complete Task (15s)

```bash
# Get task ID
TASK_ID=$(curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.task.id')

# Complete it
curl -s -X POST "$RAILWAY_URL/student/today-task/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN" | jq '.message'

# Expected: "Task 'Take diagnostic test' completed!"
```

**✅ PASS if you see success message**
**❌ FAIL if you see error**

---

### ✅ Test 3: Next Task Unlocked (15s)

```bash
curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq '.task.title'

# Expected: "Review math fundamentals" (next task in sequence)
```

**✅ PASS if you see DIFFERENT task than Test 1**
**❌ FAIL if you see same task or null**

---

### ✅ Test 4: Snooze Task (15s)

```bash
TASK_ID=$(curl -s -X GET "$RAILWAY_URL/student/today-task" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.task.id')

curl -s -X POST "$RAILWAY_URL/student/today-task/$TASK_ID/snooze?days=1" \
  -H "Authorization: Bearer $TOKEN" | jq '.message'

# Expected: "Task snoozed until 2025-12-19" (or tomorrow's date)
```

**✅ PASS if you see snooze confirmation**
**❌ FAIL if you see error**

---

## Frontend Verification (30 seconds)

### ✅ Test 5: Frontend Shows Task (10s)

1. Open browser → `https://your-frontend.vercel.app/student`
2. See "Today's Task" card with a task title

**✅ PASS if you see a task card**
**❌ FAIL if you see "All caught up!" or error**

---

### ✅ Test 6: Mark Done Button Works (10s)

1. Click **"Mark done ✓"** button
2. Watch for:
   - Button shows loading state (disabled)
   - Task changes to next task
   - Progress bar updates

**✅ PASS if task changes and progress updates**
**❌ FAIL if nothing happens or error appears**

---

### ✅ Test 7: Add Another Task Works (10s)

1. Click **"+ Add another task"** button
2. See "Bonus Task" card appear below

**✅ PASS if bonus task card appears**
**❌ FAIL if nothing happens or "No additional tasks available" error**

---

## Database Verification (Optional - 10s)

```bash
railway run psql -c "
SELECT COUNT(*) as completed_tasks
FROM user_goal_step_progress
WHERE status = 'COMPLETE';
"

# Expected: At least 1 (from Test 2)
```

**✅ PASS if count > 0**
**❌ FAIL if count = 0**

---

## Quick Reset (if you want to test again)

```bash
railway run psql < backend/reset_progress.sql
```

This clears all progress so you can re-test from scratch.

---

## Expected Results Summary

| Test | Expected Result | Time |
|------|----------------|------|
| 1. Get Today's Task | Returns task with title "Take diagnostic test" | 15s |
| 2. Complete Task | Returns success message with points awarded | 15s |
| 3. Next Task Unlocked | Returns different task "Review math fundamentals" | 15s |
| 4. Snooze Task | Returns snooze confirmation with date | 15s |
| 5. Frontend Shows Task | UI displays task card with title | 10s |
| 6. Mark Done Works | Task changes, progress updates | 10s |
| 7. Add Another Works | Bonus task card appears | 10s |
| **TOTAL** | **All tests pass** | **~90s** |

---

## Troubleshooting (if tests fail)

### Test 1 fails (No task available)

```bash
# Check if goals exist
railway run psql -c "SELECT COUNT(*) FROM goals WHERE is_active = true;"

# If count = 0, re-run seed script
railway run psql < backend/seed_goals_tasks.sql
```

### Test 2 fails (Complete fails)

```bash
# Check task ID is valid
railway run psql -c "SELECT id, title FROM goal_steps LIMIT 5;"

# If empty, re-run seed script
```

### Test 5-7 fails (Frontend doesn't work)

1. Check browser console for errors
2. Verify `NEXT_PUBLIC_API_BASE` environment variable points to Railway URL
3. Clear browser cache and reload
4. Check if JWT token is stored in localStorage (Dev Tools → Application → Local Storage)

### All tests fail with 401 Unauthorized

```bash
# Token expired, get new one
curl -X POST "$RAILWAY_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@example.com&password=your-password"
```

---

## Success Criteria

**✅ Ready to demo if:**
- All 7 tests pass
- Frontend buttons are responsive
- Progress bar updates visually
- No errors in browser console

**❌ Not ready if:**
- Any test fails
- Frontend shows errors
- Buttons don't respond
- Progress bar doesn't update
