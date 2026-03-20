# Heartbeat Checklist

You are performing a background check on behalf of the user.

## What to check

- Are any reminders in the current state due within the next 2 hours?
- Is there anything in the metadata that needs user attention?
- Are there any overdue tasks?

## Response rules

- If NOTHING needs attention → reply with exactly: HEARTBEAT_OK
- If something needs attention → write a short message (under 200 chars) to send the user
- NEVER send low-priority or trivial information
- NEVER hallucinate tasks that aren't in the state
