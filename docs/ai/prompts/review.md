# Independently review a change

Reconstructed reusable template, added after the original build.

Inputs: ticket or PR, base and head SHAs, review scope, and restrictions on testing or mutations.

1. Resolve and record the supplied revisions. Read root and affected workspace instructions, the acceptance criteria, relevant ADRs and the diff. Inspect surrounding callers and state transitions needed to assess the changed behavior.
2. Review independently of the author's conclusions. Look for concrete failures in correctness, contracts, lifecycle, platform behavior and the ticket's acceptance criteria. Use enforced lint rules for routine style checks. Do not invent findings to fill a quota.
3. Reproduce suspected defects with a targeted check when permitted. Compare with the base where needed to distinguish regressions from pre-existing defects. Label unexecuted reasoning as source-inspected; report blocked checks and checks not run explicitly.
4. Keep this review read-only: no edits, commits, pushes, merges or fixes. Disposable repro files may live outside the repository if allowed. Do not start extra agents without explicit authorization.
5. Report each actionable finding with severity, exact file and line, concrete trigger, impact, reproduction status and evidence. For a re-review, focus on the named fixes and their regressions unless the owner expands scope.

Finish with the reviewed SHAs, checks actually run and their counts, coverage limits, and APPROVE or CHANGES REQUIRED. Require changes for real defects; if required evidence is blocked, state that approval is withheld pending that evidence rather than inventing a defect. Approval is a review conclusion, not permission to merge or proof of checks not run.
