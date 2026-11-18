import Foundation

enum AppLanguage: String, Codable, CaseIterable {
    case zh
    case en

    var label: String {
        switch self {
        case .zh: return "中文"
        case .en: return "EN"
        }
    }
}

struct RecipeStep: Codable, Hashable, Identifiable {
    let label: String?
    let body: String

    var id: String { "\(label ?? "")|\(body)" }
}

struct VideoLink: Codable, Hashable, Identifiable {
    let platform: String // "youtube" | "xiaohongshu" | "other"
    let url: String
    let embedId: String?

    var id: String { url }

    var isYouTube: Bool { platform == "youtube" }
    var isXiaohongshu: Bool { platform == "xiaohongshu" }
}

struct Ingredient: Codable, Hashable, Identifiable {
    let id: String
    let name_zh: String
    let name_en: String
    let quantity: String
    let unit: String
    let sort_order: Int

    func primaryName(for lang: AppLanguage) -> String {
        switch lang {
        case .zh: return name_zh.isEmpty ? name_en : name_zh
        case .en: return name_en.isEmpty ? name_zh : name_en
        }
    }

    func secondaryName(for lang: AppLanguage) -> String? {
        switch lang {
        case .zh:
            return (!name_en.isEmpty && name_en != name_zh) ? name_en : nil
        case .en:
            return (!name_zh.isEmpty && name_zh != name_en) ? name_zh : nil
        }
    }

    func scaledQuantity(multiplier: Double) -> String {
        guard abs(multiplier - 1.0) > 0.001 else {
            return formattedAmount(quantity: quantity)
        }
        let trimmed = quantity.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return unit }

        // Handle simple fraction e.g. "1/2"
        if trimmed.contains("/"),
           case let parts = trimmed.split(separator: "/"),
           parts.count == 2,
           let num = Double(parts[0]),
           let den = Double(parts[1]),
           den != 0 {
            let scaled = (num / den) * multiplier
            return formattedAmount(quantity: Self.cleanNumber(scaled))
        }

        // Handle numeric range e.g. "2-3"
        if trimmed.contains("-"),
           case let parts = trimmed.split(separator: "-"),
           parts.count == 2,
           let low = Double(parts[0].trimmingCharacters(in: .whitespaces)),
           let high = Double(parts[1].trimmingCharacters(in: .whitespaces)) {
            let sLow = Self.cleanNumber(low * multiplier)
            let sHigh = Self.cleanNumber(high * multiplier)
            return formattedAmount(quantity: "\(sLow)-\(sHigh)")
        }

        if let val = Double(trimmed) {
            return formattedAmount(quantity: Self.cleanNumber(val * multiplier))
        }

        return formattedAmount(quantity: trimmed)
    }

    private func formattedAmount(quantity q: String) -> String {
        let cleanQ = q.trimmingCharacters(in: .whitespaces)
        let cleanU = unit.trimmingCharacters(in: .whitespaces)
        if cleanQ.isEmpty { return cleanU }
        if cleanU.isEmpty { return cleanQ }
        return "\(cleanQ) \(cleanU)"
    }

    private static func cleanNumber(_ value: Double) -> String {
        let rounded = (value * 100).rounded() / 100
        if abs(rounded.rounded() - rounded) < 0.01 {
            return String(Int(rounded.rounded()))
        }
        if abs((rounded * 10).rounded() - rounded * 10) < 0.01 {
            return String(format: "%.1f", rounded)
        }
        return String(format: "%.2f", rounded)
    }
}

struct Recipe: Codable, Hashable, Identifiable {
    let id: String
    let slug: String
    let title_zh: String
    let title_en: String
    let description_zh: String?
    let description_en: String?
    let instructions: String
    let instructions_zh: String?
    let instructions_en: String?
    let steps_zh: [RecipeStep]?
    let steps_en: [RecipeStep]?
    let locale_primary: String
    let cover_image: String?
    let youtube_url: String?
    let video_urls: [String]
    let videos: [VideoLink]?
    let prep_time_mins: Int?
    let cook_time_mins: Int?
    let servings: Int?
    let tags: [String]
    let is_public: Bool
    let created_at: String
    let updated_at: String
    let ingredients: [Ingredient]

