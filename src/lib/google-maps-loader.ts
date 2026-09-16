type MapsWindow = Window & {
  google?: { maps?: unknown };
  __sipStoriesMapsReady?: () => void;
};

let mapsPromise: Promise<void> | null = null;

/** Load the smallest Maps JS bootstrap once and share it across every route. */
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined" || !apiKey) return Promise.resolve();
  const mapsWindow = window as MapsWindow;
  if (mapsWindow.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<void>((resolve, reject) => {
    mapsWindow.__sipStoriesMapsReady = () => {
      delete mapsWindow.__sipStoriesMapsReady;
      resolve();
    };

    const fail = () => {
      delete mapsWindow.__sipStoriesMapsReady;
      document.getElementById("gmaps-js")?.remove();
      reject(new Error("Google Maps failed to load"));
    };
    const existing = document.getElementById("gmaps-js");
    if (existing) {
      existing.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "gmaps-js";
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&loading=async&callback=__sipStoriesMapsReady&v=weekly`;
    script.addEventListener("error", fail, { once: true });
    document.head.appendChild(script);
  }).catch((error) => {
    mapsPromise = null;
    throw error;
  });

  return mapsPromise;
}
