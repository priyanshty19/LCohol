import SwiftUI
import UIKit
import UserNotifications

@main
struct SipStoriesApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
        }
    }
}

extension Notification.Name {
    static let sipStoriesPushToken = Notification.Name("SipStoriesPushToken")
    static let sipStoriesPushRegistrationFailed = Notification.Name("SipStoriesPushRegistrationFailed")
    static let sipStoriesPushRoute = Notification.Name("SipStoriesPushRoute")
}

enum PushRouteStore {
    private static let pendingRouteKey = "SipStoriesPendingPushRoute"

    static func normalizedRoute(from value: Any?) -> String? {
        guard let rawValue = value as? String else { return nil }
        let raw = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !raw.isEmpty else { return nil }

        if raw.hasPrefix("/") && !raw.hasPrefix("//") {
            return raw
        }

        guard let url = URL(string: raw),
              url.scheme?.lowercased() == "https",
              let host = url.host?.lowercased(),
              host == "mysipstories.com" || host.hasSuffix(".mysipstories.com") else {
            return nil
        }

        var route = url.path.isEmpty ? "/" : url.path
        if let query = url.query, !query.isEmpty { route += "?\(query)" }
        if let fragment = url.fragment, !fragment.isEmpty { route += "#\(fragment)" }
        return route
    }

    static func save(from userInfo: [AnyHashable: Any]) {
        guard let route = normalizedRoute(from: userInfo["url"]) else { return }
        UserDefaults.standard.set(route, forKey: pendingRouteKey)
        NotificationCenter.default.post(name: .sipStoriesPushRoute, object: route)
    }

    static func takePendingRoute() -> String? {
        guard let route = UserDefaults.standard.string(forKey: pendingRouteKey) else { return nil }
        UserDefaults.standard.removeObject(forKey: pendingRouteKey)
        return route
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let background = UIColor(red: 0x1A / 255, green: 0x10 / 255, blue: 0x12 / 255, alpha: 1)
        UIView.appearance().tintColor = UIColor(red: 0xF2 / 255, green: 0x5C / 255, blue: 0x1D / 255, alpha: 1)
        UIWindow.appearance().backgroundColor = background
        UNUserNotificationCenter.current().delegate = self
        if let notification = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
            PushRouteStore.save(from: notification)
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        NotificationCenter.default.post(name: .sipStoriesPushToken, object: token)
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        NotificationCenter.default.post(
            name: .sipStoriesPushRegistrationFailed,
            object: error.localizedDescription
        )
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        PushRouteStore.save(from: response.notification.request.content.userInfo)
        completionHandler()
    }
}
