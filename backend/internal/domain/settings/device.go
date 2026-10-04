package settings

import (
	"regexp"
	"strings"
)

type DeviceSummary struct {
	Label      string `json:"label"`
	Browser    string `json:"browser"`
	OS         string `json:"os"`
	DeviceType string `json:"deviceType"` // desktop | mobile | tablet | unknown
}

var (
	reTablet  = regexp.MustCompile(`(?i)ipad|tablet`)
	reMobile  = regexp.MustCompile(`(?i)mobi|iphone|android`)
	reEdge    = regexp.MustCompile(`(?i)edg/`)
	reChrome  = regexp.MustCompile(`(?i)chrome/`)
	reFirefox = regexp.MustCompile(`(?i)firefox/`)
	reSafari  = regexp.MustCompile(`(?i)safari/`)
	reOpera   = regexp.MustCompile(`(?i)opr/|opera`)
	reWin     = regexp.MustCompile(`(?i)windows nt`)
	reAndroid = regexp.MustCompile(`(?i)android`)
	reIOS     = regexp.MustCompile(`(?i)iphone|ipad|ipod`)
	reMac     = regexp.MustCompile(`(?i)mac os x`)
	reLinux   = regexp.MustCompile(`(?i)linux`)
)

func summarizeUserAgent(ua string) DeviceSummary {
	ua = strings.TrimSpace(ua)
	if ua == "" {
		return DeviceSummary{
			Label: "Unknown device", Browser: "Unknown", OS: "Unknown", DeviceType: "unknown",
		}
	}

	// Tablet first so Android tablets are not classified as mobile (RE2 has no lookahead).
	deviceType := "desktop"
	if reTablet.MatchString(ua) {
		deviceType = "tablet"
	} else if reMobile.MatchString(ua) {
		deviceType = "mobile"
	}

	browser := "Browser"
	switch {
	case reEdge.MatchString(ua):
		browser = "Microsoft Edge"
	case reChrome.MatchString(ua) && !reEdge.MatchString(ua):
		browser = "Chrome"
	case reFirefox.MatchString(ua):
		browser = "Firefox"
	case reSafari.MatchString(ua) && !reChrome.MatchString(ua):
		browser = "Safari"
	case reOpera.MatchString(ua):
		browser = "Opera"
	}

	os := "Unknown OS"
	switch {
	case reWin.MatchString(ua):
		os = "Windows"
	case reAndroid.MatchString(ua):
		os = "Android"
	case reIOS.MatchString(ua):
		os = "iOS"
	case reMac.MatchString(ua):
		os = "macOS"
	case reLinux.MatchString(ua):
		os = "Linux"
	}

	deviceWord := "Desktop"
	switch deviceType {
	case "mobile":
		deviceWord = "Mobile"
	case "tablet":
		deviceWord = "Tablet"
	}

	return DeviceSummary{
		Label:      browser + " on " + os + " (" + deviceWord + ")",
		Browser:    browser,
		OS:         os,
		DeviceType: deviceType,
	}
}
