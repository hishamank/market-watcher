# Skill sources and adaptations

Imported on 2026-11-27 from the owner's installed skill folders. All five installed `SKILL.md` files matched [mattpocock/skills at 6f7f7831a625f040a8e06a0e7954826b87ce775a](https://github.com/mattpocock/skills/tree/6f7f7831a625f040a8e06a0e7954826b87ce775a) byte for byte before the adaptations below. Supporting files and agent metadata are included.

I used these skills during development; this snapshot may not match the exact version used in each session. The [behavioral-review brief](prompts/review.md) was reconstructed after the build. These files are reusable workflows, not original session transcripts.

The upstream [MIT license](licenses/matt-pocock-skills-MIT.txt) is retained. The `pr` skill's [original credits](../../.claude/skills/pr/CREDITS.md) attribute its visual guidance to Dex Horthy / Humanlayer's `show-me`; its frontmatter attribution is also preserved. These selected skills match Matt Pocock's collection; this import does not vendor Poteto's broader stack.

| Skill | Upstream path | Repository adaptation |
| --- | --- | --- |
| grill-with-docs | skills/engineering/grill-with-docs | Explicit relative links to both dependencies, glossary path, and direct-reading fallback without a Skill tool |
| grilling | skills/productivity/grilling | None |
| domain-modeling | skills/engineering/domain-modeling | Route glossary operations to `docs/glossary.md` and preserve its existing format |
| code-review | skills/engineering/code-review | Discover the GitHub tracker from the supplied URL or checkout and supply spec context, remove the external setup dependency, require read-only evidence reporting, and provide a sequential fallback when delegation is unavailable or prohibited |
| pr | skills/engineering/pr | Use the repository glossary and link to verify for evidence/status rules |

## Maintenance

The canonical copies are in `.claude/skills`; `.agents/skills` contains relative symlinks to the same files, including the existing verify skill. Preserve symlinks when checking out the repository. A harness that does not discover these directories can read the canonical files explicitly.

When updating, choose an upstream revision, compare it with the recorded snapshot, retain licenses and credits, reapply only documented adaptations, and update the pinned source and adaptation notes. Verify relative links and dependencies from a fresh checkout. Personal model configuration and unrelated skills are intentionally not imported.

To check local Markdown file links from the repository root (excluding examples in code fences and remote URLs), run:

```bash
python3 - <<'PYTHON'
from pathlib import Path
import re
paths = [Path('README.md'), Path('CLAUDE.md')]
paths += list(Path('docs/ai').rglob('*.md'))
paths += list(Path('.claude/skills').rglob('*.md'))
for path in paths:
    prose = re.sub(r'```.*?```', '', path.read_text(), flags=re.S)
    for link in re.findall(r'\]\(([^)]+)\)', prose):
        if '://' not in link and not link.startswith('#'):
            target = path.parent / link.split('#')[0]
            assert target.exists(), f'{path}: {link}'
print('Local file links resolve; URL and heading fragments were not checked')
PYTHON
```
