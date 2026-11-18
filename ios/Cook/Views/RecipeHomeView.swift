import SwiftUI

struct RecipeHomeView: View {
    @Environment(AuthManager.self) private var authManager
    @Environment(RecipeStore.self) private var recipeStore

    @Binding var showingAccountSheet: Bool

    var body: some View {
        @Bindable var store = recipeStore
        let lang = recipeStore.language
        let filtered = recipeStore.filteredRecipes

        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                // Sync / Sign-in Banner when unauthenticated
                if !authManager.isSignedIn {
                    signInPromptCard(lang: lang)
                }

                // Filter Strip (Quick filters + Top Cuisine/Ingredient Tags)
                filterStrip(lang: lang)

                // Results Header
                HStack {
                    Text(
                        lang == .zh
                            ? "共 \(filtered.count) 道食谱"
                            : "\(filtered.count) Recipes"
                    )
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)

                    Spacer()

                    if recipeStore.selectedTag != nil || recipeStore.activeQuickFilter != .all {
                        Button {
                            withAnimation(.snappy(duration: 0.25)) {
                                recipeStore.selectedTag = nil
                                recipeStore.activeQuickFilter = .all
                            }
                            Haptics.selection()
                        } label: {
                            Text(lang == .zh ? "清除筛选" : "Reset")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(Color.accentColor)
                        }
                    }
                }
                .padding(.horizontal, 16)

                if recipeStore.isSyncing && recipeStore.recipes.isEmpty {
                    loadingPlaceholder(lang: lang)
                } else if filtered.isEmpty {
                    emptyState(lang: lang)
                } else {
                    LazyVStack(spacing: 16) {
                        ForEach(filtered) { recipe in
                            NavigationLink(value: recipe) {
                                RecipeCardView(recipe: recipe)
                            }
                            .buttonStyle(SpringPressButtonStyle(scale: 0.98))
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 100)
        }
        .background(Color(uiColor: .systemGroupedBackground))
        .navigationTitle(lang == .zh ? "私房食谱" : "Cookbook")
        .searchable(
            text: $store.searchQuery,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: lang == .zh ? "搜索菜名、食材（如五花肉、江西菜）…" : "Search dishes, ingredients, tags…"
        )
        .refreshable {
            await recipeStore.sync(using: authManager)
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    withAnimation(.snappy(duration: 0.2)) {
                        recipeStore.language = recipeStore.language == .zh ? .en : .zh
                    }
                    Haptics.selection()
                } label: {
                    Text(lang == .zh ? "EN" : "中")
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(.quaternary, in: Capsule())
                }
            }

            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingAccountSheet = true
                    Haptics.selection()
                } label: {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(authManager.isSignedIn ? Color.green : Color.secondary.opacity(0.5))
                            .frame(width: 7, height: 7)
                        Image(systemName: authManager.isSignedIn ? "person.crop.circle.fill" : "person.crop.circle")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(.quaternary.opacity(0.7), in: Capsule())
                }
            }
        }
    }

    // MARK: - Subviews

    private func signInPromptCard(lang: AppLanguage) -> some View {
        Button {
            Task {
                if await authManager.signInWithGoogle(language: lang) {
                    await recipeStore.sync(using: authManager)
                }
            }
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.accentColor.opacity(0.15))
                        .frame(width: 44, height: 44)
                    Image(systemName: "lock.open.rotation")
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(Color.accentColor)
                }

                VStack(alignment: .leading, spacing: 3) {
                    Text(lang == .zh ? "登录 Google 解锁全部私房食谱" : "Sign in to sync private recipes")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(.primary)
                    Text(
                        lang == .zh
                            ? "当前仅显示 \(recipeStore.recipes.count) 道公开菜 · 登录后离线缓存全部菜谱"
                            : "Showing \(recipeStore.recipes.count) public recipes · Sign in for full library"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                }

                Spacer()

                if authManager.isSigningIn {
                    ProgressView()
                } else {
                    Image(systemName: "chevron.right")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(14)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(Color.primary.opacity(0.06), lineWidth: 1)
            )
        }
        .buttonStyle(SpringPressButtonStyle())
        .padding(.horizontal, 16)
    }

    private func filterStrip(lang: AppLanguage) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(QuickFilter.allCases) { qf in
                        if qf != .privateOnly || recipeStore.privateCount > 0 {
                            let isSelected = recipeStore.activeQuickFilter == qf
                            Button {
                                withAnimation(.snappy(duration: 0.22)) {
                                    recipeStore.activeQuickFilter = qf
                                }
                                Haptics.selection()
                            } label: {
                                Label(qf.title(for: lang), systemImage: qf.icon)
                                    .font(.footnote.weight(.semibold))
                                    .padding(.horizontal, 13)
                                    .padding(.vertical, 8)
                                    .background(
                                        isSelected ? Color.primary : Color(uiColor: .secondarySystemGroupedBackground),
                                        in: Capsule()
                                    )
                                    .foregroundStyle(isSelected ? Color(uiColor: .systemBackground) : Color.primary)
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(Color.primary.opacity(isSelected ? 0 : 0.08), lineWidth: 1)
                                    )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 16)
            }

            if !recipeStore.topTags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 7) {
                        ForEach(recipeStore.topTags, id: \.self) { tag in
                            let isSelected = recipeStore.selectedTag == tag
                            Button {
                                withAnimation(.snappy(duration: 0.22)) {
                                    recipeStore.selectedTag = isSelected ? nil : tag
                                }
                                Haptics.selection()
                            } label: {
                                Text("#\(tag)")
                                    .font(.caption.weight(.medium))
                                    .padding(.horizontal, 11)
                                    .padding(.vertical, 6)
                                    .background(
                                        isSelected ? Color.accentColor : Color(uiColor: .secondarySystemGroupedBackground).opacity(0.85),
                                        in: Capsule()
                                    )
                                    .foregroundStyle(isSelected ? .white : .secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
        }
    }

    private func loadingPlaceholder(lang: AppLanguage) -> some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.large)
            Text(lang == .zh ? "正在同步食谱…" : "Syncing recipes…")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 64)
    }

    private func emptyState(lang: AppLanguage) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(.secondary)
            Text(lang == .zh ? "没有找到匹配的食谱" : "No matching recipes")
                .font(.headline)
            Text(lang == .zh ? "试试搜索其他食材，或清除筛选条件" : "Try another ingredient or clear active filters")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 56)
    }
}

