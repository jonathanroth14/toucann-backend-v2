# Goals → Tasks Implementation Summary

## What Was Built

A complete **Goals → Tasks** daily loop system where:
- Admin creates **Goals** with ordered **Tasks** (goal_steps)
- Student sees **ONE task at a time** from their active goals
- Student can **complete**, **snooze**, **swap**, or **add another** task
- Progress unlocks sequentially within each goal

**No separate "Challenges" concept in the UI.** Everything is Goals → Tasks.

---

## System Architecture

### Data Model

```
goals (existing)
├── id, title, description, is_active
└── goal_steps (existing, reused as "tasks")
    ├── id, goal_id, title, description
    ├── sort_order (determines sequence)
    ├── points, is_required
    └── created_at

user_goal_step_progress (existing)
├── id, user_id, step_id
├── status (COMPLETE, IN_PROGRESS, etc.)
└── completed_at

snoozed_goal_tasks (NEW - migration 007)
├── id, user_id, step_id
├── snoozed_at, snoozed_until
└── UNIQUE(user_id, step_id)
```

**Key insight:** Reused existing `goal_steps` table instead of creating new "tasks" table.

---

## Backend Endpoints

All endpoints in `/backend/app/goals/student_routes.py`:

### Core Task Loop

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/student/today-task` | GET | Returns ONE eligible task based on selection logic |
| `/student/today-task/{id}/complete` | POST | Marks task complete, awards points, unlocks next |
| `/student/today-task/{id}/snooze` | POST | Hides task for 1-30 days |
| `/student/today-task/swap` | POST | Swaps current task with next available |
| `/student/today-task/add-another` | POST | Returns 2nd eligible task (bonus slot) |

### Selection Logic

**Rules (in order of priority):**
1. Only active goals (`Goal.is_active = true`)
2. Exclude completed tasks (`user_goal_step_progress.status = COMPLETE`)
3. Exclude snoozed tasks (`snoozed_goal_tasks.snoozed_until > now`)
4. Order by `sort_order` ASC within each goal
5. Return ONE task per goal (first eligible)
6. Default: return first task from list

**How unlocking works:**
- Completing Task 1 (sort_order=0) → marks as COMPLETE
- Next GET request → filters out Task 1 → returns Task 2 (sort_order=1)
- Implicit unlocking via filtering (no explicit unlock logic needed)

---

## Frontend Implementation

### Student Dashboard (`/frontend/src/app/student/page.tsx`)

**Completely rewritten** to use new task-based API.

**State Management:**
- `primaryTask` - Current main task
- `secondaryTask` - Bonus task (if "Add another" clicked)
- `actionLoading` - Disables buttons during API calls
- `error` - Displays user-friendly error messages

**Button Handlers:**

| Button | Handler | API Call | UI Update |
|--------|---------|----------|-----------|
| Mark done ✓ | `handleMarkDone()` | `POST /student/today-task/{id}/complete` | Refetch primary task, clear secondary if completed |
| Not today | `handleSnooze()` | `POST /student/today-task/{id}/snooze?days=1` | Refetch primary task (shows next eligible) |
| Swap | `handleSwap()` | `POST /student/today-task/swap?current_task_id={id}` | Replace primary task with swapped task |
| + Add another task | `handleAddAnotherTask()` | `POST /student/today-task/add-another` | Display secondary task as "Bonus Task" |
| Remove (bonus) | `() => setSecondaryTask(null)` | None (local state) | Hide secondary task card |

**Empty State:**
- When `task: null` → Shows "🎉 All caught up! No tasks available right now."
- Clean, friendly message (not treated as error)

**Progress Bar:**
- Shows `goal_progress.percentage` from API response
- Updates automatically after task completion
- Visual feedback with gradient color

---

## Files Changed

### Backend
1. **`backend/app/goals/models.py`** - Added `SnoozedGoalTask` model
2. **`backend/alembic/versions/007_snoozed_tasks.py`** - Migration for snooze table (raw SQL)
3. **`backend/app/goals/student_routes.py`** - Complete rewrite with 5 new endpoints + selection logic

### Frontend
4. **`frontend/src/lib/api.ts`** - Added 5 new task endpoints to `studentApi`
5. **`frontend/src/app/student/page.tsx`** - Complete rewrite with all buttons wired

### Scripts & Docs
6. **`backend/seed_goals_tasks.sql`** - Creates 2 goals with 7 tasks total
7. **`backend/reset_progress.sql`** - Clears progress for testing
8. **`backend/get_user_id.md`** - 4 methods to get user_id
9. **`RAILWAY_DEPLOYMENT.md`** - Step-by-step Railway deployment guide
10. **`2_MINUTE_VERIFICATION.md`** - Quick verification checklist
11. **`GOALS_TASKS_IMPLEMENTATION.md`** - This file (summary)

---

## What Was NOT Changed (Scope Boundaries)

✅ **Kept in scope:**
- Goals → Tasks daily loop
- Task lifecycle (complete, snooze, swap, add-another)
- Progress tracking and unlocking
- Frontend buttons wired to real endpoints
- Empty states and error handling

❌ **Explicitly excluded (as requested):**
- ❌ Notifications UI (table exists, but no UI yet)
- ❌ Achievements math/logic (placeholder values only)
- ❌ Removing old Challenge pages/components (kept for backward compatibility)
- ❌ Complex gamification or streak calculations
- ❌ Admin UI for Goals/Tasks management (already exists, not touched)

---

## Deployment Steps

See **[RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)** for full guide.

**Quick version:**

```bash
# 1. Run migration
railway run alembic upgrade head

# 2. Seed data
railway run psql < backend/seed_goals_tasks.sql

