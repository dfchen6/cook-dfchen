import SwiftUI
import UIKit

struct CookingModeView: View {
    @Environment(\.scenePhase) private var scenePhase
    @Environment(RecipeStore.self) private var recipeStore
    @Environment(CookingSessionManager.self) private var cookingSession

    let recipe: Recipe

    @State private var showingIngredientsSheet = false
    @State private var showingCompletionBanner = false

    private let quickTimerPresetsMinutes = [1, 3, 5, 10, 15, 20, 30]

    var body: some View {
        @Bindable var session = cookingSession
        let lang = recipeStore.language
        let steps = recipe.steps(for: lang)
        let safeTotal = max(1, steps.count)
        let currentIdx = min(max(0, cookingSession.currentStepIndex), safeTotal - 1)
        let checkedCount = recipeStore.checkedCount(for: recipe)

        ZStack {
            // Deep high-contrast warm obsidian kitchen canvas
            Color(red: 0.07, green: 0.06, blue: 0.055)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Top HUD Bar
                topHUD(stepsCount: safeTotal, currentIdx: currentIdx, lang: lang)

                // Segmented Progress Bar (tappable!)
                segmentedProgressBar(total: safeTotal, current: currentIdx)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 6)

                // Active Countdown Timers Strip
                if !cookingSession.timers.isEmpty {
                    activeTimersStrip(lang: lang)
                        .padding(.top, 4)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }

                // Swipeable 120Hz Paged Step Cards
                if steps.isEmpty {
                    Spacer()
                    Text(lang == .zh ? "暂无步骤说明" : "No step instructions available")
                        .font(.title3)
                        .foregroundStyle(.white.opacity(0.6))
                    Spacer()
                } else {
                    TabView(selection: $session.currentStepIndex) {
                        ForEach(Array(steps.enumerated()), id: \.offset) { idx, step in
                            stepSlideCard(
                                step: step,
                                index: idx,
                                total: steps.count,
                                nextStep: idx + 1 < steps.count ? steps[idx + 1] : nil,
                                lang: lang
                            )
                            .tag(idx)
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .never))
                    .onChange(of: cookingSession.currentStepIndex) { _, _ in
                        Haptics.selection()
                    }
                }

                // Giant One-Handed Bottom Dock
                bottomControlDock(
                    currentIdx: currentIdx,
                    total: safeTotal,
                    checkedCount: checkedCount,
                    lang: lang
                )
            }

