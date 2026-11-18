import AudioToolbox
import Foundation
import Observation
import UserNotifications

struct KitchenTimer: Identifiable, Equatable {
    let id: UUID
    let recipeId: String
    let recipeTitle: String
    let stepIndex: Int
    let label: String
    var totalSeconds: Int
    var remainingSeconds: Int
    var endDate: Date?
    var isRunning: Bool
    var isCompleted: Bool

    var formattedRemaining: String {
        let clamped = max(0, remainingSeconds)
        let hrs = clamped / 3600
        let mins = (clamped % 3600) / 60
        let secs = clamped % 60
        if hrs > 0 {
            return String(format: "%d:%02d:%02d", hrs, mins, secs)
        }
        return String(format: "%02d:%02d", mins, secs)
    }

    var progress: Double {
        guard totalSeconds > 0 else { return 1 }
        return min(1.0, max(0.0, 1.0 - (Double(remainingSeconds) / Double(totalSeconds))))
    }
}

@MainActor
@Observable
final class CookingSessionManager {
    // Active recipe session
    private(set) var activeRecipe: Recipe?
    var currentStepIndex: Int = 0
    var servingsMultiplier: Double = 1.0
    var isPresentingFullScreen: Bool = false
    var useExtraLargeFont: Bool = false

    // Concurrent timers
    private(set) var timers: [KitchenTimer] = []
    private var tickerTask: Task<Void, Never>?

    var hasActiveSession: Bool {
        activeRecipe != nil || !timers.isEmpty
    }

    init() {
        startTickerIfNeeded()
    }

    // MARK: - Cooking Session Lifecycle

    func startCooking(recipe: Recipe, startingAt stepIndex: Int = 0, multiplier: Double = 1.0) {
        if activeRecipe?.id != recipe.id {
            activeRecipe = recipe
            currentStepIndex = max(0, stepIndex)
            servingsMultiplier = multiplier
        } else if stepIndex > 0 {
            currentStepIndex = stepIndex
        } else {
            servingsMultiplier = multiplier
        }
        isPresentingFullScreen = true
        Haptics.medium()
    }

    func resumeCooking() {
        guard activeRecipe != nil else { return }
        isPresentingFullScreen = true
        Haptics.light()
    }

    func minimizeCooking() {
        isPresentingFullScreen = false
        Haptics.selection()
    }

    func finishCooking() {
        isPresentingFullScreen = false
        activeRecipe = nil
        currentStepIndex = 0
        servingsMultiplier = 1.0
        Haptics.success()
    }

    // MARK: - Kitchen Timers

    func startTimer(seconds: Int, recipe: Recipe, stepIndex: Int, label: String, language: AppLanguage) {
        requestNotificationPermissionIfNeeded()

        let id = UUID()
        let end = Date().addingTimeInterval(TimeInterval(seconds))
        let timer = KitchenTimer(
            id: id,
            recipeId: recipe.id,
            recipeTitle: recipe.primaryTitle(for: language),
            stepIndex: stepIndex,
            label: label,
            totalSeconds: seconds,
            remainingSeconds: seconds,
            endDate: end,
            isRunning: true,
            isCompleted: false
        )
        timers.insert(timer, at: 0)
        scheduleNotification(for: timer, language: language)
        startTickerIfNeeded()
        Haptics.medium()
    }

    func togglePauseTimer(_ id: UUID, language: AppLanguage) {
        guard let idx = timers.firstIndex(where: { $0.id == id }) else { return }
        if timers[idx].isCompleted {
            dismissTimer(id)
            return
        }
        if timers[idx].isRunning {
            if let end = timers[idx].endDate {
                timers[idx].remainingSeconds = max(1, Int(ceil(end.timeIntervalSinceNow)))
            }
            timers[idx].endDate = nil
            timers[idx].isRunning = false
            cancelNotification(id: id)
            Haptics.selection()
        } else {
            let end = Date().addingTimeInterval(TimeInterval(timers[idx].remainingSeconds))
            timers[idx].endDate = end
            timers[idx].isRunning = true
            scheduleNotification(for: timers[idx], language: language)
            startTickerIfNeeded()
            Haptics.light()
        }
    }

    func addOneMinute(_ id: UUID, language: AppLanguage) {
        guard let idx = timers.firstIndex(where: { $0.id == id }) else { return }
        timers[idx].totalSeconds += 60
        timers[idx].remainingSeconds += 60
        timers[idx].isCompleted = false
        if timers[idx].isRunning {
            let base = timers[idx].endDate ?? Date()
            timers[idx].endDate = base.addingTimeInterval(60)
            scheduleNotification(for: timers[idx], language: language)
        } else {
            timers[idx].endDate = Date().addingTimeInterval(TimeInterval(timers[idx].remainingSeconds))
            timers[idx].isRunning = true
            scheduleNotification(for: timers[idx], language: language)
        }
        startTickerIfNeeded()
        Haptics.light()
    }

    func dismissTimer(_ id: UUID) {
        cancelNotification(id: id)
        timers.removeAll { $0.id == id }
        Haptics.selection()
    }

    private func startTickerIfNeeded() {
        guard tickerTask == nil else { return }
        tickerTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(500))
                guard let self else { break }
                self.tick()
                if !self.timers.contains(where: \.isRunning) {
                    self.tickerTask = nil
                    break
                }
            }
        }
    }

    private func tick() {
        let now = Date()
        for i in timers.indices where timers[i].isRunning {
            guard let end = timers[i].endDate else { continue }
            let left = Int(ceil(end.timeIntervalSince(now)))
            if left <= 0 {
                timers[i].remainingSeconds = 0
                timers[i].isRunning = false
                timers[i].endDate = nil
                if !timers[i].isCompleted {
                    timers[i].isCompleted = true
                    Haptics.success()
                    AudioServicesPlaySystemSound(1005)
                }
            } else if timers[i].remainingSeconds != left {
                timers[i].remainingSeconds = left
            }
        }
    }

    // MARK: - Local Notifications

    private func requestNotificationPermissionIfNeeded() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }

    private func scheduleNotification(for timer: KitchenTimer, language: AppLanguage) {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [timer.id.uuidString])

        guard timer.remainingSeconds > 0 else { return }
        let content = UNMutableNotificationContent()
        content.title = language == .zh ? "⏰ 烹饪计时完成！" : "⏰ Cooking Timer Done!"
        content.body = "\(timer.recipeTitle) · \(timer.label)"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: TimeInterval(max(1, timer.remainingSeconds)),
            repeats: false
        )
        let req = UNNotificationRequest(
            identifier: timer.id.uuidString,
            content: content,
            trigger: trigger
        )
        center.add(req)
    }

    private func cancelNotification(id: UUID) {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [id.uuidString])
    }
}
