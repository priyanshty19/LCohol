"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATES, DEFAULT_STATE_CODE } from "@/lib/state-pricing";

const STORAGE_KEY = "sipstories_state";

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

/** Hook to manage state selection with localStorage persistence */
export function useStateSelection() {
  const [stateCode, setStateCode] = useState(DEFAULT_STATE_CODE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && INDIAN_STATES.some((s) => s.code === saved)) {
      setStateCode(saved);
    }
    setLoaded(true);
  }, []);

  function updateState(code: string) {
    setStateCode(code);
    localStorage.setItem(STORAGE_KEY, code);
  }

  return { stateCode, setStateCode: updateState, loaded };
}