# 3. Verify
railway run psql -c "SELECT COUNT(*) FROM goal_steps;"
# Expected: 7 (5 SAT tasks + 2 College tasks)

# 4. Test backend
curl -X GET "https://your-backend.up.railway.app/student/today-task" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# 5. Test frontend
# Visit https://your-frontend.vercel.app/student
# Click "Mark done" button
```

---

## Verification Checklist

See **[2_MINUTE_VERIFICATION.md](./2_MINUTE_VERIFICATION.md)** for full checklist.

**Quick version:**

1. ✅ GET `/student/today-task` returns a task
2. ✅ POST `/student/today-task/{id}/complete` marks it done
3. ✅ Next GET returns the next task in sequence (unlocking works)
4. ✅ POST `/student/today-task/{id}/snooze` hides it
5. ✅ Frontend "Mark done" button works and updates UI
6. ✅ Frontend progress bar updates after completion
7. ✅ Frontend "+ Add another task" shows bonus task

**All tests should pass in under 2 minutes.**

---

## Task Lifecycle Example

**Starting state:**
- Goal: "SAT Goals" with 5 tasks (sort_order 0-4)
- User has completed 0 tasks

**Flow:**

1. **GET /student/today-task**
   - Returns Task 1 (sort_order=0): "Take diagnostic test"
   - `available_count: 2` (Task 1 from SAT Goals + Task 1 from College Goals)

2. **POST /student/today-task/1/complete**
   - Marks Task 1 as COMPLETE
   - Awards 10 points
   - Response: `"goal_complete": false` (4 more tasks in goal)

3. **GET /student/today-task**
   - Returns Task 2 (sort_order=1): "Review math fundamentals"
   - Task 1 is filtered out (completed)
   - Progress: `"completed": 1, "total": 5, "percentage": 20`

4. **POST /student/today-task/2/snooze?days=1**
   - Creates snooze record for Task 2 until tomorrow
   - Response: `"snoozed_until": "2025-12-19T..."`

5. **GET /student/today-task**
   - Returns Task from "College Application Prep" goal
   - Both SAT tasks (1=completed, 2=snoozed) are filtered out

6. **POST /student/today-task/add-another**
   - Returns Task 3 from SAT Goals (sort_order=2): "Practice reading comprehension"
   - Task 2 is still snoozed, so skips to Task 3

7. **Tomorrow (snooze expires):**
   - GET /student/today-task returns Task 2 again (snooze expired)

---

## Testing & Debugging

### Quick Reset

```bash
# Clear all progress and snoozes
railway run psql < backend/reset_progress.sql

# Verify clean slate
railway run psql -c "SELECT COUNT(*) FROM user_goal_step_progress;"
# Expected: 0
```

### Common Issues

**No task returned:**
```bash
# Check if goals are active
railway run psql -c "SELECT * FROM goals WHERE is_active = true;"

# Check if all tasks completed
railway run psql -c "
SELECT gs.id, gs.title, ugsp.status
FROM goal_steps gs
LEFT JOIN user_goal_step_progress ugsp ON ugsp.step_id = gs.id AND ugsp.user_id = YOUR_USER_ID
WHERE gs.goal_id IN (SELECT id FROM goals WHERE is_active = true);
"
```

**Frontend buttons don't work:**
1. Open browser DevTools → Console
2. Check for API errors
3. Verify `NEXT_PUBLIC_API_BASE` environment variable
4. Check Network tab for failed requests
5. Verify JWT token in localStorage

**401 Unauthorized:**
```bash
# Get new token
curl -X POST "$RAILWAY_URL/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your-email@example.com&password=your-password"
```

---

## Next Steps (Out of Scope for This PR)

**Future enhancements (not in this PR):**
1. Notifications UI - Display notifications in "Next Steps" panel
2. Achievements system - Calculate streaks, badges, levels
3. Remove legacy Challenge pages - Clean up old components
4. Admin UI improvements - Bulk task creation, reordering
5. Analytics - Track completion rates, time spent per task
6. Recurring tasks - Auto-generate tasks on schedule
7. Team/class features - Teacher assigns goals to students

**Current PR is focused on:**
- ✅ Core task loop working end-to-end
- ✅ All buttons functional on frontend
- ✅ Backend fully tested with curl
- ✅ Deployable to Railway
- ✅ Demo-ready in 2 minutes

---

## Commits

**Main commits:**
1. `0e302be` - Add snoozed_goal_tasks model and migration
2. `c26b5dc` - Fix migration: use pure SQL for table creation
3. `6fea208` - Implement core student task loop endpoints
4. `9823d50` - Wire frontend to new Goals → Tasks backend endpoints

**Branch:** `claude/add-goals-challenges-4spe9`

---

## Success Criteria

**✅ This PR is successful if:**
1. Migration 007 runs cleanly on Railway
2. Seed script creates 7 tasks across 2 goals
3. All 5 backend endpoints return expected responses
4. Frontend buttons call correct endpoints and update UI
5. Progress bar updates after task completion
6. Empty state shows when no tasks available
7. All 7 verification tests pass in under 2 minutes

**The system is demo-ready when you can:**
- Click "Mark done" → See next task appear
- Click "Not today" → See different task appear
- Click "Swap" → See alternative task appear
- Click "+ Add another task" → See bonus task card appear
- Complete all tasks → See "All caught up!" message

---

## Documentation Reference

- **Full deployment guide:** [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- **Quick verification:** [2_MINUTE_VERIFICATION.md](./2_MINUTE_VERIFICATION.md)
- **Get user ID:** [backend/get_user_id.md](./backend/get_user_id.md)
- **Seed data:** [backend/seed_goals_tasks.sql](./backend/seed_goals_tasks.sql)
- **Reset progress:** [backend/reset_progress.sql](./backend/reset_progress.sql)
