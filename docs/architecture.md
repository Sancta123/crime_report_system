# Sentinel Architecture

## Frontend

- Browser-rendered React console
- Local persistence for offline-first continuity
- Module-based workspace for cases, evidence, officers, CCTV, suspects, identity, analytics, and security

## Backend

- Node.js and Express host
- JWT authentication and RBAC are expected in the full API layer
- REST endpoints should be added per entity: cases, evidence, officers, suspects, cameras, verifications, audit logs

## Data

- MySQL schema lives in `database/schema.sql`
- Seed data lives in `database/seed.sql`
- Migration bootstrap lives in `database/migrations/001_initial_schema.sql`

## Security

- Least privilege
- Audit logging for all sensitive access
- No raw biometric templates stored in Sentinel
- API-level permission enforcement required for production use
