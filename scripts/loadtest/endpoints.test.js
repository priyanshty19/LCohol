import http from "k6/http";
import { check, sleep } from "k6";

// Live abuse/load harness — see README.md. Run against localhost or staging ONLY.
const BASE = __ENV.BASE_URL || "http://localhost:3001";
const COOKIE = __ENV.SESSION_COOKIE || ""; // "ss_auth=..."

export const options = {
  scenarios: {
    // Hammer the hardened write endpoint — it must throttle, not collapse.
    write_abuse: {
      executor: "constant-arrival-rate",
      rate: 30,
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 20,
      maxVUs: 60,
      exec: "createMix",
    },
    // Ramp readers — the data cache should absorb this with stable latency.
    read_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 50 },
        { duration: "20s", target: 50 },
        { duration: "10s", target: 0 },
      ],
      exec: "readCocktails",
    },
  },
  thresholds: {
    // The whole point: under a write flood the endpoint sheds (429/409/503),
    // it does NOT 500 or hang. Fail the run if 500s appear.
    "checks{check:write_no_500}": ["rate>0.99"],
    "checks{check:read_no_500}": ["rate>0.99"],
    "http_req_duration{scenario:read_load}": ["p(95)<1500"],
  },
};

const writeHeaders = COOKIE
  ? { "Content-Type": "application/json", Cookie: COOKIE }
  : { "Content-Type": "application/json" };

export function createMix() {
  const payload = JSON.stringify({
    name: `loadtest-${__VU}-${__ITER}`,
    ingredientSlugs: ["vodka"],
  });
  const res = http.post(`${BASE}/api/cocktails/create`, payload, { headers: writeHeaders });
  // Acceptable: 200 saved, 409 cap hit, 429 rate limited, 503 shed, 401 unauth.
  // Unacceptable: 500 (the failure this hardening eliminates).
  check(res, {
    write_no_500: (r) => r.status !== 500,
    write_throttles_or_ok: (r) => [200, 401, 409, 429, 503].includes(r.status),
  });
}

export function readCocktails() {
  const res = http.get(`${BASE}/api/cocktails?take=24`);
  check(res, {
    read_no_500: (r) => r.status !== 500,
    read_ok_or_shed: (r) => [200, 503].includes(r.status),
  });
  sleep(0.2);
}
