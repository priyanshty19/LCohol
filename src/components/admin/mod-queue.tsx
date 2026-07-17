"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Report = {
  id: string;
  reason: string;
  reasons?: string[];
  details: string | null;
  status: string;
  createdAt: string;
  reporter: { profile: { username: string | null } | null } | null;
  post: { id: string; title: string; isDeleted: boolean } | null;
  comment: { id: string; body: string; isDeleted: boolean } | null;
};

export function ModQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/moderation/reports");
    const d = await r.json();
    setReports(d.data ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function del(rep: Report) {
    setBusy(rep.id);
    const type = rep.post ? "post" : "comment";
    const id = rep.post ? rep.post.id : rep.comment?.id;
    const reasons = rep.reasons?.length ? rep.reasons : [rep.reason];
    await fetch("/api/moderation/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, reason: `report:${reasons.join(",")}` }),
    });
    await fetch("/api/moderation/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rep.id, status: "ACTION_TAKEN" }),
    });
    await load();
    setBusy(null);
  }

  async function resolve(rep: Report, status: string) {
    setBusy(rep.id);
    await fetch("/api/moderation/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rep.id, status }),
    });
    await load();
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold text-primary">
        Moderation queue
      </h1>

      {reports.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing pending — the bar&apos;s clean. 🧹
        </p>
      )}

      {reports.map((rep) => {
        const content = rep.post?.title ?? rep.comment?.body ?? "(content removed)";
        const kind = rep.post ? "post" : "comment";
        return (
          <div key={rep.id} className="glass-panel space-y-2 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(rep.reasons?.length ? rep.reasons : [rep.reason]).map((reason) => (
                <Badge key={reason} variant="destructive">{reason}</Badge>
              ))}
              <Badge variant="topic">{kind}</Badge>
              <span className="text-xs text-muted-foreground">
                by {rep.reporter?.profile?.username ?? "anon"} ·{" "}
                {new Date(rep.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="line-clamp-3 text-sm">{content}</p>
            {rep.details && (
              <p className="text-xs text-muted-foreground">“{rep.details}”</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={busy === rep.id}
                onClick={() => del(rep)}
              >
                Delete content
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === rep.id}
                onClick={() => resolve(rep, "DISMISSED")}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === rep.id}
                onClick={() => resolve(rep, "REVIEWED")}
              >
                Mark reviewed
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
