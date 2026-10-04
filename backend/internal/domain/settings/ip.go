package settings

import (
	"net"
	"strings"
)

type IPDisplay struct {
	Raw    *string `json:"raw"`
	Label  string  `json:"label"`
	Detail *string `json:"detail"`
	Kind   string  `json:"kind"` // local | private | public | unknown
}

func describeIPAddress(raw *string) IPDisplay {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return IPDisplay{Label: "Network unknown", Kind: "unknown"}
	}
	ipStr := strings.TrimSpace(*raw)
	detail := ipStr

	parsed := net.ParseIP(ipStr)
	if parsed == nil {
		return IPDisplay{Raw: &ipStr, Label: ipStr, Detail: &detail, Kind: "public"}
	}

	if parsed.IsLoopback() || parsed.IsUnspecified() {
		return IPDisplay{Raw: &ipStr, Label: "This computer (local)", Detail: &detail, Kind: "local"}
	}
	if parsed.IsPrivate() || parsed.IsLinkLocalUnicast() {
		return IPDisplay{Raw: &ipStr, Label: "Private / home network", Detail: &detail, Kind: "private"}
	}

	label := ipStr
	if parsed.To4() == nil {
		// Compact IPv6 for display
		label = parsed.String()
	}
	return IPDisplay{Raw: &ipStr, Label: label, Detail: &detail, Kind: "public"}
}
