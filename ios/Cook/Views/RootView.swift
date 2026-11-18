import SwiftUI

struct RootView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(RecipeStore.self) private var recipeStore
    @Environment(CookingSessionManager.self) private var cookingSession

    @State private var showingAccountSheet = false
    @State private var navigationPath = NavigationPath()

    var body: some View {
        @Bindable var session = cookingSession

        NavigationStack(path: $navigationPath) {
            RecipeHomeView(showingAccountSheet: $showingAccountSheet)
                .navigationDestination(for: Recipe.self) { recipe in
                    RecipeDetailView(recipe: recipe)
                }
        }
        .onOpenURL { url in
            guard url.scheme == "cookdfchen" else { return }
            let host = url.host() ?? ""
            let slug = url.pathComponents.dropFirst().first ?? ""
            guard !slug.isEmpty,
                  let target = recipeStore.recipes.first(where: { $0.slug == slug }) else { return }
            if host == "recipe" {
                cookingSession.isPresentingFullScreen = false
                navigationPath = NavigationPath()
                navigationPath.append(target)
            } else if host == "cook" {
                let step = Int(URLComponents(url: url, resolvingAgainstBaseURL: false)?
                    .queryItems?.first(where: { $0.name == "step" })?.value ?? "0") ?? 0
                cookingSession.startCooking(recipe: target, startingAt: step)
            }
        }
        .safeAreaInset(edge: .bottom) {
            if cookingSession.hasActiveSession && !cookingSession.isPresentingFullScreen {
                ActiveCookingFloatingBar()
                    .padding(.horizontal, 16)
                    .padding(.bottom, 6)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.82), value: cookingSession.hasActiveSession)
        .animation(.spring(response: 0.35, dampingFraction: 0.82), value: cookingSession.isPresentingFullScreen)
        .sheet(isPresented: $showingAccountSheet) {
            AccountSheetView()
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .fullScreenCover(isPresented: $session.isPresentingFullScreen) {
            if let activeRecipe = cookingSession.activeRecipe {
                CookingModeView(recipe: activeRecipe)
            }
        }
    }
}

private struct ActiveCookingFloatingBar: View {
    @Environment(RecipeStore.self) private var recipeStore
    @Environment(CookingSessionManager.self) private var cookingSession

    var body: some View {
        let lang = recipeStore.language

        VStack(spacing: 8) {
            if let firstTimer = cookingSession.timers.first {
                HStack(spacing: 10) {
                    Image(systemName: firstTimer.isCompleted ? "bell.badge.fill" : "timer")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(firstTimer.isCompleted ? .green : .orange)

                    Text("\(firstTimer.recipeTitle) · \(firstTimer.label)")
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(.white.opacity(0.9))
                        .lineLimit(1)

                    Spacer()

                    Text(firstTimer.formattedRemaining)
                        .font(.system(.subheadline, design: .monospaced).weight(.bold))
                        .foregroundStyle(firstTimer.isCompleted ? .green : .orange)
                        .contentTransition(.numericText(countsDown: true))

                    if cookingSession.timers.count > 1 {
                        Text("+\(cookingSession.timers.count - 1)")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.white.opacity(0.14), in: Capsule())
                            .foregroundStyle(.white)
                    }

                    Button {
                        cookingSession.dismissTimer(firstTimer.id)
                    } label: {
                        Image(systemName: "xmark")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.white.opacity(0.6))
                            .padding(6)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(Color(red: 0.12, green: 0.11, blue: 0.10).opacity(0.96), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }

            if let recipe = cookingSession.activeRecipe {
                let steps = recipe.steps(for: lang)
                Button {
                    cookingSession.resumeCooking()
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            Circle()
                                .fill(Color.orange.opacity(0.22))
                                .frame(width: 36, height: 36)
                            Image(systemName: "flame.fill")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(.orange)
                        }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(lang == .zh ? "正在烹饪 · 点击回到大图模式" : "Cooking Now · Tap to resume")
                                .font(.caption2.weight(.semibold))
                                .foregroundStyle(.orange)
                            Text("\(recipe.primaryTitle(for: lang))  ·  \(min(cookingSession.currentStepIndex + 1, max(1, steps.count)))/\(max(1, steps.count))")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                        }

                        Spacer()

                        Image(systemName: "arrow.up.left.and.arrow.down.right")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white.opacity(0.85))
                            .padding(8)
                            .background(.white.opacity(0.12), in: Circle())
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(
                        LinearGradient(
                            colors: [
                                Color(red: 0.16, green: 0.13, blue: 0.11),
                                Color(red: 0.11, green: 0.09, blue: 0.08)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        in: RoundedRectangle(cornerRadius: 20, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .strokeBorder(.orange.opacity(0.35), lineWidth: 1)
                    )
                    .shadow(color: .black.opacity(0.28), radius: 14, y: 6)
                }
                .buttonStyle(SpringPressButtonStyle())
            }
        }
    }
}
