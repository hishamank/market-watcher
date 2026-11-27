# Skill sources and adaptations

Imported on 2026-11-27 from the owner's installed skill folders. All five installed `SKILL.md` files matched [mattpocock/skills at 6f7f7831a625f040a8e06a0e7954826b87ce775a](https://github.com/mattpocock/skills/tree/6f7f7831a625f040a8e06a0e7954826b87ce775a) byte for byte before the adaptations below. Supporting files and agent metadata are included. [skill-sources.json](skill-sources.json) records the SHA-256 of each imported file before adaptation. This establishes the imported snapshot, not the exact version used in every historical session.

The upstream [MIT license](licenses/matt-pocock-skills-MIT.txt) is retained. The `pr` skill's [original credits](../../.claude/skills/pr/CREDITS.md) attribute its visual guidance to Dex Horthy / Humanlayer's `show-me`; its frontmatter attribution is also preserved. These selected skills match Matt Pocock's collection; this import does not vendor Poteto's broader stack.

| Skill | Upstream path | Repository adaptation |
| --- | --- | --- |
| grill-with-docs | skills/engineering/grill-with-docs | Explicit relative links to both dependencies, glossary path, and direct-reading fallback without a Skill tool |
| grilling | skills/productivity/grilling | None |
| domain-modeling | skills/engineering/domain-modeling | Route glossary operations to `docs/glossary.md` and preserve its existing format |
| code-review | skills/engineering/code-review | Supply the GitHub tracker/spec context, remove the external setup dependency, require read-only evidence reporting, and provide a sequential fallback when delegation is unavailable or prohibited |
| pr | skills/engineering/pr | Use the repository glossary and require verify evidence/draft rules |

## Maintenance

The canonical copies are in `.claude/skills`; `.agents/skills` contains relative symlinks to the same files, including the existing verify skill. Preserve symlinks when checking out the repository. A harness that does not discover these directories can read the canonical files explicitly.

When updating, choose an upstream revision, compare it with the recorded snapshot, retain licenses and credits, reapply only documented adaptations, and update the hashes/provenance. Verify relative links and dependencies from a fresh checkout. Personal model configuration and unrelated skills are intentionally not imported.
