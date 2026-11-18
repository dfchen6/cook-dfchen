import AuthenticationServices
import CryptoKit
import Foundation
import Observation
import UIKit

@MainActor
@Observable
final class AuthManager: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let baseURL = URL(string: "https://cook.dfchen.com")!

    private(set) var session: StoredSession?
    private(set) var isSigningIn = false
    var errorMessage: String?

    private var webAuthSession: ASWebAuthenticationSession?

    var isSignedIn: Bool {
        session != nil
    }

    var userEmail: String? {
        session?.email
    }

    override init() {
        self.session = KeychainStore.load()
        super.init()
    }

    func signInWithGoogle(language: AppLanguage) async -> Bool {
        errorMessage = nil
        isSigningIn = true
        defer { isSigningIn = false }

        let state = Self.randomState()
        let localeSegment = language == .zh ? "zh" : "en"
        var comps = URLComponents(
            url: Self.baseURL.appendingPathComponent("\(localeSegment)/login/mobile"),
            resolvingAgainstBaseURL: false
        )!
        comps.queryItems = [URLQueryItem(name: "state", value: state)]
        guard let authURL = comps.url else { return false }

        return await withCheckedContinuation { continuation in
            let authSession = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: "cookdfchen"
            ) { [weak self] callbackURL, error in
                Task { @MainActor in
                    guard let self else {
                        continuation.resume(returning: false)
                        return
                    }
                    self.webAuthSession = nil

                    if let error = error as? ASWebAuthenticationSessionError,
                       error.code == .canceledLogin {
                        continuation.resume(returning: false)
                        return
                    }
                    if let error {
                        self.errorMessage = error.localizedDescription
                        continuation.resume(returning: false)
                        return
                    }
                    guard let callbackURL,
                          let items = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?.queryItems else {
                        self.errorMessage = language == .zh ? "未收到有效的登录凭证" : "Invalid authentication callback"
                        continuation.resume(returning: false)
                        return
                    }

                    let dict = Dictionary(uniqueKeysWithValues: items.compactMap { item -> (String, String)? in
                        guard let val = item.value else { return nil }
                        return (item.name, val)
                    })

                    if let returnedState = dict["state"], !returnedState.isEmpty, returnedState != state {
                        self.errorMessage = language == .zh ? "登录状态校验失败，请重试" : "Security state mismatch. Please retry."
                        continuation.resume(returning: false)
                        return
                    }

                    guard let idToken = dict["idToken"], !idToken.isEmpty,
                          let refreshToken = dict["refreshToken"], !refreshToken.isEmpty else {
                        self.errorMessage = language == .zh ? "登录凭证缺失，请重试" : "Missing credentials in callback"
                        continuation.resume(returning: false)
                        return
                    }

                    let newSession = StoredSession(
                        idToken: idToken,
                        refreshToken: refreshToken,
                        expiresAt: Date().addingTimeInterval(55 * 60),
                        email: dict["email"]?.isEmpty == false ? dict["email"] : nil,
                        uid: dict["uid"]
                    )
                    self.session = newSession
                    KeychainStore.save(newSession)
                    Haptics.success()
                    continuation.resume(returning: true)
                }
            }

            authSession.presentationContextProvider = self
            authSession.prefersEphemeralWebBrowserSession = false
            self.webAuthSession = authSession
            if !authSession.start() {
                self.webAuthSession = nil
                continuation.resume(returning: false)
            }
        }
    }

    /// Returns a valid ID token, refreshing silently if expired or forced.
    func validIDToken(forceRefresh: Bool = false) async -> String? {
        guard let current = session else { return nil }
        if !forceRefresh && current.expiresAt.timeIntervalSinceNow > 120 {
            return current.idToken
        }
        return await refreshIDToken(using: current)
    }

    private func refreshIDToken(using current: StoredSession) async -> String? {
        let refreshURL = Self.baseURL.appendingPathComponent("api/mobile/refresh")
        var request = URLRequest(url: refreshURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 15
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "refreshToken": current.refreshToken
        ])

        struct RefreshPayload: Decodable {
            let idToken: String
            let refreshToken: String
            let expiresIn: Double
            let uid: String?
            let email: String?
        }

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { return nil }
            if http.statusCode == 401 {
                signOut()
                return nil
            }
            guard (200..<300).contains(http.statusCode) else { return nil }
            let decoded = try JSONDecoder().decode(RefreshPayload.self, from: data)
            let updated = StoredSession(
                idToken: decoded.idToken,
                refreshToken: decoded.refreshToken,
                expiresAt: Date().addingTimeInterval(max(300, decoded.expiresIn - 120)),
                email: decoded.email ?? current.email,
                uid: decoded.uid ?? current.uid
            )
            self.session = updated
            KeychainStore.save(updated)
            return updated.idToken
        } catch {
            return current.idToken
        }
    }

    func signOut() {
        session = nil
        KeychainStore.clear()
        Haptics.light()
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            if let keyWindow = scenes.flatMap(\.windows).first(where: \.isKeyWindow) {
                return keyWindow
            }
            if let firstScene = scenes.first {
                return ASPresentationAnchor(windowScene: firstScene)
            }
            return ASPresentationAnchor()
        }
    }

    private static func randomState() -> String {
        var bytes = [UInt8](repeating: 0, count: 16)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
}
