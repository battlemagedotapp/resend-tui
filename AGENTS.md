# Working agreement

- Keep the programmatic API Node-compatible and free of terminal side effects.
- Support only the Convex Resend component. Do not add public endpoints or direct Resend API access.
- Keep commands read-only and pass arguments without shell interpolation.
- Add reusable behavior tests here rather than duplicating them in consumers.
- Releases are compiled immutable Git tags created only by the manual Release workflow.
- Do not move an existing release tag or add consumer lifecycle/build scripts.
