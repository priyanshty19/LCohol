"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { NotificationToggle } from "@/components/settings/notification-toggle";
import { DeleteAccount } from "@/components/settings/delete-account";

const DRINKING_STYLES = [
  { value: "SOCIAL", label: "Social Drinker" },
  { value: "CONNOISSEUR", label: "Connoisseur" },
  { value: "OCCASIONAL", label: "Occasional" },
  { value: "EXPLORER", label: "Explorer" },
  { value: "PARTY_ANIMAL", label: "Party Animal" },
  { value: "MIXOLOGIST", label: "Mixologist" },
  { value: "SOBER_CURIOUS", label: "Sober Curious" },
];

export function SettingsView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [drinkingStyle, setDrinkingStyle] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emailNotif, setEmailNotif] = useState(true);
  // useAuth() returns a client-cached user synchronously, so rendering user.email
  // directly would differ from the SSR HTML (no user) → hydration mismatch (React
  // #418), which aborts hydration of this card and leaves the NotificationToggle
  // stuck on "Checking…". Gate user-dependent text until after mount so SSR and
  // the first client render agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (user?.emergencyPhone) setEmergencyPhone(user.emergencyPhone);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pref = (user as any)?.profile?.emailNotifications;
    if (typeof pref === "boolean") setEmailNotif(pref);
    setLoading(false);
  }, [user]);

  async function toggleEmail(value: boolean) {
    setEmailNotif(value);
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotifications: value }),
    }).catch(() => {});
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || undefined,
          bio: bio || undefined,
          drinkingStyle: drinkingStyle || undefined,
          city: city || undefined,
          state: state || undefined,
          emergencyPhone: emergencyPhone || undefined,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-primary">Settings</h1>

      <Card variant="glass">
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Profile
          </h2>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you appear to others"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the community about yourself..."
              rows={3}
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label>Drinking Style</Label>
            <Select value={drinkingStyle} onValueChange={(v) => setDrinkingStyle(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select your style" />
              </SelectTrigger>
              <SelectContent>
                {DRINKING_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Maharashtra"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyPhone">Emergency contact</Label>
            <Input
              id="emergencyPhone"
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="+91 98765 43210"
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Used by the Help page to call someone you trust. Kept private.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button variant="gold" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && (
              <span className="text-sm text-[var(--ml-sober)]">Changes saved!</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </h2>
          <p className="text-xs text-muted-foreground">
            Pick a mood. It follows you across devices.
          </p>
          <ThemeSwitcher />
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Notifications
          </h2>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Push (this device)</p>
            <NotificationToggle />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-medium">Email notifications</span>
              <span className="block text-xs text-muted-foreground">
                Invites, RSVPs &amp; new circle posts to {mounted ? (user?.email ?? "your email") : "your email"}.
              </span>
            </span>
            <input
              type="checkbox"
              checked={emailNotif}
              onChange={(e) => toggleEmail(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-primary"
            />
          </label>
        </CardContent>
      </Card>

      <Card variant="glass">
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </h2>
          <p className="text-sm text-muted-foreground">
            Email: {mounted ? (user?.email ?? "Not logged in") : "Not logged in"}
          </p>
          <p className="text-xs text-muted-foreground">
            Your email is private and never shown publicly. Your username is
            your public identity.
          </p>
          <DeleteAccount />
        </CardContent>
      </Card>
    </div>
  );
}
