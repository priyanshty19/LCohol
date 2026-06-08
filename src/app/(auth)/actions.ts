"use server";

import { redirect } from "next/navigation";

/**
 * Login is handled client-side via /api/auth/login (POST).
 * This server action is kept for the logout button in the header.
 */
export async function logout() {
  // Cookie cleared by the client calling /api/auth/logout
  // This action just does the redirect after client clears cookie
  redirect("/login");
}

// Stub — no longer used. Signup is disabled (private beta).
export async function signup() {
  redirect("/login");
}

// Stub — kept so any stray imports don't crash the build
export async function login() {
  redirect("/");
}

// Stub — Google OAuth removed
export async function loginWithGoogle() {
  redirect("/login");
}
