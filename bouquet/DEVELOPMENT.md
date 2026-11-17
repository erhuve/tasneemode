# Bouquet page

Open `/bouquet.html` through a static HTTP server. No build or package installation is required. The existing GitHub Pages deployment can serve these files directly.

```sh
python3 -m http.server 8765
```

Birthday wording is in `content.js`. Its strings are supplied by Raymond. Empty per-flower notes stay hidden. The birthday greeting appears after wrapping, and the signature is attached to the actual gift tag in both renderers.

The five flowers each have four attachment stages. `state.js` is the shared, validated state and local-storage boundary; switching renderers does not reset it. `view-2d.js` draws the kit as SVG. `view-3d.js` constructs closed volumetric flower meshes and uses OrbitControls for orbit and zoom. Three.js r170 and its MIT license are vendored locally; no runtime CDN is required for the bouquet itself.

Click or tap the available tray piece to select it, then activate its attachment target. Activating the selected tray piece again also attaches it, so keyboard users can use Enter or Space. Dragging a piece onto the desk is an alternative. The arrow moves to the next unfinished flower; the ribbon wraps the completed bouquet. Undo unwraps before removing a piece. The final left/right arrows swap the selected stem with its neighbor. Sound is optional and starts only after enabling its control.

```sh
node --test bouquet/state.test.mjs
```

Progress is stored under `tasneemode.bouquet.v1` on the current origin. Storage failures leave the page usable for the current visit. A WebGL or module failure leaves the SVG version available.
