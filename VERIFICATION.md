# Verification

## v0.1.0-rc.2

Qualification records the exact source revision and actual command results before release. The supported integration is Convex 1.45.0 with `@convex-dev/resend` 0.2.7.

This candidate also covers the successful empty stdout returned by the real Convex CLI for an empty
component table.

Retained limitation: inbox reads are bounded snapshots from the component table. The component does not expose mailbox cursors, so this package does not claim pagination.
