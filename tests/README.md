# Isometric room QA

`game.html` is the existing game. `game-room-3d.js` renders a first interactive
studio, reading the small `TycoonRoomBridge` adapter. It never buys an item or
changes money itself. Purchases, equipment, language, gender, and saved games
remain owned by the existing game.

The scene uses a shared cutaway shell with ten property-specific furnishing,
architecture, palette and window-scenery variants. It is not ten full buildings.
City, vineyard, countryside, Mediterranean coast and island scenery follow the
equipped property and the shared continuous day clock. Players can switch
to their original 2D room; that preference is local to their browser. WebGL
failure automatically leaves the original room usable.

Three.js 0.180.0 is vendored in `vendor/three/` with its MIT license, avoiding a
runtime dependency on a CDN. The scene geometry is created locally in code.

## Run

Install Playwright in a development environment and have Chrome installed.
Alternatively, point `PLAYWRIGHT_MODULE` at an existing Playwright module.

1. `node tests/serve.cjs`
2. In a second terminal: `node tests/room-3d-smoke.cjs`

`ROOM_QA_URL` can point at the published game for the same browser checks.
Screenshots go into ignored `test-results/`.

Tests use a separate browser profile and simulated game balances, never the
player's browser or saved data. Checks cover:

- Market/bank/shop navigation from the new room.
- Actual shop purchase, equipped home update, save/reload, and cash preservation.
- 2D/3D switching and graceful lack-of-WebGL fallback.
- Spanish, English, Chinese, and the locale observer regression.
- 320×568, 390×844 and 844×390 viewport bounds and separated touch targets.
- Dawn/day/sunset/night, day-clock rollover, and pause/resume.
- Starting a new slot after loading an existing slot without inheriting its cash.
- All ten property variants, theme switching, distinct market cards and charts.

The body `data-game-theme` selects the 2D arcade palette or the 3D studio palette
across the room, market, chart modal and mentor dialogue. On WebGL failure the
classic theme is restored. Changing the view does not mutate the saved economy.

Rendering caps pixel density and pauses its animation loop outside the home
screen or in a hidden tab. Mobile uses 30fps scheduling and 1024px shadow maps;
desktop uses 2048px shadows. Shadow updates are throttled independently.
Procedural wood, linen, plaster, environment reflections and contact shadows
add material detail without external texture downloads. The room includes
folded curtains, upholstered furniture and a rounded articulated character.
These checks do not substitute for testing battery use on physical phones or
for a future Google Play release audit.
