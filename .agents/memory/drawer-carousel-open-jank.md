---
name: Vaul drawer + embla carousel open jank
description: How to make the layout-selection drawer (and similar) open cleanly with no internal reflow
---

# Clean open for a vaul Drawer containing an embla carousel

The "Select Layout" bottom drawer (`client/src/components/AudioPlayer.tsx`,
`LayoutDrawerContent`) is a vaul `Drawer` whose body is an embla carousel of
preview images. Naively, opening it shows a "weird render": the carousel can
snap/reflow into its centered slide and the bundled preview PNGs pop in (gray
box → image) after the drawer is already up.

Two fixes, applied together:
1. **Preload the preview images** on player mount (`new Image().src = ...` for
   every light/dark asset) so they are cached before the drawer ever opens.
2. **Gate the carousel viewport with `visibility: hidden` until ready.** Keep an
   `isReady` state; once `emblaApi` exists, on the next `requestAnimationFrame`
   call `emblaApi.reInit()`, sync the centered index, then flip `isReady` true.
   Use `visibility` (not `display:none`) so embla can still measure widths.

**Why:** embla measures/positions after mount, and vaul mounts+animates the
content via transform; the initial centering and async image loads are visible
during the slide-up. Hiding for ~1 frame and re-measuring makes the user see
only the slide up/down.

**How to apply:** reuse this pattern for any embla/measuring carousel placed
inside an animated drawer/sheet. Note `shouldScaleBackground` on the shared
`ui/drawer.tsx` is a no-op here because no `[vaul-drawer-wrapper]` element
exists, so it is NOT the cause of open jank.