            if showingCompletionBanner {
                completionOverlay(lang: lang)
                    .transition(.scale(scale: 0.92).combined(with: .opacity))
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            UIApplication.shared.isIdleTimerDisabled = true
        }
        .onDisappear {
            UIApplication.shared.isIdleTimerDisabled = false
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                UIApplication.shared.isIdleTimerDisabled = true
            }
        }
        .sheet(isPresented: $showingIngredientsSheet) {
            CookingIngredientsDrawer(recipe: recipe)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
                .presentationBackgroundInteraction(.enabled(upThrough: .medium))
        }
    }

    // MARK: - Top HUD & Progress

    private func topHUD(stepsCount: Int, currentIdx: Int, lang: AppLanguage) -> some View {
        ZStack {
            // Centered title & keep-awake status
            VStack(spacing: 2) {
                Text(recipe.primaryTitle(for: lang))
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)

                HStack(spacing: 5) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 6, height: 6)
                    Text(lang == .zh ? "屏幕常亮中" : "Screen Awake")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(.white.opacity(0.65))
                }
            }
            .padding(.horizontal, 98)

            HStack(spacing: 8) {
                // Minimize button (keeps active session & timers floating!)
                Button {
                    cookingSession.minimizeCooking()
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "chevron.down")
                            .font(.system(size: 13, weight: .bold))
                        Text(lang == .zh ? "收起" : "Minimize")
                            .font(.footnote.weight(.semibold))
                    }
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.horizontal, 12)
                    .frame(height: 38)
                    .background(.white.opacity(0.11), in: Capsule())
                    .frame(minHeight: 44)
                    .contentShape(Capsule())
                }

                Spacer()

                // Font size toggle
                Button {
                    withAnimation(.snappy(duration: 0.2)) {
                        cookingSession.useExtraLargeFont.toggle()
                    }
                    Haptics.selection()
                } label: {
                    Text(cookingSession.useExtraLargeFont ? "A+" : "A")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(cookingSession.useExtraLargeFont ? .orange : .white.opacity(0.88))
                        .frame(width: 38, height: 38)
                        .background(.white.opacity(0.11), in: Circle())
                        .frame(width: 44, height: 44)
                        .contentShape(Circle())
                }

                // End session button
                Button {
                    cookingSession.finishCooking()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white.opacity(0.8))
                        .frame(width: 38, height: 38)
                        .background(.white.opacity(0.11), in: Circle())
                        .frame(width: 44, height: 44)
                        .contentShape(Circle())
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 6)
    }

    private func segmentedProgressBar(total: Int, current: Int) -> some View {
        HStack(spacing: 5) {
            ForEach(0..<total, id: \.self) { idx in
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                        cookingSession.currentStepIndex = idx
                    }
                } label: {
                    Capsule()
                        .fill(
                            idx == current
                                ? Color.orange
                                : (idx < current ? Color.orange.opacity(0.45) : Color.white.opacity(0.14))
                        )
                        .frame(height: idx == current ? 6 : 4)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Concurrent Kitchen Timers Strip

    private func activeTimersStrip(lang: AppLanguage) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(cookingSession.timers) { timer in
                    HStack(spacing: 10) {
                        Button {
                            cookingSession.togglePauseTimer(timer.id, language: lang)
                        } label: {
                            Image(
                                systemName: timer.isCompleted
                                    ? "checkmark.circle.fill"
                                    : (timer.isRunning ? "pause.fill" : "play.fill")
                            )
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(timer.isCompleted ? .black : .white)
                            .frame(width: 28, height: 28)
                            .background(
                                timer.isCompleted ? Color.green : Color.orange.opacity(0.85),
                                in: Circle()
                            )
                        }

                        VStack(alignment: .leading, spacing: 1) {
                            Text(timer.label)
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.white.opacity(0.75))
                                .lineLimit(1)
                            Text(timer.isCompleted ? (lang == .zh ? "时间到！" : "Done!") : timer.formattedRemaining)
                                .font(.system(.callout, design: .monospaced).weight(.bold))
                                .foregroundStyle(timer.isCompleted ? .green : .white)
                                .contentTransition(.numericText(countsDown: true))
                        }

                        Button {
                            cookingSession.addOneMinute(timer.id, language: lang)
                        } label: {
                            Text("+1m")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(.orange)
                                .padding(.horizontal, 7)
                                .padding(.vertical, 4)
                                .background(.orange.opacity(0.16), in: Capsule())
                        }

                        Button {
                            withAnimation(.snappy(duration: 0.2)) {
                                cookingSession.dismissTimer(timer.id)
                            }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(.white.opacity(0.5))
                                .padding(4)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(timer.isCompleted ? Color.green.opacity(0.22) : Color.white.opacity(0.09))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .strokeBorder(timer.isCompleted ? Color.green : Color.orange.opacity(0.4), lineWidth: 1)
                    )
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Individual Step Card

    private func stepSlideCard(
        step: RecipeStep,
        index: Int,
        total: Int,
        nextStep: RecipeStep?,
        lang: AppLanguage
    ) -> some View {
        let detectedTimers = StepTimerDetector.detect(in: step.body)
        let isCompactScreen = UIScreen.main.bounds.height < 720
        let bodyFontSize: CGFloat = cookingSession.useExtraLargeFont
            ? (isCompactScreen ? 26 : 31)
            : (isCompactScreen ? 22 : 25)
        let cardPadding: CGFloat = isCompactScreen ? 18 : 24

        return VStack(spacing: 12) {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    // Step Header Badge
                    HStack(spacing: 12) {
                        Text(lang == .zh ? "第 \(index + 1) / \(total) 步" : "STEP \(index + 1) OF \(total)")
                            .font(.subheadline.weight(.heavy))
                            .tracking(0.6)
                            .foregroundStyle(.orange)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(.orange.opacity(0.16), in: Capsule())

                        if let label = step.label {
                            Text(label)
                                .font(.title3.weight(.bold))
                                .foregroundStyle(.white.opacity(0.92))
                        }

                        Spacer()
                    }

                    // High-contrast, counter-distance readable instruction text
                    Text(step.body)
                        .font(.system(size: bodyFontSize, weight: .semibold))
                        .foregroundStyle(Color(red: 0.98, green: 0.97, blue: 0.95))
                        .lineSpacing(10)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.top, 4)

                    // Smart Auto-Detected Step Timers + Quick Timer Menu
                    HStack(spacing: 10) {
                        ForEach(detectedTimers) { suggested in
                            Button {
                                let stepTitle = step.label ?? (lang == .zh ? "第 \(index + 1) 步" : "Step \(index + 1)")
                                cookingSession.startTimer(
                                    seconds: suggested.seconds,
                                    recipe: recipe,
                                    stepIndex: index,
                                    label: stepTitle,
                                    language: lang
                                )
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "timer")
                                        .font(.system(size: 17, weight: .bold))
                                    Text(
                                        lang == .zh
                                            ? "开启 \(suggested.displayZh) 倒计时"
                                            : "Start \(suggested.displayEn) Timer"
                                    )
                                    .font(.callout.weight(.bold))
                                }
                                .foregroundStyle(.black)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color.orange, in: Capsule())
                            }
                            .buttonStyle(SpringPressButtonStyle())
                        }

                        Menu {
                            ForEach(quickTimerPresetsMinutes, id: \.self) { mins in
                                Button {
                                    let stepTitle = step.label ?? (lang == .zh ? "第 \(index + 1) 步" : "Step \(index + 1)")
                                    cookingSession.startTimer(
                                        seconds: mins * 60,
                                        recipe: recipe,
                                        stepIndex: index,
                                        label: stepTitle,
                                        language: lang
                                    )
                                } label: {
                                    Label(
                                        lang == .zh ? "\(mins) 分钟" : "\(mins) min",
                                        systemImage: "timer"
                                    )
                                }
                            }
                        } label: {
                            Label(lang == .zh ? "定时" : "Timer", systemImage: "plus.circle")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 11)
                                .background(.white.opacity(0.10), in: Capsule())
                        }
                    }
                    .padding(.top, 6)
                }
                .padding(cardPadding)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .fill(Color(red: 0.12, green: 0.105, blue: 0.095))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .strokeBorder(.white.opacity(0.08), lineWidth: 1)
            )

            // Subtle Next-Step Preview so high-heat stir-frying never surprises you
            if let nextStep {
                Button {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.85)) {
                        cookingSession.currentStepIndex = index + 1
                    }
                } label: {
                    HStack(spacing: 10) {
                        Text(lang == .zh ? "下一步预告" : "UP NEXT")
                            .font(.caption2.weight(.heavy))
                            .foregroundStyle(.orange.opacity(0.9))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.orange.opacity(0.14), in: Capsule())

                        Text(nextStep.label.map { "\($0)：\(nextStep.body)" } ?? nextStep.body)
                            .font(.footnote)
                            .foregroundStyle(.white.opacity(0.68))
                            .lineLimit(1)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.white.opacity(0.4))
                    }
                    .padding(.horizontal, 16)
                    .frame(minHeight: 44)
                    .background(.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 6)
    }

    // MARK: - Giant One-Handed Bottom Control Dock

    private func bottomControlDock(
        currentIdx: Int,
        total: Int,
        checkedCount: Int,
        lang: AppLanguage
    ) -> some View {
        let isLastStep = currentIdx >= total - 1

        return HStack(spacing: 12) {
            // Large Previous Button
            Button {
                guard currentIdx > 0 else { return }
                withAnimation(.spring(response: 0.32, dampingFraction: 0.84)) {
                    cookingSession.currentStepIndex = currentIdx - 1
                }
            } label: {
                Image(systemName: "arrow.left")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(currentIdx > 0 ? .white : .white.opacity(0.25))
                    .frame(width: 64, height: 62)
                    .background(.white.opacity(currentIdx > 0 ? 0.12 : 0.05), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
            .disabled(currentIdx == 0)
            .buttonStyle(SpringPressButtonStyle())

            // Ingredients Quick Drawer Button
            Button {
                showingIngredientsSheet = true
                Haptics.light()
            } label: {
                VStack(spacing: 3) {
                    Image(systemName: "checklist")
                        .font(.system(size: 19, weight: .bold))
                    Text(lang == .zh ? "配料 \(checkedCount)/\(recipe.ingredients.count)" : "Items")
                        .font(.caption2.weight(.bold))
                }
                .foregroundStyle(.white)
                .frame(width: 88, height: 62)
                .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            }
            .buttonStyle(SpringPressButtonStyle())

            // Giant Primary Next / Finish Button
            Button {
                if isLastStep {
                    Haptics.success()
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.78)) {
                        showingCompletionBanner = true
                    }
                } else {
                    withAnimation(.spring(response: 0.32, dampingFraction: 0.84)) {
                        cookingSession.currentStepIndex = currentIdx + 1
                    }
                }
            } label: {
                HStack(spacing: 10) {
                    Text(
                        isLastStep
                            ? (lang == .zh ? "完成出锅！" : "Finish Dish!")
                            : (lang == .zh ? "下一步" : "Next Step")
                    )
                    .font(.title3.weight(.bold))

                    Image(systemName: isLastStep ? "sparkles" : "arrow.right")
                        .font(.system(size: 19, weight: .bold))
                }
                .foregroundStyle(isLastStep ? .black : .white)
                .frame(maxWidth: .infinity)
                .frame(height: 62)
                .background(
                    isLastStep
                        ? AnyShapeStyle(Color.green)
                        : AnyShapeStyle(
                            LinearGradient(
                                colors: [
                                    Color(red: 0.94, green: 0.46, blue: 0.12),
                                    Color(red: 0.84, green: 0.32, blue: 0.08)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        ),
                    in: RoundedRectangle(cornerRadius: 20, style: .continuous)
                )
            }
            .buttonStyle(SpringPressButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Dish Completed Celebration Modal

    private func completionOverlay(lang: AppLanguage) -> some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()
                .onTapGesture {
                    showingCompletionBanner = false
                }

            VStack(spacing: 18) {
                Text("🍲")
                    .font(.system(size: 56))

                Text(lang == .zh ? "美味出锅！" : "Bon Appétit!")
                    .font(.title.weight(.heavy))
                    .foregroundStyle(.white)

                Text(recipe.primaryTitle(for: lang))
                    .font(.headline)
                    .foregroundStyle(.orange)

                Button {
                    cookingSession.finishCooking()
                } label: {
                    Text(lang == .zh ? "完成并返回食谱" : "Done")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.orange, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(SpringPressButtonStyle())
                .padding(.top, 6)

                Button {
                    withAnimation(.snappy(duration: 0.2)) {
                        showingCompletionBanner = false
                    }
                } label: {
                    Text(lang == .zh ? "再看一眼步骤" : "Stay on Steps")
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
            .padding(28)
            .frame(maxWidth: 320)
            .background(
                Color(red: 0.14, green: 0.12, blue: 0.11),
                in: RoundedRectangle(cornerRadius: 28, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .strokeBorder(.orange.opacity(0.4), lineWidth: 1)
            )
        }
    }
}

private struct CookingIngredientsDrawer: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(RecipeStore.self) private var recipeStore
    @Environment(CookingSessionManager.self) private var cookingSession

    let recipe: Recipe

    var body: some View {
        let lang = recipeStore.language
        let mult = cookingSession.servingsMultiplier

        NavigationStack {
            List {
                ForEach(recipe.ingredients) { ing in
                    let isChecked = recipeStore.isIngredientChecked(ing.id, in: recipe.id)
                    Button {
                        withAnimation(.snappy(duration: 0.2)) {
                            recipeStore.toggleIngredient(ing.id, in: recipe.id)
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 22))
                                .foregroundStyle(isChecked ? Color.green : Color.secondary)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(ing.primaryName(for: lang))
                                    .font(.headline)
                                    .strikethrough(isChecked, color: .secondary)
                                    .foregroundStyle(isChecked ? Color.secondary : Color.primary)
                                if let sec = ing.secondaryName(for: lang) {
                                    Text(sec)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            Text(ing.scaledQuantity(multiplier: mult))
                                .font(.headline)
                                .foregroundStyle(isChecked ? Color.secondary : Color.orange)
                        }
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationTitle(
                lang == .zh
                    ? (abs(mult - 1.0) > 0.01 ? "配料表（\(String(format: "%.1f×", mult))）" : "配料速查")
                    : "Ingredients"
            )
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(lang == .zh ? "收起" : "Close") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
