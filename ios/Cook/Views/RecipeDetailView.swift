import SwiftUI

struct RecipeDetailView: View {
    @Environment(\.openURL) private var openURL
    @Environment(RecipeStore.self) private var recipeStore
    @Environment(CookingSessionManager.self) private var cookingSession

    let recipe: Recipe

    @State private var multiplier: Double = 1.0
    @State private var safariItem: SafariItem?

    private let multipliers: [Double] = [0.5, 1.0, 1.5, 2.0]

    var body: some View {
        let lang = recipeStore.language
        let steps = recipe.steps(for: lang)
        let videos = recipe.resolvedVideos
        let checked = recipeStore.checkedCount(for: recipe)
        let isFav = recipeStore.isFavorite(recipe.id)

        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Hero Cover
                ZStack(alignment: .bottomLeading) {
                    CachedCoverImage(urlString: recipe.cover_image)
                        .frame(height: 260)
                        .frame(maxWidth: .infinity)
                        .clipped()

                    LinearGradient(
                        colors: [.clear, .black.opacity(0.75)],
                        startPoint: .center,
                        endPoint: .bottom
                    )

                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 8) {
                            if !recipe.is_public {
                                Label(lang == .zh ? "私房食谱" : "Private", systemImage: "lock.fill")
                                    .font(.caption2.weight(.bold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(.ultraThinMaterial, in: Capsule())
                                    .foregroundStyle(.white)
                            }
                            ForEach(recipe.tags.prefix(3), id: \.self) { tag in
                                Text(tag)
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(.black.opacity(0.45), in: Capsule())
                                    .foregroundStyle(.white.opacity(0.92))
                            }
                        }

                        Text(recipe.primaryTitle(for: lang))
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(.white)

                        if let secondary = recipe.secondaryTitle(for: lang) {
                            Text(secondary)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.white.opacity(0.8))
                        }
                    }
                    .padding(18)
                }
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .padding(.horizontal, 16)

