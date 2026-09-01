import SwiftUI
import UIKit
import WebKit

struct SipStoriesWebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var errorMessage: String?

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        let appVersion = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        configuration.applicationNameForUserAgent = "SipStoriesIOS/\(appVersion ?? "unknown")"
        configuration.userContentController.add(
            context.coordinator.notificationBridge,
            name: NativeNotificationBridge.handlerName
        )

        let pagePreferences = WKWebpagePreferences()
        pagePreferences.allowsContentJavaScript = true
        configuration.defaultWebpagePreferences = pagePreferences

        let webView = WKWebView(frame: .zero, configuration: configuration)
        context.coordinator.notificationBridge.attach(to: webView)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsLinkPreview = false
        webView.isOpaque = false
        webView.backgroundColor = BrandColors.background
        webView.scrollView.backgroundColor = BrandColors.background
        webView.scrollView.keyboardDismissMode = .interactive
        webView.scrollView.contentInsetAdjustmentBehavior = .automatic

        let request = URLRequest(
            url: url,
            cachePolicy: .useProtocolCachePolicy,
            timeoutInterval: 45
        )
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        private var parent: SipStoriesWebView
        let notificationBridge = NativeNotificationBridge()

        init(parent: SipStoriesWebView) {
            self.parent = parent
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            notificationBridge.pageWillLoad()
            updateState(isLoading: true, errorMessage: nil)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            updateState(isLoading: false, errorMessage: nil)
            notificationBridge.pageDidLoad()
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            handleNavigationError(error)
        }

        func webView(
            _ webView: WKWebView,
            didFail navigation: WKNavigation!,
            withError error: Error
        ) {
            handleNavigationError(error)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let destination = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            let scheme = destination.scheme?.lowercased()
            if scheme == "sipstories", destination.host == "get-home-safe" {
                presentRidePicker(from: destination)
                decisionHandler(.cancel)
                return
            }

            if scheme == "about" {
                decisionHandler(.allow)
                return
            }

            if scheme == "http" || scheme == "https" {
                let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
                if isMainFrame && !shouldKeepInsideApp(destination) {
                    UIApplication.shared.open(destination)
                    decisionHandler(.cancel)
                    return
                }

                if navigationAction.targetFrame == nil {
                    webView.load(navigationAction.request)
                    decisionHandler(.cancel)
                } else {
                    decisionHandler(.allow)
                }
                return
            }

            if UIApplication.shared.canOpenURL(destination) {
                UIApplication.shared.open(destination)
            }
            decisionHandler(.cancel)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if navigationAction.targetFrame == nil {
                webView.load(navigationAction.request)
            }
            return nil
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptAlertPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping () -> Void
        ) {
            presentAlert(message: message, completionHandler: completionHandler)
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptConfirmPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping (Bool) -> Void
        ) {
            guard let presenter = Self.topViewController else {
                completionHandler(false)
                return
            }

            let alert = UIAlertController(title: "Sip Stories", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            presenter.present(alert, animated: true)
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptTextInputPanelWithPrompt prompt: String,
            defaultText: String?,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping (String?) -> Void
        ) {
            guard let presenter = Self.topViewController else {
                completionHandler(nil)
                return
            }

            let alert = UIAlertController(title: "Sip Stories", message: prompt, preferredStyle: .alert)
            alert.addTextField { field in field.text = defaultText }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
                completionHandler(alert.textFields?.first?.text)
            })
            presenter.present(alert, animated: true)
        }

        private func handleNavigationError(_ error: Error) {
            let nsError = error as NSError
            guard nsError.code != NSURLErrorCancelled else { return }

            let friendlyMessage: String
            switch nsError.code {
            case NSURLErrorNotConnectedToInternet, NSURLErrorNetworkConnectionLost:
                friendlyMessage = "Check your internet connection, then try again."
            case NSURLErrorTimedOut:
                friendlyMessage = "The lounge took too long to answer. Please try again."
            default:
                friendlyMessage = "Sip Stories could not open right now. Please try again."
            }
            updateState(isLoading: false, errorMessage: friendlyMessage)
        }

        private func updateState(isLoading: Bool, errorMessage: String?) {
            DispatchQueue.main.async { [parent = self.parent] in
                parent.isLoading = isLoading
                parent.errorMessage = errorMessage
            }
        }

        private func shouldKeepInsideApp(_ destination: URL) -> Bool {
            guard let host = destination.host?.lowercased() else { return false }

            let appHost = parent.url.host?.lowercased()
            return host == appHost
                || host == "mysipstories.com"
                || host.hasSuffix(".mysipstories.com")
                || host.hasSuffix(".clerk.accounts.dev")
                || host.hasSuffix(".clerk.com")
                || host.hasSuffix(".clerk.dev")
        }

        private func presentAlert(message: String, completionHandler: @escaping () -> Void) {
            guard let presenter = Self.topViewController else {
                completionHandler()
                return
            }

            let alert = UIAlertController(title: "Sip Stories", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            presenter.present(alert, animated: true)
        }

        private func presentRidePicker(from requestURL: URL) {
            guard let presenter = Self.topViewController else { return }

            let components = URLComponents(url: requestURL, resolvingAgainstBaseURL: false)
            let latitude = components?.queryItems?.first(where: { $0.name == "lat" })?.value
            let longitude = components?.queryItems?.first(where: { $0.name == "lng" })?.value
            let coordinateQuery = latitude.flatMap { lat in
                longitude.map { lng in "&lat=\(lat)&lng=\(lng)" }
            } ?? ""

            let sheet = UIAlertController(
                title: "Get home safe",
                message: "Choose a ride or maps app on this iPhone.",
                preferredStyle: .actionSheet
            )

            let rideApps: [(name: String, url: URL?)] = [
                ("Uber", URL(string: "uber://riderequest?pickup=my_location")),
                ("Ola", URL(string: "olacabs://app/launch?landing_page=bk\(coordinateQuery)")),
                ("Google Maps", googleMapsURL(latitude: latitude, longitude: longitude)),
            ]

            for app in rideApps {
                guard let url = app.url, UIApplication.shared.canOpenURL(url) else { continue }
                sheet.addAction(UIAlertAction(title: app.name, style: .default) { _ in
                    UIApplication.shared.open(url)
                })
            }

            let appleMapsURL = appleMapsURL(latitude: latitude, longitude: longitude)
            sheet.addAction(UIAlertAction(title: "Apple Maps", style: .default) { _ in
                UIApplication.shared.open(appleMapsURL)
            })
            sheet.addAction(UIAlertAction(title: "More ride options", style: .default) { _ in
                let finder = URL(string: "https://www.google.com/maps/search/?api=1&query=cab%20taxi%20near%20me")!
                UIApplication.shared.open(finder)
            })
            sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))

            if let popover = sheet.popoverPresentationController {
                popover.sourceView = presenter.view
                popover.sourceRect = CGRect(
                    x: presenter.view.bounds.midX,
                    y: presenter.view.bounds.maxY,
                    width: 0,
                    height: 0
                )
            }
            presenter.present(sheet, animated: true)
        }

        private func googleMapsURL(latitude: String?, longitude: String?) -> URL? {
            var components = URLComponents(string: "comgooglemaps://")
            var items = [URLQueryItem(name: "q", value: "cab taxi near me")]
            if let latitude, let longitude {
                items.append(URLQueryItem(name: "center", value: "\(latitude),\(longitude)"))
            }
            components?.queryItems = items
            return components?.url
        }

        private func appleMapsURL(latitude: String?, longitude: String?) -> URL {
            var components = URLComponents(string: "https://maps.apple.com/")!
            var items = [URLQueryItem(name: "q", value: "cab taxi near me")]
            if let latitude, let longitude {
                items.append(URLQueryItem(name: "ll", value: "\(latitude),\(longitude)"))
            }
            components.queryItems = items
            return components.url!
        }

        private static var topViewController: UIViewController? {
            let scene = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive }
            let root = scene?.windows.first { $0.isKeyWindow }?.rootViewController
            return topViewController(from: root)
        }

        private static func topViewController(from root: UIViewController?) -> UIViewController? {
            if let navigationController = root as? UINavigationController {
                return topViewController(from: navigationController.visibleViewController)
            }
            if let tabController = root as? UITabBarController {
                return topViewController(from: tabController.selectedViewController)
            }
            if let presented = root?.presentedViewController {
                return topViewController(from: presented)
            }
            return root
        }
    }
}

private enum BrandColors {
    static let background = UIColor(red: 0x1A / 255, green: 0x10 / 255, blue: 0x12 / 255, alpha: 1)
}
