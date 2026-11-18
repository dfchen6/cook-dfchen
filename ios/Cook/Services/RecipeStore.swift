import Foundation
import Observation

enum QuickFilter: String, CaseIterable, Identifiable {
    case all
    case favorites
    case quick
    case privateOnly

    var id: String { rawValue }

    func title(for lang: AppLanguage) -> String {
        switch (self, lang) {
        case (.all, .zh): return "全部"
        case (.all, .en): return "All"
        case (.favorites, .zh): return "收藏"
        case (.favorites, .en): return "Favorites"
        case (.quick, .zh): return "快手 ≤25m"
        case (.quick, .en): return "Quick ≤25m"
        case (.privateOnly, .zh): return "私房专属"
        case (.privateOnly, .en): return "Private"
        }
    }

    var icon: String {
        switch self {
        case .all: return "square.grid.2x2"
        case .favorites: return "heart.fill"
        case .quick: return "bolt.fill"
        case .privateOnly: return "lock.open.fill"
        }
    }
}

@MainActor
@Observable
final class RecipeStore {
    private(set) var recipes: [Recipe] = []
    private(set) var isSyncing = false
    private(set) var lastSyncedAt: Date?
    private(set) var syncError: String?
    private(set) var isAuthenticatedSync = false
    private(set) var isPrefetchingCovers = false
    private(set) var prefetchedCoverCount = 0

    var language: AppLanguage {
        didSet {
            UserDefaults.standard.set(language.rawValue, forKey: Self.langKey)
        }
    }

    var searchQuery: String = ""
    var activeQuickFilter: QuickFilter = .all
    var selectedTag: String?

    private(set) var favoriteIds: Set<String>
    private var checkedIngredientsByRecipe: [String: Set<String>]

    private static let langKey = "cook.app.language"
    private static let favoritesKey = "cook.app.favorites"
    private static let checkedIngredientsKey = "cook.app.checkedIngredients"
    private static let lastSyncKey = "cook.app.lastSyncedAt"

    private let cacheFileURL: URL = {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("recipes-offline-v1.json")
    }()

    init() {
        if let rawLang = UserDefaults.standard.string(forKey: Self.langKey),
           let savedLang = AppLanguage(rawValue: rawLang) {
            self.language = savedLang
        } else {
            self.language = .zh
        }

        let favArray = UserDefaults.standard.stringArray(forKey: Self.favoritesKey) ?? []
        self.favoriteIds = Set(favArray)

        if let data = UserDefaults.standard.data(forKey: Self.checkedIngredientsKey),
           let decoded = try? JSONDecoder().decode([String: [String]].self, from: data) {
            self.checkedIngredientsByRecipe = decoded.mapValues { Set($0) }
        } else {
            self.checkedIngredientsByRecipe = [:]
        }

        if let ts = UserDefaults.standard.object(forKey: Self.lastSyncKey) as? Double {
            self.lastSyncedAt = Date(timeIntervalSince1970: ts)
        }

        loadCachedRecipesFromDisk()
    }

    // MARK: - Derived Collections

    var publicCount: Int {
        recipes.filter(\.is_public).count
    }

    var privateCount: Int {
        recipes.filter { !$0.is_public }.count
    }

    var topTags: [String] {
        var counts: [String: Int] = [:]
        for recipe in recipes {
            for tag in recipe.tags where !tag.isEmpty {
                counts[tag, default: 0] += 1
            }
        }
        return counts
            .sorted { lhs, rhs in
                if lhs.value != rhs.value { return lhs.value > rhs.value }
                return lhs.key < rhs.key
            }
            .prefix(18)
            .map(\.key)
    }

    var filteredRecipes: [Recipe] {
        let q = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        return recipes.filter { r in
            switch activeQuickFilter {
            case .all:
                break
            case .favorites:
                guard favoriteIds.contains(r.id) else { return false }
            case .quick:
                guard let total = r.totalTimeMins, total <= 25 else { return false }
            case .privateOnly:
                guard !r.is_public else { return false }
            }

            if let tag = selectedTag, !r.tags.contains(tag) {
                return false
            }

            guard !q.isEmpty else { return true }

            if r.title_zh.lowercased().contains(q) || r.title_en.lowercased().contains(q) {
                return true
            }
            if let dZh = r.description_zh?.lowercased(), dZh.contains(q) {
                return true
            }
            if let dEn = r.description_en?.lowercased(), dEn.contains(q) {
                return true
            }
            if r.tags.contains(where: { $0.lowercased().contains(q) }) {
                return true
            }
            if r.ingredients.contains(where: {
                $0.name_zh.lowercased().contains(q) || $0.name_en.lowercased().contains(q)
            }) {
                return true
            }
            return false
        }
    }

    func recipe(withId id: String) -> Recipe? {
        recipes.first(where: { $0.id == id })
    }

    // MARK: - Favorites & Prep Checkmarks

    func isFavorite(_ recipeId: String) -> Bool {
        favoriteIds.contains(recipeId)
    }

