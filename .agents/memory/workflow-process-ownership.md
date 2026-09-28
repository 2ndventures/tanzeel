---
name: Workflow process ownership
description: Avoid detached dev-server processes competing for the preview port.
---

Use a direct Node invocation as the managed development workflow command instead of wrapping the server in `npm run dev` and the `tsx` CLI.

**Why:** In this environment, stopping or restarting the npm/tsx launcher left child server processes detached and still listening on the preview port. Subsequent workflow launches failed with `EADDRINUSE` even while a stale app response was available.

**How to apply:** When changing the dev workflow, preserve direct process ownership and verify that stopping/restarting it leaves only one server listening on the configured preview port. Do not work around the conflict by moving the app to a different port.