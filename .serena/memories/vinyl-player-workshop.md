Vinyl player workshop mode (as of 2026-07-18 follow-up):
- Default widgetMode: workshop; createVinylWindow loads vinyl-workshop.html | vinyl-remake.html | vinyl-player.html.
- enableButtonFeature defaults true; runtime and settings UI treat unset as enabled (!== false).
- forge extraResource includes vinyl-workshop.html + assets/; verify-package-assets.mjs checks them.
- Assets present: turntable-base, tonearm, switch-*, knob, workshop-bg, chill-night.
- geode.png / geode-stand.png: NEVER in git history or workspace; workshop HTML has CSS fallbacks; workshop-bg already shows geodes in photo.
- chill-night.png: present but UNUSED — lo-fi night side-view with tablet; does not match top-down workshop-bg turntable composition, so one-line background swap would misalign overlays.
- Do not reintroduce altar-app / DID folders.