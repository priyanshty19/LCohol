# Sip Stories for iPhone

This is the iOS shell for the existing Sip Stories web app. Debug builds load `https://staging.mysipstories.com/`; Release builds load `https://mysipstories.com/`. Both run full-screen in a persistent `WKWebView`, so the web and iPhone versions use the same authentication, backend, content, and account data.

## Current configuration

- App name: Sip Stories
- Bundle identifier: `com.sipstories.ios`
- Minimum iOS version: iOS 16
- Debug URL: `https://staging.mysipstories.com/`
- Release URL: `https://mysipstories.com/`
- Signing: Automatic (an Apple Developer team must be selected in Xcode)
- Native push: Apple notification permission is requested only after the user
  taps **Enable notifications** in the web Settings screen. The app forwards its
  APNs device token to the authenticated Sip Stories account.

## Create an installable IPA

1. Open `SipStoriesIOS.xcodeproj` in Xcode.
2. Select the SipStories target, open **Signing & Capabilities**, and choose the Apple Developer team.
   The App ID must have the **Push Notifications** capability enabled.
3. Connect the test iPhone once so Xcode can register it for a development build.
4. Select **Any iOS Device (arm64)**, then choose **Product > Archive**.
5. In Organizer, choose **Distribute App > Development**, then export the IPA.

The included `ExportOptions.plist` is configured for a development IPA. App Store/TestFlight distribution can use the same archive with the App Store Connect distribution option.

## Native notification release checklist

1. Create an APNs `.p8` key in the Apple Developer portal and retain its Key ID
   and Team ID.
2. Configure `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`,
   `APNS_BUNDLE_ID=com.sipstories.ios`, and the matching sandbox/production
   `APNS_ENVIRONMENT` on the Sip Stories server.
3. Apply the `native_push_subscriptions` database migration.
4. Set `NATIVE_IOS_PUSH_ENABLED=true` only after the server readiness probe
   reports the APNs credentials as healthy.
5. Install build 2 (version 1.1.0) or later on a physical iPhone and accept the
   Apple permission prompt from Settings.
