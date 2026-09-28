---
name: Workflow process ownership
description: Avoid detached dev-server processes competing for the preview port.
---

Use a single managed development workflow with direct Node invocation; do not retain a separate legacy default Run command that can launch another server on the same port.

**Why:** In this environment, restarting the workflow did not stop separately launched `npm run dev` processes from the default Run path. Those processes became detached, kept listening on the preview port, and made later workflow launches fail with `EADDRINUSE` even while a stale app response was available. Switching the managed workflow to direct Node alone did not prevent the recurrence.

**How to apply:** Keep the Run button assigned to the managed workflow, with no separate legacy Run command; verify that only one server listens on the configured preview port. Do not work around the conflict by moving the app to a different port.