// Fire-and-forget toast dispatcher. Mirrors the app's existing CustomEvent
// pattern (see "ask-james") so any component — or non-React code — can raise a
// toast without a context provider wrapping the tree. The <Toaster /> mounted in
// the root layout listens for these events and renders the stack.

export type ToastKind = "success" | "error" | "info";
export type ToastDetail = { message: string; kind: ToastKind };

function raise(message: string, kind: ToastKind = "info"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>("ss-toast", { detail: { message, kind } }));
}

export const toast = Object.assign(raise, {
  success: (m: string) => raise(m, "success"),
  error: (m: string) => raise(m, "error"),
  info: (m: string) => raise(m, "info"),
});
