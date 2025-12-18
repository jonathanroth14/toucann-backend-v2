# How to Get Your User ID

## Method 1: From JWT Token (Decode)

Your JWT token contains your email in the `sub` field. Decode it to get your email, then query the database.

### Online Decoder
1. Go to https://jwt.io
2. Paste your JWT token in the "Encoded" field
3. Look at the "Payload" section for the `sub` field (your email)

### Command Line (using jq)
```bash
# Extract the payload from JWT (second part between dots)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq

# Example output:
# {
#   "sub": "your-email@example.com",
#   "exp": 1734567890
# }
```

Then query the database:
```sql
SELECT id, email, is_active, is_admin FROM users WHERE email = 'your-email@example.com';
```

---

## Method 2: Via API Endpoint

Use the `/auth/me` endpoint to get your user info:

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
```

---

## Method 3: Direct Database Query

If you have database access:

```bash
# Using Railway CLI
railway run psql -c "SELECT id, email, created_at FROM users ORDER BY created_at;"

# Using connection string
psql "$DATABASE_URL" -c "SELECT id, email, created_at FROM users ORDER BY created_at;"
```

---

## Method 4: From Backend Logs

When you make API calls, the backend can log the user ID. Add this temporarily to any endpoint:

```python
print(f"DEBUG: Current user ID: {current_user.id}")
```

Then check Railway logs after making a request.

---

## Verify Progress for Your User

Once you have your `user_id`, check progress:

```sql
-- Replace 1 with your actual user_id
SELECT
    ugsp.id,
    u.email,
    g.title as goal_title,
    gs.title as step_title,
    ugsp.status,
    ugsp.completed_at
FROM user_goal_step_progress ugsp
JOIN users u ON ugsp.user_id = u.id
JOIN goal_steps gs ON ugsp.step_id = gs.id
JOIN goals g ON gs.goal_id = g.id
WHERE ugsp.user_id = 1
ORDER BY ugsp.completed_at DESC;
```

Check snoozed tasks:

```sql
-- Replace 1 with your actual user_id
SELECT
    sgt.id,
    u.email,
    gs.title as step_title,
    sgt.snoozed_at,
    sgt.snoozed_until,
    CASE
        WHEN sgt.snoozed_until > NOW() THEN 'STILL SNOOZED'
        ELSE 'EXPIRED'
    END as snooze_status
FROM snoozed_goal_tasks sgt
JOIN users u ON sgt.user_id = u.id
JOIN goal_steps gs ON sgt.step_id = gs.id
WHERE sgt.user_id = 1
ORDER BY sgt.snoozed_at DESC;
```
