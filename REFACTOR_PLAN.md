# Product Simplification Refactor Plan

## Overview
Simplify from **Goals + Challenges** to **Goals → Objectives** model where:
- Goals = long-term tracks (SAT, College Apps, etc.)
- Objectives (GoalSteps) = daily tasks students complete one at a time
- Remove Challenges entirely from the product

---

## New Product Model

```
Goal (long-term track)
  └── Objectives (GoalStep) - daily tasks
      - Student sees 1 objective at a time
      - "Add another task" reveals next objective
      - Completion unlocks next objective
```

---

## Files to DELETE

### Backend Challenge Infrastructure
- ❌ `backend/app/challenges/models.py` (Challenge, Objective, UserChallengeProgress, etc.)
- ❌ `backend/app/challenges/routes.py` (Student challenge endpoints)
- ❌ `backend/app/admin/routes.py` (Admin challenge management - will refactor to goals-only)
- ❌ `backend/app/students/routes.py` (Today's Task with challenges - will refactor)

### Frontend Challenge Pages & Components
- ❌ `frontend/src/app/admin/challenges/page.tsx` (Challenge list page)
- ❌ `frontend/src/app/admin/challenges/[id]/page.tsx` (Challenge detail page)
- ❌ `frontend/src/components/TodayTaskCard.tsx` (Challenge-based today's task)
- ❌ `frontend/src/components/TaskTile.tsx` (Challenge tile component)
- ❌ `frontend/src/components/ChallengeTrack.tsx` (Challenge chain preview)
- ❌ `frontend/src/components/WhyThisAccordion.tsx` (Challenge description accordion)

---

## Files to MODIFY

### Backend

#### `backend/app/goals/models.py`
- ✅ Keep Goal model
- ✅ Keep GoalStep model (these are the "objectives")
- ✅ Keep UserGoalProgress
- ✅ Keep UserGoalStepProgress
- Ensure GoalStep has proper fields: title, description, points, sort_order, is_required

#### `backend/app/goals/student_routes.py`
- ✅ Keep and enhance student goal endpoints
- Enhance `GET /me/active-goal` to return richer data
- Ensure `POST /me/goal-steps/{step_id}/complete` works correctly

#### `backend/app/main.py`
- Remove challenge router imports
- Keep goal routes
- Keep notification routes

#### `backend/app/notifications/service.py`
- Update to reference goal_steps instead of challenges
- Update streak/deadline logic to work with objectives

### Frontend

#### `frontend/src/lib/api.ts`
- Remove challengeApi and studentApi.challenge methods
- Keep goalsApi
- Add objectivesApi (for goal steps)
- Keep notificationsApi

#### `frontend/src/app/student/page.tsx`
- Complete rewrite using new Goals → Objectives model
- New layout: Student Level → Achievements → Next Steps → Today's Task → Snapshot
- Fetch data from `/me/active-goal`
- Display current objective as "Today's Task"

#### `frontend/src/components/Navbar.tsx`
- Remove "Admin" link or update to show only Goals
- Keep notification bell

#### `frontend/src/app/admin/page.tsx`
- Update to show goals management only

#### `frontend/src/app/admin/goals/page.tsx`
- Enhance to manage both goals AND objectives (goal steps)
- Add inline objective management
- Remove challenge linking

---

## Files to CREATE

### Backend
- `backend/app/students/today_routes.py` - New simplified today's task endpoint
  - `GET /student/today` - Returns current goal + current objective

### Frontend Components
- `frontend/src/components/TodayObjectiveCard.tsx` - Single objective display
- `frontend/src/components/ObjectiveProgressTrack.tsx` - Visual goal progress
- `frontend/src/components/NextStepsPanel.tsx` - Notifications/reminders panel
- `frontend/src/components/StudentLevelCard.tsx` - Student level display
- `frontend/src/components/AchievementsCard.tsx` - Achievements placeholder
- `frontend/src/components/SnapshotCard.tsx` - Snapshot placeholder

---

## Implementation Steps

### Phase 1: Backend Foundation (Priority: HIGH)

#### Step 1.1: Verify Current Goal Models
- [x] Explore existing Goal + GoalStep models
- [ ] Ensure GoalStep has all needed fields (title, description, points, is_required, sort_order)
- [ ] Verify UserGoalStepProgress tracks completion correctly

#### Step 1.2: Create New Student Today Endpoint
- [ ] Create `GET /student/today` that returns:
  ```json
  {
    "current_goal": {
      "id": 1,
      "title": "SAT Prep",
      "description": "...",
      "progress": {
        "total_steps": 10,
        "completed_steps": 3,
        "percentage": 30
      }
    },
    "current_objective": {
      "id": 5,
      "title": "Complete Math Practice Set 1",
      "description": "...",
      "points": 100,
      "sort_order": 4,
      "is_required": true,
      "is_completed": false
    },
    "next_objective": {
      "id": 6,
      "title": "Review Vocabulary",
      ...
    },
    "all_objectives": [
      { "id": 1, "title": "...", "is_completed": true },
      { "id": 2, "title": "...", "is_completed": true },
      { "id": 3, "title": "...", "is_completed": true },
      { "id": 4, "title": "...", "is_completed": false },
      ...
    ],
    "second_slot_enabled": false
  }
  ```

#### Step 1.3: Enhance Objective Completion Endpoint
- [ ] Update `POST /me/goal-steps/{step_id}/complete`
- [ ] Mark step as complete
- [ ] Auto-activate next step
- [ ] Generate streak notification
- [ ] Return updated goal progress

#### Step 1.4: Update Admin Goal Routes
- [ ] Ensure `POST /admin/goals/{goal_id}/steps` creates objectives
- [ ] Ensure `PUT /steps/{step_id}` updates objectives
- [ ] Add ability to reorder objectives

### Phase 2: Frontend Foundation (Priority: HIGH)

#### Step 2.1: Create Core Components

**TodayObjectiveCard.tsx**
- Display single objective as primary task
- Show: title, description, points, progress indicator
- Action: "Mark Done" button
- Optional: "Add Another Task" button
- Show goal context (which goal this belongs to)

**ObjectiveProgressTrack.tsx**
- Visual breadcrumb/steps showing all objectives in goal
- Completed ✓ | Current (highlighted) | Locked (greyed)

**NextStepsPanel.tsx**
- Fetch from `GET /me/notifications`
- Show top 1-3 active reminders
- Each reminder: title, message, CTA button, dismiss
- Hide entirely if no notifications

**StudentLevelCard.tsx**
- Placeholder showing student level
- Calculate from completed objectives points (or use placeholder)

**AchievementsCard.tsx**
- Placeholder achievements display

**SnapshotCard.tsx**
- Placeholder snapshot display

#### Step 2.2: Rebuild Student Dashboard
- [ ] Rewrite `frontend/src/app/student/page.tsx`
- [ ] Layout order:
  1. StudentLevelCard
  2. AchievementsCard
  3. NextStepsPanel (conditional)
  4. TodayObjectiveCard
  5. SnapshotCard
- [ ] Fetch from `/student/today`
- [ ] Wire up mark done action
- [ ] Handle "add another task" flow

#### Step 2.3: Update API Client
- [ ] Remove challenge-related methods
- [ ] Add `objectivesApi.complete(stepId)`
- [ ] Add `studentApi.getTodayTask()`
- [ ] Add `studentApi.addSecondObjective()`
- [ ] Keep notifications methods

### Phase 3: Admin UI (Priority: MEDIUM)

#### Step 3.1: Simplify Admin Goals Page
- [ ] Update `frontend/src/app/admin/goals/page.tsx`
- [ ] Show goals list
- [ ] Inline objective management (add/edit/reorder objectives for each goal)
- [ ] Remove all challenge references

#### Step 3.2: Remove Challenge Admin Pages
- [ ] Delete `/admin/challenges` route
- [ ] Update admin navbar to remove challenges link

### Phase 4: Notifications Integration (Priority: MEDIUM)

#### Step 4.1: Update Notification Service
- [ ] Update `backend/app/notifications/service.py`
- [ ] Change references from `challenge_id` to `goal_step_id`
- [ ] Update notification generation logic

#### Step 4.2: Wire Up Frontend Panel
- [ ] Integrate NextStepsPanel into student dashboard
- [ ] Test notification display
- [ ] Test CTA links
- [ ] Test dismiss functionality

### Phase 5: Cleanup & Testing (Priority: HIGH)

#### Step 5.1: Remove Dead Code
- [ ] Delete all challenge-related backend files
- [ ] Delete all challenge-related frontend files
- [ ] Remove challenge migrations (or create migration to drop tables)

#### Step 5.2: End-to-End Testing
- [ ] Admin creates goal with 3 objectives
- [ ] Student logs in, sees first objective in "Today's Task"
- [ ] Student clicks "Mark Done" → objective completes, next one appears
- [ ] Student completes all objectives → sees "You're done for today 🎉"
- [ ] Verify notifications appear in Next Steps panel
- [ ] Verify "Add Another Task" shows second objective

---

## API Contract Changes

### Old (Challenge-based)
```
GET /student/today
→ Returns: primary_challenge, secondary_challenge, challenge_chain

POST /student/challenges/{id}/complete
→ Marks challenge complete
```

### New (Objective-based)
```
GET /student/today
→ Returns: current_goal, current_objective, next_objective, all_objectives

POST /me/goal-steps/{id}/complete
→ Marks objective complete, returns updated progress
```

---

## Database Changes

### Tables to Eventually Remove
- challenges
- objectives (challenge objectives)
- user_challenge_progress
- user_objective_progress
- user_challenge_preferences
- snoozed_challenges
- challenge_links

### Tables to Keep
- goals
- goal_steps (these are the "objectives")
- user_goal_progress
- user_goal_step_progress
- goal_links
- notifications

**Note**: We may not delete tables immediately to preserve data, but backend will stop using them.

---

## Testing Checklist

### Backend
- [ ] `GET /student/today` returns correct current objective
- [ ] `POST /me/goal-steps/{id}/complete` marks objective done
- [ ] Completion auto-activates next objective
- [ ] Admin can create goals with objectives
- [ ] Admin can reorder objectives

### Frontend
- [ ] Student dashboard shows correct layout
- [ ] "Today's Task" displays current objective
- [ ] "Mark Done" button works and refreshes UI
- [ ] "Add Another Task" reveals second objective
- [ ] Next Steps panel shows/hides based on notifications
- [ ] Progress track shows completed/current/locked objectives
- [ ] Admin can manage goals and objectives

### End-to-End
- [ ] New student can be assigned a goal
- [ ] Student sees first objective
- [ ] Student completes objective sequence
- [ ] Notifications generate correctly
- [ ] Goal completes when all objectives done

---

## Rollout Strategy

1. **Develop on feature branch** (`claude/simplify-to-goals-objectives`)
2. **Backend first** - Get new endpoints working
3. **Frontend parallel** - Build new components
4. **Test locally** - Verify full flow
5. **Deploy backend** - Ensure backward compatibility temporarily
6. **Deploy frontend** - Cutover to new UI
7. **Cleanup** - Remove old challenge code after validation

---

## Questions to Resolve

1. Should we preserve challenge data in database or migrate to goal_steps?
2. Do we need a migration script to convert existing challenges → goal steps?
3. What happens to users mid-challenge when we deploy?
4. Should "objectives" in UI be called "tasks" or "objectives"?

---

## Success Metrics

- ✅ Student sees one objective at a time
- ✅ "Mark done" works without errors
- ✅ Next objective auto-appears after completion
- ✅ Admin can manage goals + objectives easily
- ✅ Notifications panel shows real data
- ✅ No challenge references in UI
- ✅ Clean deployment with no dead routes

