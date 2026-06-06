"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const IS_DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

const DEV_USER: User = {
  id: "dev-user-id",
  email: "dev@sipstories.local",
  app_metadata: {},
  user_metadata: { username: "devuser" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

export function useAuth() {
  const [user, setUser] = useState<User | null>(IS_DEV_MODE ? DEV_USER : null);
  const [loading, setLoading] = useState(!IS_DEV_MODE);

  useEffect(() => {
    if (IS_DEV_MODE) return;

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
