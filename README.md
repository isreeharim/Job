# Remote Job Hunter

AI-powered remote/WFH job discovery and tracking.

## Phases

- [x] Phase 1 — Foundation
- [x] Phase 2 — Live job ingestion
- [x] Phase 3 — AI matching engine
- [x] Phase 4 — Database & authentication
- [x] Phase 5 — Notifications
- [ ] Phase 6 — Production deployment

## Phase 2

The app fetches live remote opportunities through a server-side ingestion layer, exposes them at `/api/jobs`, and includes a protected cron endpoint at `/api/cron` for scheduled checks.