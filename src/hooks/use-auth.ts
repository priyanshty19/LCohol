"use client";

import { useEffect, useState } from "react";

export type SipUser = {
  email: string;
  username: string;
  displayName: string;
};

export function useAuth() {
  const [user, setUser] = useState<SipUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(({ user }) => setUser(user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
