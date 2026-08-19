This directory contains database migration and seed files for the backend.

How to run migrations (local):

1. Install dependencies in backend:
   cd backend
   npm install

2. Configure environment variables (see .env.example in backend or create .env):
   DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, etc.

3. Run migrations:
   npm run migrate

4. Run seeds (after migrations complete):
   npm run seed

Notes:
- The initial migration runs raw SQL from migrations/001_initial_schema.sql to create core tables. For production, review the SQL and split into per-table migrations if desired.
- Always backup your database before running migrations in production.
