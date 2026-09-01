import UIKit
import UserNotifications
import WebKit

final class NativeNotificationBridge: NSObject, WKScriptMessageHandler {
    static let handlerName = "sipStoriesNotifications"

    private weak var webView: WKWebView?
    private var observers: [NSObjectProtocol] = []
    private var pageReady = false
    private var didConsumePendingRoute = false

    override init() {
        super.init()

        observers.append(
            NotificationCenter.default.addObserver(
                forName: .sipStoriesPushToken,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                guard let token = notification.object as? String else { return }
                self?.emit(status: "authorized", token: token)
            }
        )
        observers.append(
            NotificationCenter.default.addObserver(
                forName: .sipStoriesPushRegistrationFailed,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                let message = notification.object as? String ?? "Apple could not register this device."
                self?.emit(status: "error", error: message)
            }
        )
        observers.append(
            NotificationCenter.default.addObserver(
                forName: .sipStoriesPushRoute,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                guard let route = notification.object as? String else { return }
                self?.navigate(to: route)
            }
        )
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
    }

    func attach(to webView: WKWebView) {
        self.webView = webView
    }

    func pageWillLoad() {
        pageReady = false
    }

    func pageDidLoad() {
        pageReady = true
        evaluate("window.__sipStoriesNativeNotifications = true;")
        sendCurrentStatus()
        if !didConsumePendingRoute {
            didConsumePendingRoute = true
            if let route = PushRouteStore.takePendingRoute() {
                navigate(to: route)
            }
        }
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == Self.handlerName else { return }
        guard message.frameInfo.isMainFrame else { return }
        let host = message.frameInfo.securityOrigin.host.lowercased()
        guard host == "mysipstories.com" || host.hasSuffix(".mysipstories.com") else { return }
        let payload = message.body as? [String: Any]
        let action = payload?["action"] as? String ?? "status"

        if action == "request" {
            requestPermission()
        } else if action == "openSettings" {
            guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
            UIApplication.shared.open(url)
        } else {
            sendCurrentStatus()
        }
    }

    private func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) {
            [weak self] granted, error in
            DispatchQueue.main.async {
                if let error {
                    self?.emit(status: "error", error: error.localizedDescription)
                    return
                }
                guard granted else {
                    self?.emit(status: "denied")
                    return
                }

                self?.emit(status: "registering")
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    private func sendCurrentStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                switch settings.authorizationStatus {
                case .authorized, .provisional, .ephemeral:
                    self?.emit(status: "registering")
                    UIApplication.shared.registerForRemoteNotifications()
                case .denied:
                    self?.emit(status: "denied")
                case .notDetermined:
                    self?.emit(status: "default")
                @unknown default:
                    self?.emit(status: "default")
                }
            }
        }
    }

    private func emit(status: String, token: String? = nil, error: String? = nil) {
        var detail: [String: String] = ["status": status]
        if let token { detail["token"] = token }
        if let error { detail["error"] = error }

        guard let data = try? JSONSerialization.data(withJSONObject: detail),
              let json = String(data: data, encoding: .utf8) else { return }
        evaluate(
            "window.dispatchEvent(new CustomEvent('sipstories:native-notification', { detail: \(json) }));"
        )
    }

    private func evaluate(_ script: String) {
        DispatchQueue.main.async { [weak webView] in
            webView?.evaluateJavaScript(script)
        }
    }

    private func navigate(to route: String) {
        guard pageReady,
              let normalized = PushRouteStore.normalizedRoute(from: route),
              let webView,
              let currentURL = webView.url,
              let destination = URL(string: normalized, relativeTo: currentURL)?.absoluteURL,
              let host = destination.host?.lowercased(),
              destination.scheme?.lowercased() == "https",
              host == "mysipstories.com" || host.hasSuffix(".mysipstories.com") else { return }
        webView.load(URLRequest(url: destination))
        _ = PushRouteStore.takePendingRoute()
    }
}
