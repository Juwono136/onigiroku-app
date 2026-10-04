package adminusers

import (
	"net/url"
	"strings"
)

const mediaProxyPrefix = "/api/media"

// ExtractOwnedObjectKey derives a SeaweedFS object key from a stored image URL.
// Returns empty string when the value is external (e.g. Google avatar) or invalid.
func ExtractOwnedObjectKey(imageURL string) string {
	value := strings.TrimSpace(imageURL)
	if value == "" {
		return ""
	}

	if strings.HasPrefix(value, mediaProxyPrefix+"/") {
		key := strings.SplitN(value[len(mediaProxyPrefix)+1:], "?", 2)[0]
		if key == "" || strings.Contains(key, "..") {
			return ""
		}
		return key
	}

	if strings.HasPrefix(value, "http://") || strings.HasPrefix(value, "https://") {
		parsed, err := url.Parse(value)
		if err != nil {
			return ""
		}
		path := parsed.Path
		if strings.HasPrefix(path, mediaProxyPrefix+"/") {
			key := strings.SplitN(path[len(mediaProxyPrefix)+1:], "?", 2)[0]
			if key == "" || strings.Contains(key, "..") {
				return ""
			}
			return key
		}
		// Direct gateway URL: /avatars/... or /onigiroku/avatars/...
		trimmed := strings.TrimPrefix(path, "/")
		if strings.HasPrefix(trimmed, "avatars/") ||
			strings.Contains(trimmed, "/avatars/") {
			if strings.Contains(trimmed, "..") {
				return ""
			}
			return trimmed
		}
	}

	if strings.HasPrefix(value, "avatars/") && !strings.Contains(value, "..") {
		return value
	}
	return ""
}
