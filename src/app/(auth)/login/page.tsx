import { LoginExperience } from "@/components/landing/login-experience";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Welcome" };

export default function LoginPage() {
  return <LoginExperience />;
}
