package content

import (
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var (
	nonSlug = regexp.MustCompile(`[^a-z0-9]+`)
	dashes  = regexp.MustCompile(`-+`)
)

// NormalizeTagSlug lowercases and strips to [a-z0-9-] for dedupe (case-insensitive).
func NormalizeTagSlug(raw string) string {
	s := strings.TrimSpace(strings.ToLower(raw))
	if s == "" {
		return ""
	}
	s = norm.NFKD.String(s)
	var b strings.Builder
	for _, r := range s {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			continue
		}
		// Treat everything else (spaces, punctuation, underscores) as a separator.
		b.WriteRune('-')
	}
	s = nonSlug.ReplaceAllString(b.String(), "-")
	s = dashes.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

const maxListTagFilters = 12

// normalizeTagSlugList merges multi + legacy single tag filters, deduped and capped.
func normalizeTagSlugList(multi []string, legacy string) []string {
	seen := make(map[string]struct{}, len(multi)+1)
	out := make([]string, 0, len(multi)+1)
	add := func(raw string) {
		s := NormalizeTagSlug(raw)
		if s == "" {
			return
		}
		if _, ok := seen[s]; ok {
			return
		}
		if len(out) >= maxListTagFilters {
			return
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	for _, t := range multi {
		add(t)
	}
	add(legacy)
	return out
}

// SlugifyTitle builds a URL slug from a title (ASCII-ish; Japanese falls back to material- prefix).
func slugifyTitle(title string) string {
	s := NormalizeTagSlug(title)
	if s == "" || len(s) < 2 {
		return "material"
	}
	if len(s) > 80 {
		s = s[:80]
		s = strings.Trim(s, "-")
	}
	return s
}

func extractPlainText(body any) string {
	switch v := body.(type) {
	case nil:
		return ""
	case string:
		return strings.TrimSpace(v)
	case map[string]any:
		var parts []string
		walkTipTapText(v, &parts)
		return strings.TrimSpace(strings.Join(parts, " "))
	default:
		return ""
	}
}

// truncateExcerpt builds a short list/card summary from plain body text.
func truncateExcerpt(plain string, max int) string {
	plain = strings.Join(strings.Fields(plain), " ")
	if plain == "" || max <= 0 {
		return ""
	}
	runes := []rune(plain)
	if len(runes) <= max {
		return plain
	}
	sliced := string(runes[:max])
	lastSpace := strings.LastIndex(sliced, " ")
	if lastSpace > max/3 {
		sliced = sliced[:lastSpace]
	}
	return strings.TrimSpace(sliced) + "…"
}

func walkTipTapText(node map[string]any, parts *[]string) {
	if t, ok := node["text"].(string); ok {
		t = strings.TrimSpace(t)
		if t != "" {
			*parts = append(*parts, t)
		}
	}
	if content, ok := node["content"].([]any); ok {
		for _, child := range content {
			if m, ok := child.(map[string]any); ok {
				walkTipTapText(m, parts)
			}
		}
	}
}

// sanitizeBody keeps TipTap JSON structure but drops script-like attrs.
func sanitizeBody(body any) any {
	if body == nil {
		return map[string]any{"type": "doc", "content": []any{}}
	}
	switch v := body.(type) {
	case map[string]any:
		return sanitizeNode(v)
	default:
		return map[string]any{"type": "doc", "content": []any{}}
	}
}

func sanitizeNode(node map[string]any) map[string]any {
	out := map[string]any{}
	for k, val := range node {
		lk := strings.ToLower(k)
		if lk == "onclick" || lk == "onerror" || lk == "onload" || strings.HasPrefix(lk, "on") {
			continue
		}
		switch typed := val.(type) {
		case map[string]any:
			out[k] = sanitizeNode(typed)
		case []any:
			arr := make([]any, 0, len(typed))
			for _, item := range typed {
				if m, ok := item.(map[string]any); ok {
					arr = append(arr, sanitizeNode(m))
				} else {
					arr = append(arr, item)
				}
			}
			out[k] = arr
		case string:
			if lk == "href" || lk == "src" {
				lower := strings.ToLower(strings.TrimSpace(typed))
				if strings.HasPrefix(lower, "javascript:") || strings.HasPrefix(lower, "data:text/html") {
					continue
				}
			}
			out[k] = typed
		default:
			out[k] = val
		}
	}
	if _, ok := out["type"]; !ok {
		out["type"] = "doc"
	}
	return out
}
