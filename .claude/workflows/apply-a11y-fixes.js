export const meta = {
  name: 'apply-a11y-fixes',
  description: 'Accessibility fixes from the audit — aria-live feedback, keyboard-operable cards, modal Escape, ARIA on the bell',
  phases: [{ title: 'A11y', detail: 'one builder per component file' }],
}

const COMMON =
  `SIPSTORIES Next.js 16 + Tailwind v4 + base-ui. Match the file's existing style. ` +
  `Additive a11y only — do NOT change layout, copy meaning, or logic. Keep all existing behavior. ` +
  `Dark/glass aesthetic; colors must match meaning (errors in destructive/var(--ml-sos), not the gold success color). ` +
  `Return a one-line receipt.\n`

const FIXES = [
  { f: 'src/components/bars/bars-view.tsx', s: 'Bar cards are click-only <div>s (no keyboard/SR). Make each card keyboard-operable: role="button" + tabIndex={0} + onKeyDown for Enter/Space firing the same navigation as onClick (or convert to a real <button>/<Link>). Add aria-pressed={active} to the city/type filter pills.' },
  { f: 'src/components/feed/create-post-form.tsx', s: 'Dynamic validation/error messages are plain elements with no live region. Add role="alert" to the error block and aria-live="polite" to any success/status text so screen readers announce them. No copy/logic change.' },
  { f: 'src/components/auth/login-form.tsx', s: 'Add role="alert" to the error block. Also give the OTP "Resend code" button feedback: on success show a transient "A new code is on its way" status (aria-live="polite") and briefly disable the button (short cooldown) so users know it worked and do not spam it.' },
  { f: 'src/components/circle/circle-view.tsx', s: 'The inline error text (var(--ml-sos)) is not announced. Add role="alert" to the error element(s). No other change.' },
  { f: 'src/components/layout/notification-bell.tsx', s: 'The bell toggle lacks ARIA and Escape-to-close. Add aria-haspopup="menu" + aria-expanded={open} to the bell button, and close the dropdown on Escape (keydown listener while open). Keep existing open/close + polling behavior.' },
  { f: 'src/components/theme/daily-vibe.tsx', s: 'This full-screen first-load interrupt has no keyboard dismissal. Add Escape-to-close (and restore focus to the body) without changing the visual or the once-per-day logic. Focus the primary action on open if easy.' },
]

phase('A11y')
const receipts = await parallel(
  FIXES.map((fx) => () =>
    agent(
      `${COMMON}\nFix this component: ${fx.f}\nWhat to do: ${fx.s}\nRead it first, then apply.`,
      { agentType: 'caveman:cavecrew-builder', label: `a11y:${fx.f.split('/').slice(-1)[0]}`, phase: 'A11y' },
    ),
  ),
)
return { fixed: FIXES.length, receipts: receipts.filter(Boolean) }
