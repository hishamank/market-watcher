# A two-option language switch on web

Amends ADR 0051 on web. Mobile keeps the single text button.

The web header now shows both languages, "EN" and "ع", with the current one filled. A single button that names the other language works, but it never says which language you are in. Two options show it at a glance and match the other segmented controls in the header row.

- **The order stays EN then ع in both directions.** The switch is pinned `dir="ltr"`, so pressing ع never makes ع jump to the other side under the pointer. The switch as a whole still moves to its mirrored place in the header.
- **The motion copies Finsweet's Weglot UI kit, example 3.** The new option's fill slides in, and the old one slides out 100 ms later, so the block looks like it travels across. The labels swipe out in the direction of travel and come back in from behind, with their colours swapped while they are out of sight. The timings and easings are copied from the kit's Webflow interaction: 600 ms in all. It is plain CSS transitions and keyframes, with no new dependency.
- **Our theme, not theirs.** The fill is `color.text` with `color.bg` text, the same ink block as the solid button, so it works in both colour schemes.
- **It keeps its own view transition.** The flip to Arabic cross-fades the page (ADR 0051), and that fade would hide most of the slide. The switch gets its own `view-transition-name` and the `morph` class: it glides to its new place, its old image is hidden, and its new image plays live.
- **ع is centred by its ink, not its line box.** The Arabic glyph hangs below the Latin baseline, so its label is raised by 0.3em to sit in the middle of the cell like "EN".
- **Accessible names are the full language names.** Each option is a button with `aria-pressed`, a `lang` attribute and the name "English" or "العربية". The group is labelled "Language". Reduced motion turns off the slide, the swipe and the glide.

The catalogue gains `language.label`, `language.english`, `language.englishShort`, `language.arabic` and `language.arabicShort`. `language.switch` stays for mobile.

> **Design note:** "One button that names the other language is the minimum, but it never tells you where you are. Two options do, and I pinned their order so the one you press never jumps under your finger when the page mirrors. I copied the slide from a public UI kit's timings, with our ink colours, and gave the switch its own view transition so the page's cross-fade doesn't swallow it."

## Considered options

- **Keep the single button:** fewest pixels and already shipped, but it doesn't show the current language.
- **Reuse `SegmentTrack`:** consistent with the range tabs, but its indicator measures positions in JavaScript and has a different motion. The kit's slide needs only two clipped fills per option.
- **Let the order mirror in Arabic (ع then EN):** logical, but the pressed option would jump to the other side mid-animation.
