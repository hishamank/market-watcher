# Portable AI workflow and reviewable evidence

Date: 2026-11-27. Status: accepted. Amends [ADR 0025](0025-unattended-agents-in-worktrees-never-merge.md).

## Context

The repository described planning, implementation and independent review but committed only the verification skill. Its shared instructions did not state every guardrail claimed in the README. Local evidence paths also left reviewers without an accessible record of a verification run.

## Decision

Vendor the owner's selected skills (`grill-with-docs`, `code-review`, `pr`) and the grilling/domain-modeling dependencies in `.claude/skills`, with relative aliases in `.agents/skills`. Retain source attribution, licenses and local file hashes. Document repository adaptations in `docs/ai/SOURCES.md`. Keep supplementary reconstructed implementation/fix prompts and the workflow index in `docs/ai`. Clearly separate these reusable templates from the historical build account; do not claim they are recovered transcripts. Keep common guardrails in root `CLAUDE.md`, shared through `AGENTS.md` symlinks, and describe Claude settings as tool-specific restrictions.

The owner or orchestrator supplies models and effort for each assignment. Prefer independent review across model families when available, with no silent provider substitution. This supersedes ADR 0025's original fixed model allowlist. Its owner-only merge rule remains in force.

Verification reports identify the tested commit and any uncommitted changes, commands, environment and reviewer-accessible evidence. Required FAIL or BLOCKED results keep the PR in draft. Evidence from before a code change cannot establish verification of the new code; record any documentation-only changes after a run explicitly.

## Consequences

A fresh checkout explains how to repeat the workflow without personal prompt files. Prompt maintenance is part of repository documentation. Raw local evidence stays ignored; sanitized output and selected artifacts must be included in or attached to the PR for reviewers. The templates do not provision agent accounts or sandbox the host.
