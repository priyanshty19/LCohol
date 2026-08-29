# Sip Stories — Google Analytics and SEO launch map

## Analytics stream settings

Create a GA4 **Web** stream for `https://mysipstories.com` and place its
`G-...` Measurement ID in `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`.

The app sends privacy-safe manual page views because route URLs can otherwise
contain usernames, private IDs, return paths, and invitation codes. In the Web
stream's Enhanced Measurement settings, open **Page views → Advanced settings**
and disable both automatic page-load and browser-history page views. Leaving
those enabled would double-count the manual, sanitised page views.

Also enable email/query-parameter redaction in the Web stream as defence in
depth. Advertising storage, ad user data, ad personalisation, Google Signals,
and automatic ad personalisation are intentionally disabled in code.

## Events implemented

| Event | When it fires | Safe parameters |
| --- | --- | --- |
| `page_view` | Every URL screen and tracked client-only screen | Sanitised path, title, app surface |
| `age_gate_accept` / `age_gate_decline` | Age-gate decision after analytics consent | App surface |
| `auth_start` | Sign-in or create-account flow opens | `mode` |
| `auth_code_requested` | Clerk successfully sends an OTP | `mode` |
| `auth_code_resent` | Clerk successfully resends an OTP | `mode` |
| `login` | Local session is successfully created | `method=email_otp` |
| `sign_up` | Member account is successfully created | `method=email_otp` |
| `tutorial_begin` | Onboarding starts | App surface |
| `onboarding_step_complete` | Taste/style step completes | Step name and number |
| `tutorial_complete` | Onboarding is saved or skipped | Skip flag and selection counts |
| `pwa_install_available` | Browser offers installation | App surface |
| `pwa_installed` | PWA installation completes | App surface |
| `pwa_standalone_launch` | Installed PWA launches | App surface |

`app_surface` separates `web`, `pwa`, `android_twa`, and `ios_webview` traffic.
No event sends an email, OTP, date of birth, username, invite/referral code,
party details, raw search text, post, or James message.

## Funnel Explorations to create

### Create account

1. `page_view` with `page_path` equal to `/`
2. `auth_start` with `mode` equal to `signup`
3. `auth_code_requested` with `mode` equal to `sign_up`
4. `sign_up`
5. `tutorial_begin`
6. `tutorial_complete`

Use a closed funnel, indirect step following, and break down by `app_surface`.

### Login reliability

1. `auth_start` with `mode` equal to `signin`
2. `auth_code_requested` with `mode` equal to `sign_in`
3. `login`
4. `page_view` with `page_path` equal to `/`

Compare completion by `app_surface`; monitor `auth_code_resent` alongside the
funnel as a delivery-friction signal.

### Onboarding

1. `tutorial_begin`
2. `onboarding_step_complete` with `step_number` equal to `1`
3. `onboarding_step_complete` with `step_number` equal to `2`
4. `tutorial_complete`

Break down `tutorial_complete` by `skipped`.

### PWA adoption

1. `pwa_install_available`
2. `pwa_installed`
3. `pwa_standalone_launch`

Mark `sign_up` and `tutorial_complete` as key events. Keep event retention at
14 months so long-range Funnel Explorations remain available. Test with
Realtime, DebugView, and Tag Assistant before relying on standard reports.

## Search launch controls

- Add a Search Console **Domain property** for `mysipstories.com` and verify it
  with the Google DNS TXT record.
- Staging/preview hosts return `noindex` and `Disallow: /`; they never appear in
  the production sitemap.
- Set production `NEXT_PUBLIC_APP_URL=https://mysipstories.com`. Indexing then
  turns on unless `NEXT_PUBLIC_ALLOW_INDEXING=false` is deliberately retained.
- Submit `https://mysipstories.com/sitemap.xml` only after the domain points to
  the production deployment.
- Inspect and request indexing for `/`, `/Privacy-Policy`, and
  `/Terms-and-Condition`. Private member screens and party invite codes stay
  `noindex`.
- Link Search Console to GA4 after both properties are verified.
