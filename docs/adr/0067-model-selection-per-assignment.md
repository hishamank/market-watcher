# Choose models per assignment

Status: accepted. Amends [ADR 0025](0025-unattended-agents-in-worktrees-never-merge.md).

ADR 0025 fixed an implementation/review model allowlist. During the build, the owner used additional model families for implementation and design consultation. Keeping the original list as current policy would misrepresent that work and tie future teammates to the original provider availability.

The owner or orchestrator chooses the model and effort for each assignment. Prefer review in a separate context and, when available, a different model family. An unavailable model is reported rather than silently substituted. The owner-only merge rule remains unchanged. This trades a uniform model roster for explicit choices that can follow availability and the task; the work is judged by its evidence, not by the model name.
