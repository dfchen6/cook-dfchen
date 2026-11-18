import SwiftUI

@main
struct CookApp: App {
    @State private var authManager = AuthManager()
    @State private var recipeStore = RecipeStore()
    @State private var cookingSession = CookingSessionManager()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authManager)
                .environment(recipeStore)
                .environment(cookingSession)
                .task {
                    Haptics.prepare()
                    await recipeStore.sync(using: authManager)
                    handleLaunchArguments()
                }
        }
    }

    private func handleLaunchArguments() {
        let args = ProcessInfo.processInfo.arguments
        if let cookIdx = args.firstIndex(of: "--cook"), cookIdx + 1 < args.count {
            let slug = args[cookIdx + 1]
            let step: Int = {
                if let sIdx = args.firstIndex(of: "--step"), sIdx + 1 < args.count {
                    return Int(args[sIdx + 1]) ?? 0
                }
                return 0
            }()
            if let target = recipeStore.recipes.first(where: { $0.slug == slug }) {
                cookingSession.startCooking(recipe: target, startingAt: step)
            }
        }
    }
}
