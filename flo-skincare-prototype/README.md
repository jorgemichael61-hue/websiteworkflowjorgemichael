# FLO Skincare — tropical 3D redesign prototype

A self-contained visual prototype for presenting a redesign concept to FLO Skincare
(floskincare.co.uk). It is **not** the live shop: there is no real checkout, payment,
accounts or backend. Nothing in this folder affects the Red Dragon Assist site at the
root of this repository.

## Run it locally

You need a tiny local web server (the 3D hero is an ES module and browsers block
modules opened straight from disk).

**Option A, Python (already on most Macs):**

```bash
cd flo-skincare-prototype
python3 -m http.server 8080
```

Then open <http://localhost:8080> in Chrome, Safari or Edge.

**Option B, Node:**

```bash
cd flo-skincare-prototype
npx serve -l 8080
```

Stop the server with `Ctrl + C`.

If you double-click `index.html` instead, everything works except the WebGL hero,
which falls back to a static gradient.

## What's inside

| Path | Purpose |
| --- | --- |
| `index.html` | All sections and dialogs |
| `css/style.css` | Design tokens, layout, responsive rules, reduced-motion |
| `js/world.js` | Three.js world behind the whole page: ocean, beach, sky, palms, glass/gold sculptures, the FLO tin with its real label, the FLO wordmark on the horizon, and the scroll-driven camera journey (beach → over the water → under the surface → golden hour → dusk). Adaptive resolution keeps it smooth on modest GPUs. |
| `js/main.js` | GSAP/ScrollTrigger choreography, filters, product dialog, demo bag, menu |
| `js/products.js` | Product data (names/prices from the live shop, ingredients from the labels) |
| `assets/img`, `assets/video` | Optimised copies of FLO's supplied photos and videos |
| `vendor/` | three.js r160, GSAP 3.12.5 + ScrollTrigger (bundled, works offline) |

Fonts (Bodoni Moda, Instrument Sans) load from Google Fonts when online and fall back
to system serif/sans offline.

## Presenting tips

- Show it full-screen (F11 / ⌃⌘F) on a laptop first, then on a phone.
- The opening sequence plays once per page load; refresh to replay it.
- Tap "Add to bag" and open the bag to show the shopping flow. Checkout is
  deliberately switched off.
