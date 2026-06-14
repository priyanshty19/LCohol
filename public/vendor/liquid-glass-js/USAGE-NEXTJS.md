# liquid-glass-js in Next.js (App Router)

Vendored from https://github.com/dashersw/liquid-glass-js (MIT — see LICENSE).
This is **vanilla JS**, not an npm module: `container.js` and `button.js` define
the **global** classes `Container` and `Button` (no `import`/`export`). It also
needs `glass.css` and the `html2canvas` runtime. It touches `window`, so it is
**client-only** — never render/instantiate it during SSR.

These files live under `public/`, so they are served at:
`/vendor/liquid-glass-js/container.js`, `/button.js`, `/glass.css`.

## Recommended integration

1. Import the CSS once (e.g. in a client layout/component):
   ```ts
   // a Client Component
   import "/vendor/liquid-glass-js/glass.css"; // or link it via <link> in <head>
   ```
   (If the bare path import is awkward with the bundler, add a `<link rel="stylesheet" href="/vendor/liquid-glass-js/glass.css" />` instead.)

2. Load the scripts client-side with `next/script`, then instantiate in an effect:
   ```tsx
   "use client";
   import Script from "next/script";
   import { useEffect, useRef, useState } from "react";

   export function GlassButton() {
     const hostRef = useRef<HTMLDivElement>(null);
     const [ready, setReady] = useState(0); // bump as each script loads

     useEffect(() => {
       // Both globals must exist before we construct anything.
       if (ready < 3 || !hostRef.current) return;
       // @ts-expect-error — Button is a window global from button.js
       const button = new Button({ text: "Click Me!", size: 32, type: "rounded", onClick: () => alert("Hello Glass!") });
       hostRef.current.appendChild(button.element);
       return () => { hostRef.current?.replaceChildren(); };
     }, [ready]);

     return (
       <>
         <Script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" strategy="afterInteractive" onLoad={() => setReady((n) => n + 1)} />
         <Script src="/vendor/liquid-glass-js/container.js" strategy="afterInteractive" onLoad={() => setReady((n) => n + 1)} />
         <Script src="/vendor/liquid-glass-js/button.js" strategy="afterInteractive" onLoad={() => setReady((n) => n + 1)} />
         <div ref={hostRef} />
       </>
     );
   }
   ```

## Caveats
- `html2canvas` is loaded from a CDN above. To self-host, `npm i html2canvas` and load it your own way (it must be present before `container.js` runs).
- Effects that rasterize the page can be heavy; throttle/limit instances.
- `Button extends Container`; see this folder's `README.md` for the full options.
