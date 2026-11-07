# Notes for AI agents

Read `STATUS.md`, then `IMPLEMENTATION_PLAN.md`, before touching code.

- Work one milestone at a time. `PROJECT_SPEC.md` (with its Amendments) is the source of truth.
- **Milestones 2, 3 and 5 are written by Saif.** In those, review his diffs, propose test cases and
  explain trade-offs; don't write the implementation unless he asks for a specific piece.
- Never claim a test, coverage, Lighthouse or deploy result you didn't run in this session.
- No proxy, no `dangerouslySetInnerHTML`, no `any` for untrusted data, no fetch in components.
- Never add `Co-Authored-By: Claude`, Claude-Session links or "Generated with Claude Code" lines.
- Branch, then PR, then merge. Never force-push `main`.
- Run `npm run ci` before saying a change is done.
