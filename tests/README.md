# Isometric room QA

`node tests/finance-smoke.cjs` covers fictional funds/pension withdrawals,
cost-based net worth (durable assets minus bank debt), saving, advisor portraits
and 2D character scaling. The pension holding period is 30 game days and early
withdrawals cost 5% per immature lot. These are invented game products, not
real funds or real-world pension rules.

`node tests/career-smoke.cjs` verifies the starter journey, opt-in fixed cash
reserve, quick-buy sizing, long/short reserve enforcement and save/reload.
The reserve protects only new personal market positions, not business/home
spending, existing position losses or funded accounts. It defaults to zero.
Career tools unlock from the highest owned home; forecasts use current passive
income and explicitly exclude expenses. No extra cash rewards are minted.
This is an initial implementation across the gameplay roadmap, not a completed
redesign of every house shell or an exhaustive legacy translation audit.

`game.html` is the existing game. `game-room-3d.js` renders a first interactive
studio, reading the small `TycoonRoomBridge` adapter. It never buys an item or
changes money itself. Purchases, equipment, language, gender, and saved games
remain owned by the existing game.

The scene uses a shared cutaway shell with ten property-specific furnishing,
architecture, palette and window-scenery variants. It is not ten full buildings.
Property identity includes weathered plaster/cracks and exposed brick in the
starter room, brickwork in the loft, country timber, formal paneling and marble.
Outdoor lots include an alley, balcony, pool terrace, formal fountain garden,
and headquarters terrace, as well as the countryside and coastal plots.
City, vineyard, countryside, Mediterranean coast and island scenery follow the
equipped property and the shared continuous day clock.
The countryside and coastal variants also include outdoor 3D grounds around
the house: garden paths, vineyard rows, beach, palms and water. Camera fitting
includes this plot and is checked in portrait mobile views.
Players can switch to their original 2D room; that preference is local to their browser. WebGL
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
`node tests/room-camera-smoke.cjs` checks camera preference persistence, reset,
recovery from invalid preferences, and the outdoor night scene on mobile.
Camera preferences are stored separately from the game save. Outdoor lamps
share emissive materials and light-pool textures, without extra shadow lights.

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
- View dialog: interior/landscape selection, bounded zoom and reset controls.

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
