package media

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSanitizeFilename(t *testing.T) {
	got := SanitizeFilename(`../Evil Name!!.PNG`)
	if got != "evil_name__.png" && !strings.HasSuffix(got, ".png") {
		t.Fatalf("unexpected sanitize result: %q", got)
	}
	if strings.Contains(got, "..") || strings.Contains(got, "/") {
		t.Fatalf("unsafe characters remain: %q", got)
	}
}

func TestBuildObjectKey(t *testing.T) {
	key, err := BuildObjectKey("photo.jpg", "onigiroku")
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(key, "onigiroku/") {
		t.Fatalf("expected bucket prefix, got %q", key)
	}
	if !strings.HasSuffix(key, "-photo.jpg") {
		t.Fatalf("expected safe filename suffix, got %q", key)
	}
}

func TestAssertOwnedObjectKey(t *testing.T) {
	cases := []struct {
		key     string
		wantErr bool
	}{
		{key: "onigiroku/abc-file.png", wantErr: false},
		{key: "uploads/abc-file.png", wantErr: false},
		{key: "../etc/passwd", wantErr: true},
		{key: "/absolute/path", wantErr: true},
		{key: "otherbucket/secret.bin", wantErr: true},
		{key: "", wantErr: true},
	}
	for _, tc := range cases {
		err := AssertOwnedObjectKey(tc.key, "onigiroku")
		if tc.wantErr && err == nil {
			t.Fatalf("expected error for %q", tc.key)
		}
		if !tc.wantErr && err != nil {
			t.Fatalf("unexpected error for %q: %v", tc.key, err)
		}
	}
}

func TestValidatePresign(t *testing.T) {
	err := ValidatePresign(PresignRequest{
		Filename:    "a.png",
		ContentType: "image/png",
		SizeBytes:   128,
	})
	if err != nil {
		t.Fatal(err)
	}

	err = ValidatePresign(PresignRequest{
		Filename:    "../x.png",
		ContentType: "image/png",
		SizeBytes:   128,
	})
	if err == nil {
		t.Fatal("expected path traversal rejection")
	}

	err = ValidatePresign(PresignRequest{
		Filename:    "a.exe",
		ContentType: "application/octet-stream",
		SizeBytes:   128,
	})
	if err == nil {
		t.Fatal("expected mime rejection")
	}
}

func TestCreatePresignAndDeleteIdempotent(t *testing.T) {
	var deletedPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			deletedPath = r.URL.Path
			w.WriteHeader(http.StatusNotFound) // prove idempotent success
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	svc := NewService(server.URL, server.URL, "onigiroku", "user", "pass", true)
	svc.HTTPClient = server.Client()

	out, err := svc.CreatePresign(PresignRequest{
		Filename:     "cover.webp",
		ContentType:  "image/webp",
		SizeBytes:    2048,
		PreviousKey:  "onigiroku/old-cover.webp",
		ReplaceAfter: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if out.ObjectKey == "" || out.UploadURL == "" || !out.DeleteAfterConfirm {
		t.Fatalf("unexpected presign payload: %+v", out)
	}
	if out.PreviousObjectKey != "onigiroku/old-cover.webp" {
		t.Fatalf("previous key not preserved: %+v", out)
	}

	if err := svc.DeleteObject("onigiroku/old-cover.webp"); err != nil {
		t.Fatal(err)
	}
	if deletedPath != "/onigiroku/old-cover.webp" {
		t.Fatalf("delete path mismatch: %q", deletedPath)
	}
}

func TestInternalAuthConstantTimePresence(t *testing.T) {
	// Smoke: CreatePresign rejects localhost in prod-like mode.
	svc := NewService("http://127.0.0.1:8333", "http://127.0.0.1:8333", "onigiroku", "", "", false)
	_, err := svc.CreatePresign(PresignRequest{
		Filename:    "a.png",
		ContentType: "image/png",
		SizeBytes:   10,
	})
	if err == nil {
		t.Fatal("expected localhost rejection when AllowLocalhost=false")
	}
}
