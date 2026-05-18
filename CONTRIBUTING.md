# Contributing to Trivium

Thanks for your interest. Trivium is AGPL-3.0 — by submitting a pull request, you agree your contribution is licensed under AGPL-3.0-only.

## Local development

```bash
git clone https://github.com/KaiMOdev/trivium.git
cd trivium
npm install
cp api/.env.example api/.env
npm run dev
```

That's it. The scanner works without any env keys.

## Branching

- Branch from `origin/main` for every change. Don't reuse old branches.
- Branch name pattern: `fix/<short-desc>`, `feat/<short-desc>`, `docs/<short-desc>`, `refactor/<short-desc>`.
- One concern per PR. If you have two unrelated changes, send two PRs.

## Tests

```bash
npm test            # both api and app
npm run test:api    # backend only (Jest)
npm run test:app    # frontend only (Vitest)
```

Some pre-existing tests in the SEO / LLM / marketing suites fail due to threshold mismatches — these are inherited from the codebase's prior life and not blocking. New PRs should not introduce new failures; if you're touching a check, please update its tests.

## Code style

- Backend (`api/`): CommonJS, 2-space indent, no semicolon-strict rule.
- Frontend (`app/`): ESM, React 19 with hooks, inline styles (no CSS modules). Theme tokens live in [`app/src/config/theme.js`](app/src/config/theme.js).
- No TypeScript. Trivium is a JS-only project — please don't introduce TS in a PR without prior discussion.
- Add a comment only when the *why* is non-obvious. Identifier names should carry the *what*.

## Reporting bugs

Open an issue with:
- The URL you scanned (or a public reproducer).
- The exact error or unexpected output.
- What you expected.
- Browser + OS for frontend issues.

For checks that grade incorrectly, link to authoritative documentation (Google, Schema.org, W3C, etc.) that supports your reading.

## Adding a new check

1. Decide which category (`api/checks/seo.js`, `llm.js`, `marketing.js`).
2. Implement a function returning `{ label, score, detail, status? }`.
3. Add a weight in the `SEO_WEIGHTS` / `LLM_WEIGHTS` / `MARKETING_WEIGHTS` maps in [`api/index.js`](api/index.js).
4. If the check is irrelevant for some page types, add an entry to [`api/config/checkApplicability.js`](api/config/checkApplicability.js).
5. Add a Jest test in `api/__tests__/`.
6. Add explanation copy in [`app/src/config/explanations.js`](app/src/config/explanations.js) so users see context in the UI.

Checks must be **deterministic** — no third-party API calls, no LLM dependencies. Anything that needs external credentials or AI inference belongs in the commercial product, not this repo.

## Discussion before code

For anything bigger than a bug fix or single new check, open an issue first so we can align on the approach. This saves you from writing a PR that gets rejected on scope grounds.
