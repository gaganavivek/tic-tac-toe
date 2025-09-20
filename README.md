# Tic-Tac-Toe

This is a Tic-Tac-Toe web app built with Next.js (App Router) and Postgres.

Features
- Full game persistence (games + moves)
- Server-side move validation and atomic transactions
- Undo, reset, matchmaking endpoints
- Game logic in `src/utils/ttt.ts`

Local setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Start Postgres locally (recommended):

```bash
docker-compose up -d
# then run the SQL migration
psql $DATABASE_URL -f prisma/migrations/001_init.sql
```

3. Install and run:

```bash
# install deps
npm install
# dev server
npm run dev
```

APIs
- `POST /api/games` — create a game
- `GET /api/games` — list games
- `GET /api/games/:id` — get game + moves
- `PUT /api/games/:id/move` — make a move (atomic)
- `GET /api/games/:id/moves` — moves list
- `POST /api/games/:id/undo` — undo last move
- `POST /api/games/:id/reset` — reset board
- `POST /api/games/matchmake` — quick matchmaker

Testing
- Unit tests for game logic are in `src/utils/ttt.spec.ts` (Jest).

Notes
- Some dev dependencies may need to be installed manually (TypeScript, jest, etc.).
- I implemented core backend and a minimal frontend under `src/app/game/[id]`.