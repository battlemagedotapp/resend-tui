# Verification

## v0.1.1-rc.1 — 2026-09-15

- Message detail refreshes now update delivery and activity metadata as well as message content.
- Package and Git-installation fixtures use the system temporary directory instead of accumulating
  ignored release directories in the source checkout.

## v0.1.0 — 2026-09-14

The implementation qualified as `v0.1.0-rc.3` (source
`1f8936f1ea2a90c6cd3b06aa14b1037b4f82e5a9`). Stable changes only the version and this
record. The supported integration is Convex 1.45.0 with `@convex-dev/resend` 0.2.7.

- `pnpm verify`: 15 controlled tests plus types, lint, formatting, and both compiled entry formats
  passed.
- `pnpm test:package` and `pnpm test:git`: declarations, executable startup, ESM import, CommonJS
  `require()`, and compilation-free installation passed.
- `pnpm test:integration`: list, delivered wait, and detail reads passed against the isolated Auth
  Client development component in 9 seconds.
- Auth Client's real invitation/verification journey passed in 51.5 seconds. Gaia's two retained
  email journeys passed in 2 minutes 38 seconds, including consumption through Playwright's
  CommonJS loader.

The suite covers the successful empty stdout returned by the real Convex CLI for an empty component
table. Node programmatic imports do not initialize OpenTUI, Bun, or filesystem reads.

Retained limitation: inbox reads are bounded snapshots from the component table. The component does not expose mailbox cursors, so this package does not claim pagination.
