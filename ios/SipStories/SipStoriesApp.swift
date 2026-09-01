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
}
