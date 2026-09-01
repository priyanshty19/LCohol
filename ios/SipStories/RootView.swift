import SwiftUI

enum AppEnvironment {
    static let startURL: URL = {
        if let rawValue = Bundle.main.object(forInfoDictionaryKey: "SipStoriesStartURL") as? String,
           let configuredURL = URL(string: rawValue) {
            return configuredURL
        }

        return URL(string: "https://staging.mysipstories.com/")!
    }()
}

struct RootView: View {
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var webViewID = UUID()

    var body: some View {
        ZStack {
            Brand.background
                .ignoresSafeArea()

            SipStoriesWebView(
                url: AppEnvironment.startURL,
                isLoading: $isLoading,
                errorMessage: $errorMessage
            )
            .id(webViewID)

            if isLoading && errorMessage == nil {
                LaunchOverlay()
                    .transition(.opacity)
                    .allowsHitTesting(false)
            }

            if let errorMessage {
                ConnectionErrorView(message: errorMessage) {
                    self.errorMessage = nil
                    isLoading = true
                    webViewID = UUID()
                }
                .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.2), value: isLoading)
        .animation(.easeOut(duration: 0.2), value: errorMessage)
    }
}

private enum Brand {
    static let background = Color(red: 0x1A / 255, green: 0x10 / 255, blue: 0x12 / 255)
    static let orange = Color(red: 0xF2 / 255, green: 0x5C / 255, blue: 0x1D / 255)
    static let cream = Color(red: 0xF7 / 255, green: 0xED / 255, blue: 0xDF / 255)
    static let muted = Color(red: 0xD7 / 255, green: 0xBC / 255, blue: 0xA0 / 255)
}

private struct LaunchOverlay: View {
    var body: some View {
        VStack(spacing: 18) {
            Image("LaunchIcon")
                .resizable()
                .scaledToFit()
                .frame(width: 112, height: 112)
                .accessibilityHidden(true)

            HStack(spacing: 5) {
                Text("Sip")
                    .foregroundStyle(Brand.orange)
                    .italic()
                Text("Stories")
                    .foregroundStyle(Brand.cream)
            }
            .font(.system(size: 38, weight: .semibold, design: .serif))

            ProgressView()
                .tint(Brand.orange)
                .padding(.top, 6)
                .accessibilityLabel("Opening Sip Stories")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.background)
    }
}

private struct ConnectionErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image("LaunchIcon")
                .resizable()
                .scaledToFit()
                .frame(width: 96, height: 96)
                .accessibilityHidden(true)

            Text("James lost the signal.")
                .font(.system(size: 28, weight: .semibold, design: .serif))
                .foregroundStyle(Brand.cream)

            Text(message)
                .font(.system(size: 16))
                .multilineTextAlignment(.center)
                .foregroundStyle(Brand.muted)
                .padding(.horizontal, 32)

            Button(action: retry) {
                Text("Try again")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Brand.orange)
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 42)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.background)
    }
}
