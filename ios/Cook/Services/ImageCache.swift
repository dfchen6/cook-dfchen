import CryptoKit
import Foundation
import SwiftUI
import UIKit

actor ImagePipeline {
    static let shared = ImagePipeline()

    private let memoryCache: NSCache<NSString, UIImage> = {
        let cache = NSCache<NSString, UIImage>()
        cache.countLimit = 180
        cache.totalCostLimit = 90 * 1024 * 1024
        return cache
    }()

    private var inFlight: [String: Task<UIImage?, Never>] = [:]
    private let diskDirectory: URL

    init() {
        let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let dir = base.appendingPathComponent("RecipeCoverCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        self.diskDirectory = dir
    }

    func cachedMemoryImage(for urlString: String) -> UIImage? {
        memoryCache.object(forKey: urlString as NSString)
    }

    func image(for urlString: String) async -> UIImage? {
        if let mem = memoryCache.object(forKey: urlString as NSString) {
            return mem
        }

        let fileURL = diskFileURL(for: urlString)
        if let diskData = try? Data(contentsOf: fileURL),
           let diskImage = UIImage(data: diskData) {
            memoryCache.setObject(diskImage, forKey: urlString as NSString, cost: diskData.count)
            return diskImage
        }

        if let existingTask = inFlight[urlString] {
            return await existingTask.value
        }

        guard let url = URL(string: urlString) else { return nil }

        let task = Task<UIImage?, Never> {
            do {
                var req = URLRequest(url: url)
                req.timeoutInterval = 20
                let (data, resp) = try await URLSession.shared.data(for: req)
                guard let http = resp as? HTTPURLResponse,
                      (200..<300).contains(http.statusCode),
                      let downloaded = UIImage(data: data) else {
                    return nil
                }
                try? data.write(to: fileURL, options: .atomic)
                return downloaded
            } catch {
                return nil
            }
        }

        inFlight[urlString] = task
        let result = await task.value
        inFlight[urlString] = nil
        if let result {
            memoryCache.setObject(result, forKey: urlString as NSString)
        }
        return result
    }

    func prefetch(urls: [String]) async -> Int {
        var loaded = 0
        for url in urls {
            if await image(for: url) != nil {
                loaded += 1
            }
        }
        return loaded
    }

    private func diskFileURL(for urlString: String) -> URL {
        let digest = SHA256.hash(data: Data(urlString.utf8))
        let name = digest.map { String(format: "%02x", $0) }.joined()
        return diskDirectory.appendingPathComponent(name)
    }
}

struct CachedCoverImage: View {
    let urlString: String?
    var contentMode: ContentMode = .fill

    @State private var uiImage: UIImage?
    @State private var didAttemptLoad = false

    var body: some View {
        Color.clear
            .overlay {
                if let uiImage {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: contentMode)
                        .transition(.opacity.animation(.easeOut(duration: 0.2)))
                } else {
                    placeholder
                }
            }
            .clipped()
            .task(id: urlString) {
            guard let urlString, !urlString.isEmpty else {
                uiImage = nil
                didAttemptLoad = true
                return
            }
            if let mem = await ImagePipeline.shared.cachedMemoryImage(for: urlString) {
                uiImage = mem
                didAttemptLoad = true
                return
            }
            let loaded = await ImagePipeline.shared.image(for: urlString)
            withAnimation(.easeOut(duration: 0.2)) {
                uiImage = loaded
                didAttemptLoad = true
            }
        }
    }

    private var placeholder: some View {
        LinearGradient(
            colors: [
                Color(red: 0.20, green: 0.16, blue: 0.14),
                Color(red: 0.13, green: 0.11, blue: 0.10)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay {
            Image(systemName: didAttemptLoad ? "frying.pan.fill" : "sparkles")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(.white.opacity(0.28))
        }
    }
}
