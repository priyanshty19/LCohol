"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MIN_DRINKING_AGE } from "@/lib/constants";

function isOldEnough(dob: Date): boolean {
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 >= MIN_DRINKING_AGE;
  }
  return age >= MIN_DRINKING_AGE;
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;
  const dobStr = formData.get("dob") as string;

  if (!email || !password || !username || !dobStr) {
    return { error: "All fields are required." };
  }

  if (username.length < 3 || username.length > 30) {
    return { error: "Username must be 3-30 characters." };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, and underscores." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) {
    return { error: "Invalid date of birth." };
  }

  if (!isOldEnough(dob)) {
    return { error: `You must be at least ${MIN_DRINKING_AGE} years old to use this platform.` };
  }

  const existing = await prisma.profile.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (existing) {
    return { error: "Username is already taken." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: username.toLowerCase() },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    await prisma.user.create({
      data: {
        authId: data.user.id,
        email,
        dob,
        profile: {
          create: {
            username: username.toLowerCase(),
            displayName: username,
          },
        },
      },
    });
  }

  redirect("/");
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function loginWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}
