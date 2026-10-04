package adminusers

import "testing"

func TestExtractOwnedObjectKey(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"/api/media/avatars/abc.png", "avatars/abc.png"},
		{"http://localhost:3000/api/media/avatars/abc.png", "avatars/abc.png"},
		{"http://localhost:8333/avatars/abc.png", "avatars/abc.png"},
		{"avatars/abc.png", "avatars/abc.png"},
		{"https://lh3.googleusercontent.com/a/photo", ""},
		{"/api/media/../etc/passwd", ""},
	}
	for _, tc := range cases {
		got := ExtractOwnedObjectKey(tc.in)
		if got != tc.want {
			t.Fatalf("ExtractOwnedObjectKey(%q)=%q want %q", tc.in, got, tc.want)
		}
	}
}
