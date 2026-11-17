# Bouquet page

Open `/bouquet.html` through a static HTTP server. No build or package installation is required. The existing GitHub Pages deployment can serve these files directly.

```sh
python3 -m http.server 8765
```

Birthday wording is in `content.js`. Its strings are supplied by Raymond and stay unchanged: “I bought this new set, wanna build it together?”, “Happy birthday Neemo :>”, and “Love, Remi”. Empty per-flower notes stay hidden. The birthday greeting appears after wrapping, and the signature is attached to the actual 3D gift tag.

The page has one 3D assembly view. Each of the three purple tulips has seven pieces; each of the two orange calendula has ten, for 41 attachments in total. Stems, individual leaves, and smaller petal sections are assembled separately. `view-3d.js` constructs closed volumetric flower meshes, including the loose pieces in the tray, and uses OrbitControls for orbit and zoom. `icons.js` contains only the small flower-picker illustrations. Three.js r170 and its MIT license are vendored locally; no runtime CDN is required for the bouquet itself.

Tulip order is stem, left leaf, right leaf, three individual outer petals, and the inner crown. Calendula order is stem, left leaf, right leaf, four outer sectors containing 19 petals in total, two inner halves containing 15 petals, and the center with pollen.

Pick up the available piece from the 3D tray and drag it to its matching attachment point on the flower. The loose mesh follows the pointer. Forgiving proximity snapping completes a successful attachment; a missed drop or canceled drag returns the piece to its tray position without advancing progress. Orbit gestures remain separate from piece dragging.

For keyboard assembly, focus the assembly control, press Enter or Space to pick up the available piece, move it with the arrow keys, then press Enter or Space again to drop it. Escape cancels. Keyboard placement uses the same moving mesh and proximity check as pointer placement. Clicking the flower or a tray piece does not attach a part.

The 3D view exposes `beginKeyboardDrag(stage?)`, `moveKeyboardDrag(dx, dy)` in CSS pixels, `finishKeyboardDrag()`, `cancelDrag()`, and a `dragging` getter. Its optional `onDragChange(boolean)` callback lets the host disable conflicting controls. `onPlace(id, stage)` fires once, after a successful drop animation. A canceled pointer, lost pointer capture, window blur, a second pointer, or a state change cancels the current drag without placing a part. Camera reset, auto-rotation changes, and a real canvas resize also cancel an active drag.

The arrow moves to the next unfinished flower; the ribbon wraps the completed bouquet. Undo unwraps before removing a piece. The final left/right arrows swap the selected stem with its neighbor. Sound is optional and starts only after enabling its control.

`arrangement.js` provides renderer-independent bouquet geometry. `getBouquetArrangement(order)` returns the five head transforms, exact curved-stem samplers, safe connector frames, and leaf transforms. All lower shafts converge into a tight bundle inside a conservative envelope of the real paper cone; every leaf volume starts above its highest rim. The renderer must build tubes directly from `stem.sample(t)`, rather than fitting an interpolating spline that could overshoot the bounds. `wrapperPoint(u, v)` defines the matching wavy paper profile, and `WRAPPER.groundOffsetY` places its base just above the ground.

The wrapping geometry helpers use a normalized clock: `wrappingProgress(t)` produces gather, paper lift, left fold, right fold, band, bow, and tag phases over `WRAP_DURATION_MS` (2.6 seconds). `wrappingSurfacePoint(u, v, t)` supplies real paper vertices from an open sheet resting on the desk to the exact final cone. Surface thickness and normals belong to the renderer. This transition changes the paper geometry; it is not an opacity reveal.

The renderer starts wrapping when a later `update(state)` changes `wrapped` from false to true. Its first supplied saved state renders directly at rest, so reopening an already wrapped bouquet does not replay the animation. `onTransitionChange(boolean)` and the `busy` getter cover both the 0.8-second delivery of a finished flower and wrapping; the host uses them to prevent conflicting interactions. `data-transitioning` and `data-transition-phase` expose transition state for inspection. Reduced motion completes the transitions at their final geometry.

```sh
node --test bouquet/state.test.mjs bouquet/drag-math.test.mjs bouquet/arrangement.test.mjs
```

`state.js` validates version-2 progress and stores it under the existing `tasneemode.bouquet.v1` key on the current origin. Old four-stage saves migrate to equivalent completed checkpoints: tulips `[0, 1, 3, 6, 7]`, calendula `[0, 1, 3, 7, 10]`. Selected flower, bouquet order, finished flowers, and a valid wrapped state are preserved. Canceling a drag resets only the loose piece; it does not clear the saved bouquet. Storage failures leave the page usable for the current visit. A WebGL or module failure is handled by the page; there is no 2D assembly fallback.
