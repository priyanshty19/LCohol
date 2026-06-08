"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Signup is disabled — this is a private beta with 3 invited users.
export function SignupForm() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/login");
  }, [router]);
  return null;
}