private struct RecipeCardView: View {
    @Environment(RecipeStore.self) private var recipeStore
    let recipe: Recipe

    var body: some View {
        let lang = recipeStore.language
        let isFav = recipeStore.isFavorite(recipe.id)
        let videosCount = recipe.resolvedVideos.count

        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .topTrailing) {
                CachedCoverImage(urlString: recipe.cover_image)
                    .frame(height: 196)
                    .frame(maxWidth: .infinity)
                    .clipped()

                LinearGradient(
                    colors: [.black.opacity(0.45), .clear, .black.opacity(0.55)],
                    startPoint: .top,
                    endPoint: .bottom
                )

                // Top badges
                HStack {
                    if !recipe.is_public {
                        Label(lang == .zh ? "私房" : "Private", systemImage: "lock.fill")
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.ultraThinMaterial, in: Capsule())
                            .foregroundStyle(.white)
                    }

                    if videosCount > 0 {
                        Label(videosCount > 1 ? "×\(videosCount)" : (lang == .zh ? "视频" : "Video"), systemImage: "play.fill")
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.black.opacity(0.55), in: Capsule())
                            .foregroundStyle(.white)
                    }

                    Spacer()

                    Button {
                        recipeStore.toggleFavorite(recipe.id)
                    } label: {
                        Image(systemName: isFav ? "heart.fill" : "heart")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(isFav ? .red : .white)
                            .frame(width: 34, height: 34)
                            .background(.black.opacity(0.42), in: Circle())
                    }
                    .buttonStyle(.plain)
                }
                .padding(12)

                // Bottom-left time pill over cover
                if let total = recipe.totalTimeMins {
                    VStack {
                        Spacer()
                        HStack {
                            Label(
                                lang == .zh ? "\(total) 分钟" : "\(total) min",
                                systemImage: "clock.fill"
                            )
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 9)
                            .padding(.vertical, 4)
                            .background(.black.opacity(0.6), in: Capsule())
                            .foregroundStyle(.white)
                            Spacer()
                        }
                        .padding(12)
                    }
                }
            }
            .frame(height: 196)

            VStack(alignment: .leading, spacing: 6) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(recipe.primaryTitle(for: lang))
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    if let secondary = recipe.secondaryTitle(for: lang) {
                        Text(secondary)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                if let desc = recipe.localizedDescription(for: lang) {
                    Text(desc)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }

                if !recipe.tags.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(recipe.tags.prefix(4), id: \.self) { tag in
                            Text(tag)
                                .font(.caption2.weight(.medium))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.primary.opacity(0.06), in: Capsule())
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(
                            lang == .zh
                                ? "\(recipe.ingredients.count) 味食材"
                                : "\(recipe.ingredients.count) items"
                        )
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    }
                    .padding(.top, 4)
                }
            }
            .padding(15)
        }
        .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Color.primary.opacity(0.06), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.04), radius: 10, y: 4)
    }
}
