import SwiftUI

struct AccountSheetView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(AuthManager.self) private var authManager
    @Environment(RecipeStore.self) private var recipeStore

    var body: some View {
        @Bindable var store = recipeStore
        let lang = recipeStore.language

        NavigationStack {
            List {
                Section {
                    if authManager.isSignedIn {
                        HStack(spacing: 14) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 28))
                                .foregroundStyle(.green)

                            VStack(alignment: .leading, spacing: 3) {
                                Text(authManager.userEmail ?? (lang == .zh ? "已登录 Google 账号" : "Signed in with Google"))
                                    .font(.headline)
                                Text(
                                    lang == .zh
                                        ? "已同步 \(recipeStore.recipes.count) 道（\(recipeStore.publicCount) 公开 · \(recipeStore.privateCount) 私房）"
                                        : "Synced \(recipeStore.recipes.count) recipes (\(recipeStore.publicCount) public · \(recipeStore.privateCount) private)"
                                )
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    } else {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(lang == .zh ? "尚未登录" : "Not signed in")
                                .font(.headline)
                            Text(
                                lang == .zh
                                    ? "使用 Google 登录后可同步全部私密与共享食谱，并自动保存到手机离线使用。"
                                    : "Sign in with Google to unlock all your private & shared recipes for offline use."
                            )
                            .font(.footnote)
                            .foregroundStyle(.secondary)

                            Button {
                                Task {
                                    if await authManager.signInWithGoogle(language: lang) {
                                        await recipeStore.sync(using: authManager)
                                    }
                                }
                            } label: {
                                HStack {
                                    Spacer()
                                    if authManager.isSigningIn {
                                        ProgressView().tint(.white)
                                    } else {
                                        Image(systemName: "person.badge.key.fill")
                                        Text(lang == .zh ? "使用 Google 登录" : "Continue with Google")
                                            .fontWeight(.semibold)
                                    }
                                    Spacer()
                                }
                                .padding(.vertical, 10)
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding(.vertical, 6)
                    }

                    if let err = authManager.errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                } header: {
                    Text(lang == .zh ? "账号与云端同步" : "Account & Sync")
                }

                Section {
                    Picker(lang == .zh ? "界面语言" : "Language", selection: $store.language) {
                        ForEach(AppLanguage.allCases, id: \.self) { item in
                            Text(item.label).tag(item)
                        }
                    }
                    .pickerStyle(.segmented)

                    Button {
                        Task {
                            await recipeStore.sync(using: authManager)
                            Haptics.success()
                        }
                    } label: {
                        HStack {
                            Label(lang == .zh ? "立即同步最新食谱" : "Sync Recipes Now", systemImage: "arrow.triangle.2.circlepath")
                            Spacer()
                            if recipeStore.isSyncing {
                                ProgressView()
                            } else if let synced = recipeStore.lastSyncedAt {
                                Text(synced, style: .relative)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .disabled(recipeStore.isSyncing)

                    Button {
                        Task {
                            await recipeStore.prefetchAllCovers()
                        }
                    } label: {
                        HStack {
                            Label(
                                lang == .zh ? "离线缓存全部食谱封面图" : "Download All Cover Photos Offline",
                                systemImage: "arrow.down.circle"
                            )
                            Spacer()
                            if recipeStore.isPrefetchingCovers {
                                ProgressView()
                            } else if recipeStore.prefetchedCoverCount > 0 {
                                Text("\(recipeStore.prefetchedCoverCount) ✓")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.green)
                            }
                        }
                    }
                    .disabled(recipeStore.isPrefetchingCovers || recipeStore.recipes.isEmpty)
                } header: {
                    Text(lang == .zh ? "厨房离线准备" : "Offline Kitchen Prep")
                }

                if authManager.isSignedIn {
                    Section {
                        Button(role: .destructive) {
                            authManager.signOut()
                            Task {
                                await recipeStore.sync(using: authManager)
                            }
                        } label: {
                            Label(lang == .zh ? "退出登录" : "Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    }
                }
            }
            .navigationTitle(lang == .zh ? "设置与同步" : "Settings & Sync")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(lang == .zh ? "完成" : "Done") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}
