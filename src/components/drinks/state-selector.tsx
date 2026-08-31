"use client";

import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATES, DEFAULT_STATE_CODE } from "@/lib/state-pricing";
import { getCookie, setCookie } from "@/lib/client-cookies";

const STATE_COOKIE = "sip_state";

interface StateSelectorProps {
  value: string;
  onChange: (stateCode: string) => void;
}

export function StateSelector({ value, onChange }: StateSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        Prices for
      </span>
      <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger className="h-8 w-[180px] border-primary/20 bg-primary/5 text-xs">
          <SelectValue placeholder="Select state" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {INDIAN_STATES.map((state) => (
            <SelectItem key={state.code} value={state.code} className="text-xs">
              {state.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * State selection persisted to a 1-year cookie (survives sessions) and, for
 * logged-in users, mirrored to Profile.state in the DB for cross-device sync.
 * No localStorage — nothing silently disappears.
 */
export function useStateSelection() {
  const [stateCode, setStateCode] = useState(DEFAULT_STATE_CODE);
  const [loaded, setLoaded] = useState(false);
  // Set once the user explicitly picks — the DB reconcile must never override it.
  const userTouched = useRef(false);

  useEffect(() => {
    let alive = true;
    // Cookie is the instant, offline-safe source.
    const saved = getCookie(STATE_COOKIE);
    const timer = window.setTimeout(() => {
      if (saved && INDIAN_STATES.some((s) => s.code === saved)) {
        setStateCode(saved);
      }
      setLoaded(true);
    }, 0);

    // If logged in and the DB has a state name, reconcile to its code — unless
    // there's already a cookie OR the user has picked since mount.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!alive || userTouched.current) return;
        const name: string | undefined = d?.user?.state;
        if (!name) return;
        const match = INDIAN_STATES.find(
          (s) => s.name.toLowerCase() === name.toLowerCase()
        );
        if (match && !saved) {
          setStateCode(match.code);
          setCookie(STATE_COOKIE, match.code);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  function updateState(code: string) {
    userTouched.current = true;
    setStateCode(code);
    setCookie(STATE_COOKIE, code);
    // Persist the human-readable state name to the profile (best-effort).
    const name = INDIAN_STATES.find((s) => s.code === code)?.name;
    if (name) {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: name }),
      }).catch(() => {});
    }
  }

  return { stateCode, setStateCode: updateState, loaded };
}
