# Frontend Verification Checklist

## Prerequisites

1. Backend deployed to Railway and verified (run `verify_railway.sh` first)
2. Frontend deployed (Vercel or other)
3. `NEXT_PUBLIC_API_BASE` environment variable set to Railway backend URL
4. User logged in with JWT token in localStorage

---

## Manual UI Testing Steps

### Test 1: Page Loads with Task

1. **Open:** `https://your-frontend.vercel.app/student`
2. **Expected:**
   - "Today's Task" card appears
   - Task title visible (e.g., "Take diagnostic test")
   - Task description visible
   - Points displayed
   - "Mark done ✓", "Swap", "Not today" buttons visible
   - Goal progress bar shows percentage
   - "X tasks available" count shows

**✅ PASS if:** All elements render correctly
**❌ FAIL if:** "All caught up!" message shows OR error message appears

**Debug if failed:**
```bash
# Check browser console for errors
# Check Network tab for failed API calls
# Verify NEXT_PUBLIC_API_BASE is set correctly
```

---

### Test 2: Mark Done Button Updates UI

1. **Action:** Click **"Mark done ✓"** button
2. **Expected sequence:**
   - Button shows loading state (disabled)
   - Task disappears briefly
   - NEW task appears (different title)
   - Progress bar increases (e.g., 0% → 20%)
   - "X tasks available" count updates

**✅ PASS if:** Task changes AND progress bar updates
**❌ FAIL if:** Same task appears OR progress bar doesn't change

**Verify in backend:**
```bash
# Check database for completed task
railway run psql -c "SELECT * FROM user_goal_step_progress WHERE user_id=YOUR_USER_ID;"
```

---

### Test 3: Not Today Button Snoozes Task

1. **Action:** Click **"Not today"** button
2. **Expected sequence:**
   - Button shows loading state
   - Current task disappears
   - Different task appears (from different goal OR same goal if available)
   - No error message

**✅ PASS if:** Task changes to different task
**❌ FAIL if:** Same task reappears OR error shows

**Verify in backend:**
```bash
# Check snoozed_goal_tasks table
railway run psql -c "SELECT * FROM snoozed_goal_tasks WHERE user_id=YOUR_USER_ID;"
```

---

### Test 4: Swap Button Replaces Task

1. **Action:** Click **"Swap"** button
2. **Expected sequence:**
   - Button shows loading state
   - Current task disappears
   - Alternative task appears (different title)
   - No error message

**✅ PASS if:** Task changes to different task
**❌ FAIL if:** Same task reappears OR "No alternative tasks" error

**Note:** If only 1 task available, swap might return null/error.

---

### Test 5: Add Another Task Shows Bonus Card

1. **Action:** Click **"+ Add another task"** button
2. **Expected sequence:**
   - Button shows loading state
   - Button disappears (no longer visible)
   - **NEW card appears below** labeled "Bonus Task"
   - Bonus task has different title than primary task
   - Bonus task has "Mark done ✓" and "Remove" buttons

**✅ PASS if:** Bonus task card appears below primary task
**❌ FAIL if:** No card appears OR error shows "No additional tasks"

---

### Test 6: Empty State Handling

1. **Setup:** Complete ALL tasks OR snooze all tasks
2. **Action:** Refresh page
3. **Expected:**
   - "🎉 All caught up!" message
   - "No tasks available right now. Great work!" text
   - NO error message (this is not an error state)

**✅ PASS if:** Friendly empty state message shows
**❌ FAIL if:** Error message shows OR loading spinner never stops

---

### Test 7: Error Handling

1. **Setup:** Logout (clear localStorage JWT token)
2. **Action:** Refresh `/student` page
3. **Expected:**
   - Redirect to `/login` page
   - OR error message: "Not authenticated"

**✅ PASS if:** Properly handles unauthenticated state
**❌ FAIL if:** Page hangs OR shows generic error

---

## Browser Console Verification

Open Chrome DevTools → Console. Look for:

**Expected logs:**
```
🔑 Token from localStorage: eyJhbGciOiJIUzI1N...
🔵 API Request: { url: "https://...up.railway.app/student/today-task", method: "GET" }
🔵 API Response: { status: 200, statusText: "OK", ok: true }
✅ API Success: { task: {...}, goal_progress: {...}, available_count: 2 }
```

**Red flags (should NOT see):**
```
❌ No token found - redirecting to login
❌ API Error Response: { status: 404, ... }
❌ API Error Response: { status: 500, ... }
TypeError: Cannot read property 'task' of undefined
```

---

## Network Tab Verification

Open Chrome DevTools → Network tab. Filter by "Fetch/XHR".

### When page loads:

**Expected requests:**
1. `GET /student/today-task` → Status 200
   - Response: `{ task: {...}, goal_progress: {...}, available_count: 2 }`

### When clicking "Mark done":

**Expected requests:**
1. `POST /student/today-task/1/complete` → Status 200
   - Response: `{ ok: true, message: "Task completed!", points_awarded: 10 }`
2. `GET /student/today-task` → Status 200
   - Response: `{ task: {...}, ... }` (different task ID)

