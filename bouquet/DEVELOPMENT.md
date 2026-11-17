# Bouquet page

Open `/bouquet.html` through a static HTTP server. No build or package installation is required. The existing GitHub Pages deployment can serve these files directly.

```sh
python3 -m http.server 8765
```

Birthday wording is in `content.js`. Its strings are supplied by Raymond and stay unchanged: “I bought this new set, wanna build it together?”, “Happy birthday Neemo :>”, and “Love, Remi”. Empty per-flower notes stay hidden. The birthday greeting appears after wrapping, and the signature is attached to the actual 3D gift tag.

The page has one 3D assembly view. Three purple tulips and two orange calendula each have four attachment stages: stem, leaves, outer petals, and inner petals. `view-3d.js` constructs closed volumetric flower meshes, including the loose pieces in the tray, and uses OrbitControls for orbit and zoom. `icons.js` contains only the small flower-picker illustrations. Three.js r170 and its MIT license are vendored locally; no runtime CDN is required for the bouquet itself.

Pick up the available piece from the 3D tray and drag it to its matching attachment point on the flower. The loose mesh follows the pointer. Forgiving proximity snapping completes a successful attachment; a missed drop or canceled drag returns the piece to its tray position without advancing progress. Orbit gestures remain separate from piece dragging.

For keyboard assembly, focus the assembly control, press Enter or Space to pick up the available piece, move it with the arrow keys, then press Enter or Space again to drop it. Escape cancels. Keyboard placement uses the same moving mesh and proximity check as pointer placement. Clicking the flower or a tray piece does not attach a part.

The 3D view exposes `beginKeyboardDrag(stage?)`, `moveKeyboardDrag(dx, dy)` in CSS pixels, `finishKeyboardDrag()`, `cancelDrag()`, and a `dragging` getter. Its optional `onDragChange(boolean)` callback lets the host disable conflicting controls. `onPlace(id, stage)` fires once, after a successful drop animation. A canceled pointer, lost pointer capture, window blur, a second pointer, or a state change cancels the current drag without placing a part.

The arrow moves to the next unfinished flower; the ribbon wraps the completed bouquet. Undo unwraps before removing a piece. The final left/right arrows swap the selected stem with its neighbor. Sound is optional and starts only after enabling its control.

```sh
node --test bouquet/state.test.mjs bouquet/drag-math.test.mjs
```

`state.js` validates progress and stores it under `tasneemode.bouquet.v1` on the current origin. Previous saves from the two-renderer version open in 3D while preserving assembled stages, the selected flower, bouquet order, and a valid wrapped state. Canceling a drag resets only the loose piece; it does not clear the saved bouquet. Storage failures leave the page usable for the current visit. A WebGL or module failure is handled by the page; there is no 2D assembly fallback.
