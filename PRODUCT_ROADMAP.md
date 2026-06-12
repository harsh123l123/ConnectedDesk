# ConnectedDesk Product Roadmap

ConnectedDesk is a team workspace product for small teams and student/project groups. The current app already has the core collaboration surface: authentication, dashboard, tasks, calendar/meetings, chat, resources, whiteboard, profile/settings, realtime sockets, and frontend tests.

## Product Positioning

ConnectedDesk should feel like a focused collaboration hub: less heavy than Jira/Teams/Notion, but complete enough for a team to plan work, talk, share files, schedule meetings, and track progress from one place.

## MVP User Journey

1. A user registers or signs in.
2. They land on a dashboard showing pending tasks, meetings, unread chats, and recent activity.
3. They create tasks, assign teammates, add subtasks/comments, and move work across a Kanban board.
4. They schedule meetings and see them in the calendar.
5. They chat with team members in realtime.
6. They upload/download shared resources.
7. They use a shared whiteboard for quick visual collaboration.
8. They manage their profile, theme, and session from settings.

## Release Milestones

### Milestone 1: Stabilize The Existing App

- Fix all lint errors and keep lint/build/test green.
- Remove unused imports and dead state.
- Clean mojibake/encoding artifacts in UI strings.
- Normalize form validation and error handling.
- Add server health check and consistent API error responses.
- Add `.env.example` files for client and server.
- Expand README with setup, scripts, and deployment steps.

### Milestone 2: Product-Grade Auth And Teams

- Require a valid `JWT_SECRET` in production.
- Add password reset flow suitable for production email.
- Add team/workspace model so users can belong to shared workspaces.
- Scope tasks, meetings, chats, files, and whiteboards to a workspace.
- Add roles: owner, admin, member.
- Add invite flow for teammates.

### Milestone 3: Collaboration Polish

- Persist whiteboard documents instead of in-memory server history.
- Add chat attachments and reliable unread counters.
- Add meeting attendees and reminders.
- Add task activity history.
- Add notifications center backed by server data.
- Add file metadata, previews, and storage limits.

### Milestone 4: Deployment Readiness

- Add server tests for auth, tasks, meetings, resources, and chat routes.
- Add request validation and rate limiting.
- Add production CORS policy with explicit origins.
- Add file upload size/type protections.
- Add logging strategy and basic observability.
- Split large client bundle with route-level lazy loading.
- Prepare deployment configs for Vercel/Netlify client and Render/Railway server.

### Milestone 5: Differentiators

- Improve the AI assistant into a useful command layer for tasks, meetings, and summaries.
- Add dashboard insights: overdue work, workload by user, weekly progress.
- Add universal search across tasks, messages, meetings, and resources.
- Add mobile-first polish for daily use.

## Immediate Engineering Backlog

1. Fix lint errors and React hook ordering.
2. Replace corrupted emoji/text sequences with clean labels or icons.
3. Add `.env.example` files.
4. Add server test framework and first route tests.
5. Add route-level lazy loading to reduce the production bundle.
6. Add workspace/team data model.
7. Persist whiteboard sessions in MongoDB.

## Current Verification Snapshot

- Client tests: passing, 39 tests across 12 files.
- Client production build: passing after script fix.
- Client lint: passing with warnings after automation setup.
- Full root check: available through `npm run check`.