                // Description & Time Meta
                VStack(alignment: .leading, spacing: 14) {
                    if let desc = recipe.localizedDescription(for: lang) {
                        Text(desc)
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .lineSpacing(4)
                            .padding(.horizontal, 16)
                    }

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            if let prep = recipe.prep_time_mins {
                                metaPill(
                                    icon: "scissors",
                                    label: lang == .zh ? "备菜 \(prep) 分钟" : "Prep \(prep)m"
                                )
                            }
                            if let cook = recipe.cook_time_mins {
                                metaPill(
                                    icon: "flame.fill",
                                    label: lang == .zh ? "烹饪 \(cook) 分钟" : "Cook \(cook)m"
                                )
                            }
                            if let servings = recipe.servings {
                                let scaledServings = Int(max(1, (Double(servings) * multiplier).rounded()))
                                metaPill(
                                    icon: "person.2.fill",
                                    label: lang == .zh ? "\(scaledServings) 人份" : "\(scaledServings) servings"
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }

                // Multi-Video Tutorials (YouTube & Xiaohongshu)
                if !videos.isEmpty {
                    videoSection(videos: videos, lang: lang)
                }

                // Ingredients with Prep Checkboxes & Multiplier
                ingredientsSection(checked: checked, lang: lang)

                // Steps Preview (Tap any step to jump straight into Cooking Mode at that step)
                stepsSection(steps: steps, lang: lang)
            }
            .padding(.top, 8)
            .padding(.bottom, 120)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    recipeStore.toggleFavorite(recipe.id)
                } label: {
                    Image(systemName: isFav ? "heart.fill" : "heart")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(isFav ? .red : .primary)
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            startCookingBar(stepsCount: steps.count, lang: lang)
        }
        .sheet(item: $safariItem) { item in
            SafariSheetView(url: item.url)
                .ignoresSafeArea()
        }
    }

    // MARK: - Sections

    private func metaPill(icon: String, label: String) -> some View {
        Label(label, systemImage: icon)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: Capsule())
            .foregroundStyle(.primary.opacity(0.85))
    }

    private func videoSection(videos: [VideoLink], lang: AppLanguage) -> some View {
        let ytVideos = videos.filter(\.isYouTube)
        let otherVideos = videos.filter { !$0.isYouTube }

        return VStack(alignment: .leading, spacing: 10) {
            Text(lang == .zh ? "视频参考教程" : "Video Tutorials")
                .font(.headline)
                .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(ytVideos.enumerated()), id: \.element.id) { idx, vid in
                        Button {
                            if let url = URL(string: vid.url) {
                                Haptics.light()
                                safariItem = SafariItem(url: url)
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "play.rectangle.fill")
                                    .foregroundStyle(.red)
                                Text(
                                    ytVideos.count > 1
                                        ? (lang == .zh ? "YouTube 教程 \(idx + 1)" : "YouTube \(idx + 1)")
                                        : (lang == .zh ? "观看 YouTube 视频" : "Watch on YouTube")
                                )
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)
                            }
                            .padding(.horizontal, 14)
                            .frame(minHeight: 44)
                            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                            )
                        }
                        .buttonStyle(SpringPressButtonStyle())
                    }

                    ForEach(Array(otherVideos.enumerated()), id: \.element.id) { idx, vid in
                        Button {
                            if let url = URL(string: vid.url) {
                                Haptics.light()
                                if vid.isXiaohongshu {
                                    openURL(url)
                                } else {
                                    safariItem = SafariItem(url: url)
                                }
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: vid.isXiaohongshu ? "book.closed.fill" : "safari.fill")
                                    .foregroundStyle(vid.isXiaohongshu ? .pink : .blue)
                                Text(
                                    vid.isXiaohongshu
                                        ? (otherVideos.count > 1
                                            ? (lang == .zh ? "小红书教程 \(idx + 1)" : "Xiaohongshu \(idx + 1)")
                                            : (lang == .zh ? "打开小红书教程" : "Open Xiaohongshu"))
                                        : (lang == .zh ? "查看原视频" : "Open Video")
                                )
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)
                                Image(systemName: "arrow.up.right")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 14)
                            .frame(minHeight: 44)
                            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                            )
                        }
                        .buttonStyle(SpringPressButtonStyle())
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    private func ingredientsSection(checked: Int, lang: AppLanguage) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(lang == .zh ? "备菜清单" : "Ingredients")
                        .font(.title3.weight(.bold))
                    Text(
                        lang == .zh
                            ? "轻点勾选已备齐食材（\(checked)/\(recipe.ingredients.count)）"
                            : "Tap to check off prepped items (\(checked)/\(recipe.ingredients.count))"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                if checked > 0 {
                    Button {
                        withAnimation(.snappy(duration: 0.2)) {
                            recipeStore.resetCheckedIngredients(for: recipe.id)
                        }
                    } label: {
                        Text(lang == .zh ? "重置" : "Reset")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(.quaternary, in: Capsule())
                    }
                }
            }

            // Portion Multiplier Selector
            HStack(spacing: 6) {
                Text(lang == .zh ? "分量缩放" : "Scale")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                ForEach(multipliers, id: \.self) { m in
                    let active = abs(multiplier - m) < 0.01
                    Button {
                        withAnimation(.snappy(duration: 0.2)) {
                            multiplier = m
                        }
                        Haptics.selection()
                    } label: {
                        Text(m == floor(m) ? "\(Int(m))×" : String(format: "%.1f×", m))
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 12)
                            .frame(minHeight: 36)
                            .background(active ? Color.accentColor : Color.primary.opacity(0.06), in: Capsule())
                            .foregroundStyle(active ? .white : .primary)
                            .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            VStack(spacing: 0) {
                ForEach(Array(recipe.ingredients.enumerated()), id: \.element.id) { idx, ing in
                    let isChecked = recipeStore.isIngredientChecked(ing.id, in: recipe.id)
                    Button {
                        withAnimation(.snappy(duration: 0.2)) {
                            recipeStore.toggleIngredient(ing.id, in: recipe.id)
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: isChecked ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 21, weight: .medium))
                                .foregroundStyle(isChecked ? Color.green : Color.secondary.opacity(0.45))

                            VStack(alignment: .leading, spacing: 2) {
                                Text(ing.primaryName(for: lang))
                                    .font(.body.weight(.medium))
                                    .strikethrough(isChecked, color: .secondary)
                                    .foregroundStyle(isChecked ? .secondary : .primary)

                                if let sec = ing.secondaryName(for: lang) {
                                    Text(sec)
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                }
                            }

                            Spacer()

                            Text(ing.scaledQuantity(multiplier: multiplier))
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(isChecked ? Color.secondary.opacity(0.6) : Color.accentColor)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 13)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)

                    if idx < recipe.ingredients.count - 1 {
                        Divider().padding(.leading, 48)
                    }
                }
            }
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .padding(.horizontal, 16)
    }

    private func stepsSection(steps: [RecipeStep], lang: AppLanguage) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(lang == .zh ? "烹饪步骤" : "Steps")
                    .font(.title3.weight(.bold))
                Spacer()
                Text(lang == .zh ? "轻点步骤可直接从该步开炒" : "Tap any step to start")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                let timers = StepTimerDetector.detect(in: step.body)

                Button {
                    cookingSession.startCooking(recipe: recipe, startingAt: index, multiplier: multiplier)
                } label: {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 10) {
                            Text("\(index + 1)")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.white)
                                .frame(width: 28, height: 28)
                                .background(Color.accentColor, in: Circle())

                            if let label = step.label {
                                Text(label)
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                            }

                            Spacer()

                            if let firstTimer = timers.first {
                                Label(firstTimer.display(for: lang), systemImage: "timer")
                                    .font(.caption2.weight(.semibold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.orange.opacity(0.14), in: Capsule())
                                    .foregroundStyle(.orange)
                            }
                        }

                        Text(step.body)
                            .font(.body)
                            .foregroundStyle(.primary.opacity(0.9))
                            .lineSpacing(5)
                            .multilineTextAlignment(.leading)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(SpringPressButtonStyle(scale: 0.985))
            }
        }
        .padding(.horizontal, 16)
    }

    private func startCookingBar(stepsCount: Int, lang: AppLanguage) -> some View {
        let isSameActive = cookingSession.activeRecipe?.id == recipe.id
        return Button {
            if isSameActive {
                cookingSession.servingsMultiplier = multiplier
                cookingSession.resumeCooking()
            } else {
                cookingSession.startCooking(recipe: recipe, startingAt: 0, multiplier: multiplier)
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 18, weight: .bold))
                Text(
                    isSameActive
                        ? (lang == .zh ? "继续做菜（第 \(cookingSession.currentStepIndex + 1)/\(max(1, stepsCount)) 步）" : "Resume Cooking (Step \(cookingSession.currentStepIndex + 1)/\(max(1, stepsCount)))")
                        : (lang == .zh ? "开始做菜 · 全屏常亮模式" : "Start Cooking · Keep Screen Awake")
                )
                .font(.headline.weight(.bold))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    colors: [
                        Color(red: 0.92, green: 0.43, blue: 0.12),
                        Color(red: 0.82, green: 0.31, blue: 0.09)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                in: RoundedRectangle(cornerRadius: 20, style: .continuous)
            )
            .shadow(color: Color.orange.opacity(0.35), radius: 14, y: 6)
        }
        .buttonStyle(SpringPressButtonStyle())
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background(
            LinearGradient(
                colors: [
                    Color(uiColor: .systemGroupedBackground).opacity(0),
                    Color(uiColor: .systemGroupedBackground).opacity(0.95),
                    Color(uiColor: .systemGroupedBackground)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
    }
}