    var totalTimeMins: Int? {
        switch (prep_time_mins, cook_time_mins) {
        case let (p?, c?): return p + c
        case let (p?, nil): return p
        case let (nil, c?): return c
        case (nil, nil): return nil
        }
    }

    func primaryTitle(for lang: AppLanguage) -> String {
        switch lang {
        case .zh: return title_zh.isEmpty ? title_en : title_zh
        case .en: return title_en.isEmpty ? title_zh : title_en
        }
    }

    func secondaryTitle(for lang: AppLanguage) -> String? {
        switch lang {
        case .zh: return (!title_en.isEmpty && title_en != title_zh) ? title_en : nil
        case .en: return (!title_zh.isEmpty && title_zh != title_en) ? title_zh : nil
        }
    }

    func localizedDescription(for lang: AppLanguage) -> String? {
        let raw: String?
        switch lang {
        case .zh: raw = description_zh ?? description_en
        case .en: raw = description_en ?? description_zh
        }
        guard let trimmed = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
            return nil
        }
        return trimmed
    }

    func steps(for lang: AppLanguage) -> [RecipeStep] {
        switch lang {
        case .zh:
            if let s = steps_zh, !s.isEmpty { return s }
            return StepParser.parse(instructions_zh ?? instructions)
        case .en:
            if let s = steps_en, !s.isEmpty { return s }
            return StepParser.parse(instructions_en ?? instructions)
        }
    }

    var resolvedVideos: [VideoLink] {
        if let videos, !videos.isEmpty {
            return videos
        }
        return video_urls.map { url in
            let lower = url.lowercased()
            if lower.contains("youtube.com") || lower.contains("youtu.be") {
                return VideoLink(platform: "youtube", url: url, embedId: nil)
            } else if lower.contains("xhslink.com") || lower.contains("xiaohongshu.com") || lower.contains("rednote.com") {
                return VideoLink(platform: "xiaohongshu", url: url, embedId: nil)
            }
            return VideoLink(platform: "other", url: url, embedId: nil)
        }
    }
}

struct MobileUserPayload: Codable, Hashable {
    let id: String
    let email: String?
}

struct MobileRecipesResponse: Codable {
    let authenticated: Bool
    let user: MobileUserPayload?
    let count: Int
    let synced_at: String
    let recipes: [Recipe]
}

// MARK: - Step Parser & Smart Timer Detector

enum StepParser {
    static func parse(_ raw: String?) -> [RecipeStep] {
        let trimmed = (raw ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return [] }

        let lines = trimmed
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        if lines.count > 1 {
            return lines.map { splitLabel(stripLeadingNumber($0)) }
        }
        return [splitLabel(stripLeadingNumber(trimmed))]
    }

    private static func stripLeadingNumber(_ line: String) -> String {
        line.replacingOccurrences(
            of: #"^\s*\d+\s*[.、)）]\s*"#,
            with: "",
            options: .regularExpression
        )
    }

    private static func splitLabel(_ text: String) -> RecipeStep {
        if let range = text.range(of: #"^[^：:]{1,14}[：:]"#, options: .regularExpression) {
            let prefix = String(text[range]).dropLast()
            let rest = String(text[range.upperBound...]).trimmingCharacters(in: .whitespaces)
            if !rest.isEmpty {
                return RecipeStep(label: String(prefix), body: rest)
            }
        }
        return RecipeStep(label: nil, body: text)
    }
}

struct SuggestedTimer: Hashable, Identifiable {
    let seconds: Int
    let displayZh: String
    let displayEn: String

    var id: Int { seconds }

    func display(for lang: AppLanguage) -> String {
        lang == .zh ? displayZh : displayEn
    }
}

enum StepTimerDetector {
    private static let chineseNumerals: [String: Double] = [
        "半": 0.5, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
        "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "十二": 12, "十五": 15,
        "二十": 20, "二十五": 25, "三十": 30, "四十": 40, "四十五": 45, "五十": 50
    ]