    func toggleFavorite(_ recipeId: String) {
        if favoriteIds.contains(recipeId) {
            favoriteIds.remove(recipeId)
            Haptics.light()
        } else {
            favoriteIds.insert(recipeId)
            Haptics.medium()
        }
        UserDefaults.standard.set(Array(favoriteIds), forKey: Self.favoritesKey)
    }

    func isIngredientChecked(_ ingredientId: String, in recipeId: String) -> Bool {
        checkedIngredientsByRecipe[recipeId]?.contains(ingredientId) ?? false
    }

    func checkedCount(for recipe: Recipe) -> Int {
        guard let set = checkedIngredientsByRecipe[recipe.id] else { return 0 }
        return recipe.ingredients.filter { set.contains($0.id) }.count
    }

    func toggleIngredient(_ ingredientId: String, in recipeId: String) {
        var set = checkedIngredientsByRecipe[recipeId] ?? []
        if set.contains(ingredientId) {
            set.remove(ingredientId)
            Haptics.selection()
        } else {
            set.insert(ingredientId)
            Haptics.light()
        }
        checkedIngredientsByRecipe[recipeId] = set
        persistCheckedIngredients()
    }

    func resetCheckedIngredients(for recipeId: String) {
        checkedIngredientsByRecipe[recipeId] = nil
        persistCheckedIngredients()
        Haptics.light()
    }

    private func persistCheckedIngredients() {
        let encodable = checkedIngredientsByRecipe.mapValues { Array($0) }
        if let data = try? JSONEncoder().encode(encodable) {
            UserDefaults.standard.set(data, forKey: Self.checkedIngredientsKey)
        }
    }

    // MARK: - Network Sync & Offline Disk Cache

    func sync(using auth: AuthManager) async {
        guard !isSyncing else { return }
        isSyncing = true
        syncError = nil
        defer { isSyncing = false }

        do {
            let token = await auth.validIDToken(forceRefresh: false)
            let response = try await fetchRemoteRecipes(bearerToken: token, auth: auth)
            self.recipes = response.recipes
            self.isAuthenticatedSync = response.authenticated
            let now = Date()
            self.lastSyncedAt = now
            UserDefaults.standard.set(now.timeIntervalSince1970, forKey: Self.lastSyncKey)
            saveCachedRecipesToDisk(response)

            if !auth.isSignedIn, activeQuickFilter == .privateOnly {
                activeQuickFilter = .all
            }
        } catch {
            self.syncError = language == .zh
                ? "离线模式：当前显示本地已缓存食谱"
                : "Offline mode: showing cached recipes"
        }
    }

    func prefetchAllCovers() async {
        guard !isPrefetchingCovers else { return }
        isPrefetchingCovers = true
        prefetchedCoverCount = 0
        defer { isPrefetchingCovers = false }

        let urls = recipes.compactMap(\.cover_image).filter { !$0.isEmpty }
        prefetchedCoverCount = await ImagePipeline.shared.prefetch(urls: urls)
        Haptics.success()
    }

    private func fetchRemoteRecipes(bearerToken: String?, auth: AuthManager) async throws -> MobileRecipesResponse {
        let url = AuthManager.baseURL.appendingPathComponent("api/mobile/recipes")
        var req = URLRequest(url: url)
        req.timeoutInterval = 20
        if let bearerToken, !bearerToken.isEmpty {
            req.setValue("Bearer \(bearerToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        // If ID token expired, refresh once silently and retry
        if http.statusCode == 401, bearerToken != nil {
            if let refreshed = await auth.validIDToken(forceRefresh: true) {
                var retryReq = URLRequest(url: url)
                retryReq.timeoutInterval = 20
                retryReq.setValue("Bearer \(refreshed)", forHTTPHeaderField: "Authorization")
                let (retryData, retryResp) = try await URLSession.shared.data(for: retryReq)
                guard let retryHttp = retryResp as? HTTPURLResponse,
                      (200..<300).contains(retryHttp.statusCode) else {
                    throw URLError(.userAuthenticationRequired)
                }
                return try JSONDecoder().decode(MobileRecipesResponse.self, from: retryData)
            } else {
                // Token revoked; fall back to public recipes
                let (pubData, _) = try await URLSession.shared.data(from: url)
                return try JSONDecoder().decode(MobileRecipesResponse.self, from: pubData)
            }
        }

        guard (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(MobileRecipesResponse.self, from: data)
    }

    private func loadCachedRecipesFromDisk() {
        guard let data = try? Data(contentsOf: cacheFileURL),
              let cached = try? JSONDecoder().decode(MobileRecipesResponse.self, from: data) else {
            return
        }
        self.recipes = cached.recipes
        self.isAuthenticatedSync = cached.authenticated
    }

    private func saveCachedRecipesToDisk(_ response: MobileRecipesResponse) {
        guard let data = try? JSONEncoder().encode(response) else { return }
        try? data.write(to: cacheFileURL, options: .atomic)
    }
}
