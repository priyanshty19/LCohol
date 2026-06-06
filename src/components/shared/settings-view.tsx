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

  useEffect(() => {
    async function load() {
      if (!user?.email) return;
      // Fetch current user's profile via a simple lookup
      const res = await fetch(`/api/profile?username=_current`, {
        method: "GET",
      });
      // If _current doesn't work, we rely on the settings being loaded empty
      setLoading(false);
    }
    load();
  }, [user]);

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
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="border-border/30 bg-card/50">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && (
              <span className="text-sm text-green-500">Changes saved!</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/30 bg-card/50">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </h2>
          <p className="text-sm text-muted-foreground">
            Email: {user?.email ?? "Not logged in"}
          </p>
          <p className="text-xs text-muted-foreground">
            Your email is private and never shown publicly. Your username is
            your public identity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