### When clicking "Not today":

**Expected requests:**
1. `POST /student/today-task/2/snooze?days=1` → Status 200
   - Response: `{ ok: true, message: "Task snoozed until ...", snoozed_until: "..." }`
2. `GET /student/today-task` → Status 200
   - Response: `{ task: {...}, ... }` (different task)

### When clicking "Swap":

**Expected requests:**
1. `POST /student/today-task/swap?current_task_id=2` → Status 200
   - Response: `{ task: {...}, goal_progress: {...}, available_count: ... }`

### When clicking "+ Add another task":

**Expected requests:**
1. `POST /student/today-task/add-another` → Status 200
   - Response: `{ task: {...}, goal_progress: {...}, available_count: ... }`

---

## Common Issues & Fixes

### Issue 1: "All caught up!" shows immediately

**Cause:** No active goals OR all tasks completed/snoozed
**Fix:**
```bash
# Reset progress
railway run psql < backend/reset_progress.sql

# Verify goals exist
railway run psql -c "SELECT COUNT(*) FROM goal_steps;"
# Should return 7
```

---

### Issue 2: Buttons don't respond

**Cause:** Frontend not calling backend OR CORS issue
**Check:**
1. Browser console for errors
2. Network tab shows requests being sent
3. Backend CORS allows frontend domain

**Fix CORS (if needed):**
```python
# backend/app/main.py
origins = [
    "http://localhost:3000",
    "https://your-frontend.vercel.app",  # Add your Vercel URL
]
```

---

### Issue 3: 401 Unauthorized errors

**Cause:** JWT token expired or invalid
**Fix:**
1. Clear localStorage
2. Login again at `/login`
3. Navigate to `/student`

---

### Issue 4: Progress bar doesn't update

**Cause:** Frontend not refetching task after completion
**Check:** `handleMarkDone` function calls `loadTodayTask()` after `completeTask()`

**Verify:**
```typescript
// frontend/src/app/student/page.tsx
const handleMarkDone = async (taskId: number) => {
  await studentApi.completeTask(taskId);
  await loadTodayTask(); // ← This must be present
};
```

---

### Issue 5: Same task appears after "Mark done"

**Cause:** Backend not marking task complete OR not filtering completed tasks
**Check backend:**
```bash
# Verify task was marked complete in DB
railway run psql -c "
SELECT gs.id, gs.title, ugsp.status
FROM goal_steps gs
LEFT JOIN user_goal_step_progress ugsp ON ugsp.step_id = gs.id
WHERE ugsp.user_id = YOUR_USER_ID;
"
```

**If status is NULL:** Backend endpoint not working
**If status is COMPLETE:** Backend selection logic not filtering

---

## Success Criteria

**✅ Frontend is working correctly if:**

1. ✅ Page loads and shows a task
2. ✅ "Mark done" changes task AND updates progress bar
3. ✅ "Not today" changes task to different one
4. ✅ "Swap" replaces task with alternative
5. ✅ "+ Add another task" shows bonus card below
6. ✅ Empty state shows friendly message (not error)
7. ✅ All buttons show loading state during API calls
8. ✅ Errors show user-friendly messages
9. ✅ No console errors in browser
10. ✅ All Network requests return 200 status

---

## Product Rules Verification

Confirm these rules are enforced:

1. **✅ Student sees 1 primary task** - Default shows ONE task card
2. **✅ Completing unlocks next** - After "Mark done", next task (sort_order+1) appears
3. **✅ Snooze hides task** - After "Not today", different task appears
4. **✅ Add another shows bonus** - Bonus task card appears below primary
5. **✅ No "Challenges" terminology** - UI only says "Task", not "Challenge"
6. **✅ Progress bar updates** - Visual feedback after completion
7. **✅ Goal context shown** - Task card shows which goal it belongs to

---

## Demo Script for Stakeholders (30 seconds)

1. Open `/student` → See task "Take diagnostic test"
2. Click "Mark done ✓" → Task changes to "Review math fundamentals", progress bar goes 0% → 20%
3. Click "+ Add another task" → Bonus task appears below
4. Click "Not today" on primary task → Different task appears
5. Show progress bar updated

**Message:** "The daily task loop works end-to-end. Students complete tasks, see progress, and unlock next tasks automatically."

---

## Automated Frontend Test (Optional)

```typescript
// cypress/e2e/student-tasks.cy.ts
describe('Student Task Loop', () => {
  it('completes full task lifecycle', () => {
    cy.login('test@example.com', 'password123');
    cy.visit('/student');

    // Test 1: Page loads with task
    cy.contains('Today\'s Task').should('be.visible');
    cy.get('[data-testid="task-title"]').should('not.be.empty');

    // Test 2: Mark done updates task
    cy.get('[data-testid="mark-done-btn"]').click();
    cy.wait(1000);
    cy.get('[data-testid="task-title"]').should('have.changed');

    // Test 3: Add another task
    cy.get('[data-testid="add-another-btn"]').click();
    cy.contains('Bonus Task').should('be.visible');
  });
});
```