    static func detect(in text: String) -> [SuggestedTimer] {
        var foundSeconds: [Int] = []

        // Special phrases
        if text.contains("半小时") || text.contains("半个小时") || text.localizedCaseInsensitiveContains("half an hour") {
            foundSeconds.append(30 * 60)
        }
        if text.contains("一刻钟") {
            foundSeconds.append(15 * 60)
        }

        // Numeric ranges or single numbers with units: e.g. "20 分钟", "3-5分钟", "1.5小时", "30秒", "20 minutes", "45 mins"
        let pattern = #"(\d+(?:\.\d+)?)(?:\s*[-~～至到]\s*(\d+(?:\.\d+)?))?\s*(小时|个小时|分钟|分(?![钟成层])|秒钟|秒|hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?)"#
        if let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) {
            let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
            for match in regex.matches(in: text, range: nsRange) {
                guard let firstRange = Range(match.range(at: 1), in: text),
                      let unitRange = Range(match.range(at: 3), in: text),
                      let firstVal = Double(text[firstRange]) else { continue }

                var chosen = firstVal
                if match.range(at: 2).location != NSNotFound,
                   let secondRange = Range(match.range(at: 2), in: text),
                   let secondVal = Double(text[secondRange]) {
                    // For cooking safety (avoiding burning), pick the lower/midpoint sensibly; use upper if simmering or midpoint
                    chosen = secondVal
                }

                let unit = text[unitRange].lowercased()
                let secs = toSeconds(value: chosen, unit: unit)
                if secs >= 10 && secs <= 6 * 3600 {
                    foundSeconds.append(secs)
                }
            }
        }

        // Chinese numeral durations e.g. "两分钟", "十五分钟", "一小时", "三十秒"
        let zhPattern = #"(二十五|四十五|十二|十五|二十|三十|四十|五十|[半一二两三四五六七八九十])\s*(?:个)?(小时|分钟|秒钟|秒)"#
        if let zhRegex = try? NSRegularExpression(pattern: zhPattern) {
            let nsRange = NSRange(text.startIndex..<text.endIndex, in: text)
            for match in zhRegex.matches(in: text, range: nsRange) {
                guard let numRange = Range(match.range(at: 1), in: text),
                      let unitRange = Range(match.range(at: 2), in: text),
                      let val = chineseNumerals[String(text[numRange])] else { continue }
                let secs = toSeconds(value: val, unit: String(text[unitRange]))
                if secs >= 10 && secs <= 6 * 3600 {
                    foundSeconds.append(secs)
                }
            }
        }

        // Deduplicate preserving order
        var seen = Set<Int>()
        var result: [SuggestedTimer] = []
        for s in foundSeconds where !seen.contains(s) {
            seen.insert(s)
            result.append(makeTimer(seconds: s))
        }
        return result
    }

    private static func toSeconds(value: Double, unit: String) -> Int {
        if unit.contains("小时") || unit.hasPrefix("h") {
            return Int((value * 3600).rounded())
        } else if unit.contains("秒") || unit.hasPrefix("s") {
            return Int(value.rounded())
        } else {
            return Int((value * 60).rounded())
        }
    }

    static func makeTimer(seconds: Int) -> SuggestedTimer {
        if seconds >= 3600 {
            let hrs = seconds / 3600
            let mins = (seconds % 3600) / 60
            let zh = mins > 0 ? "\(hrs) 小时 \(mins) 分" : "\(hrs) 小时"
            let en = mins > 0 ? "\(hrs)h \(mins)m" : "\(hrs) hr"
            return SuggestedTimer(seconds: seconds, displayZh: zh, displayEn: en)
        } else if seconds >= 60 {
            let mins = seconds / 60
            let secs = seconds % 60
            let zh = secs > 0 ? "\(mins) 分 \(secs) 秒" : "\(mins) 分钟"
            let en = secs > 0 ? "\(mins)m \(secs)s" : "\(mins) min"
            return SuggestedTimer(seconds: seconds, displayZh: zh, displayEn: en)
        } else {
            return SuggestedTimer(seconds: seconds, displayZh: "\(seconds) 秒", displayEn: "\(seconds) sec")
        }
    }
}
