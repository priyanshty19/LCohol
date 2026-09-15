type BarsRequest = {
  city: string;
  type: string | null;
  query: string;
  nearbyLocation: [number, number] | null;
};

export function barsRequest({ city, type, query, nearbyLocation }: BarsRequest) {
  const nearby = nearbyLocation !== null;
  const params = nearby
    ? new URLSearchParams({
        lat: String(nearbyLocation[0]),
        lng: String(nearbyLocation[1]),
        radius: "3000",
      })
    : new URLSearchParams({ city });

  if (type) params.set("type", type);
  if (!nearby && query.trim()) params.set("q", query.trim());

  return {
    endpoint: nearby ? "/api/bars/nearby" : "/api/bars",
    params,
  };
}
