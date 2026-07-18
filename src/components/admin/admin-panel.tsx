"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type AdminUser = {
  id: string;
  email: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  isBanned: boolean;
  createdAt: string;
  profile: { username: string | null; displayName: string | null } | null;
};

type Audit = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
  actor: { email: string; profile: { username: string | null } | null } | null;
};

function roleTone(r: string): "story" | "recommendation" | "topic" {
  if (r === "ADMIN") return "story";
  if (r === "MODERATOR") return "recommendation";
  return "topic";
}

export function AdminPanel() {
  const [tab, setTab] = useState<"users" | "audit">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const loadUsers = useCallback(async (query = "") => {
    const r = await fetch(
      `/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`
    );
    const d = await r.json();
    setUsers(d.data ?? []);
  }, []);

  const loadAudit = useCallback(async () => {
    const r = await fetch("/api/admin/audit");
    const d = await r.json();
    setAudit(d.data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
    loadAudit();
  }, [loadUsers, loadAudit]);

  async function act(url: string, body: object, id: string) {
    const reason = window.prompt("Required admin/moderator remark");
    if (!reason?.trim()) return;
    setBusy(id);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, reason: reason.trim() }),
    });
    await Promise.all([loadUsers(q), loadAudit()]);
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-primary">Admin</h1>
        <div className="flex gap-1">
          <Button
            variant={tab === "users" ? "gold" : "ghost"}
            size="sm"
            onClick={() => setTab("users")}
          >
            Users
          </Button>
          <Button
            variant={tab === "audit" ? "gold" : "ghost"}
            size="sm"
            onClick={() => setTab("audit")}
          >
            Audit log
          </Button>
        </div>
      </div>

      {tab === "users" && (
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadUsers(q);
            }}
            className="flex gap-2"
          >
            <Input
              variant="search"
              placeholder="Search email or username…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="submit" variant="glass" size="sm">
              Search
            </Button>
          </form>

          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="glass-panel flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">
                      {u.profile?.username ?? "—"}
                    </span>
                    <Badge variant={roleTone(u.role)}>{u.role}</Badge>
                    {u.isBanned && <Badge variant="destructive">banned</Badge>}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {u.email}
                  </div>
                </div>

                {u.role !== "ADMIN" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy === u.id}
                      onClick={() =>
                        act(
                          "/api/admin/moderators",
                          { userId: u.id, makeMod: u.role !== "MODERATOR" },
                          u.id
                        )
                      }
                    >
                      {u.role === "MODERATOR" ? "Demote" : "Make mod"}
                    </Button>
                    <Button
                      size="xs"
                      variant={u.isBanned ? "outline" : "destructive"}
                      disabled={busy === u.id}
                      onClick={() =>
                        act(
                          "/api/moderation/ban",
                          { userId: u.id, ban: !u.isBanned },
                          u.id
                        )
                      }
                    >
                      {u.isBanned ? "Unban" : "Ban"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-sm text-muted-foreground">No users found.</p>
            )}
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-2">
          {audit.map((a) => (
            <div key={a.id} className="glass-panel rounded-xl p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="topic">{a.action}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                by {a.actor?.profile?.username ?? a.actor?.email ?? "?"} · target{" "}
                {a.targetType} {a.targetId.slice(0, 8)}
                {a.reason ? ` · “${a.reason}”` : ""}
              </div>
            </div>
          ))}
          {audit.length === 0 && (
            <p className="text-sm text-muted-foreground">No actions yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
