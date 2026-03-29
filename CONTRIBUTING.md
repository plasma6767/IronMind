# Contributing

## Development Setup

```bash
# Prerequisites: Node.js v18+, pnpm v8+, Wrangler v3+
pnpm install
cp .env.example .env
```

See the README for full environment setup instructions.

## Branch Strategy

- `main` — production-ready code, deployed to Cloudflare
- `dev` — integration branch for in-progress features
- Feature branches: `feature/<description>` (e.g. `feature/mindset-challenge-evaluation`)
- Bug fixes: `fix/<description>`

All changes go through pull requests into `dev`. Only `dev` → `main` merges trigger production deployment.

## Commit Style

Use conventional commit prefixes:

```
feat: add PRE_WALL challenge evaluation logic
fix: correct session state transition at avg quit minute
refactor: extract prompt assembly into dedicated module
chore: update wrangler to v3.40
```

Keep commits atomic. One logical change per commit.

## Pull Requests

- Fill out the PR template completely
- Every PR must have a clear "Definition of Done" — what does working look like?
- Include the relevant day from the build order if applicable
- Don't ship untested Worker changes — test with `wrangler dev` locally first

## Testing Worker Changes

```bash
# Run Worker locally with emulated Durable Objects and R2
cd worker
pnpm dev

# Test the LLM endpoint directly
curl -X POST http://localhost:8787/llm-endpoint \
  -H "Content-Type: application/json" \
  -d '{"messages": [...], "athlete_id": "test-uuid"}'
```

## Durable Object Schema Changes

Schema changes to `AthleteObject` must be backwards-compatible. Existing athlete data cannot be migrated automatically — any new fields must have safe defaults when missing.

If a schema change is breaking, document it in `CHANGELOG.md` and note the migration path.

## Prompt Changes

All prompt templates live in `worker/src/prompts/index.ts`. When modifying prompts:

1. Test the change against multiple session states (EARLY, PRE_WALL, AT_WALL)
2. Test against edge cases: first session (no history), breakthrough session, post-loss reset
3. Verify banned words are not present: `journey`, `warrior`, `champion`, `grind`, `beast`, `mindset`, `believe`, `hustle`
4. Check the 30–40 word limit on cut mode messages

## Code Style

- TypeScript strict mode throughout
- No `any` types — if the type is unknown, use `unknown` and narrow it
- Errors should be handled explicitly — no silent failures in session logic
- Worker route handlers: thin, delegate to modules
- Prompt assembly: pure functions, no side effects

## Questions

Open an issue with the `question` label or reach out directly.
