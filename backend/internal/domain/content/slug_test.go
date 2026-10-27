package content

import "testing"

func TestNormalizeTagSlug(t *testing.T) {
	cases := map[string]string{
		"JLPT N5":     "jlpt-n5",
		"  Culture  ": "culture",
		"日本語":         "",
		"A--B__C":     "a-b-c",
		"Hiragana/Katakana": "hiragana-katakana",
	}
	for in, want := range cases {
		got := NormalizeTagSlug(in)
		if got != want {
			t.Fatalf("NormalizeTagSlug(%q)=%q want %q", in, got, want)
		}
	}
}

func TestSlugifyTitle(t *testing.T) {
	if got := slugifyTitle("Hello World!"); got != "hello-world" {
		t.Fatalf("got %q", got)
	}
	if got := slugifyTitle("日本語の基礎"); got != "material" {
		t.Fatalf("japanese fallback got %q", got)
	}
}

func TestPreferredSlugSource(t *testing.T) {
	if got := preferredSlugSource("Basic conversation", "Percakapan dasar"); got != "Basic conversation" {
		t.Fatalf("prefer english got %q", got)
	}
	if got := preferredSlugSource("", "Percakapan dasar"); got != "Percakapan dasar" {
		t.Fatalf("fallback id got %q", got)
	}
}

func TestPreferredSlugTitleFromLocales(t *testing.T) {
	got := preferredSlugTitleFromLocales([]LocaleInput{
		{Locale: "id", Title: "Percakapan dasar"},
		{Locale: "en", Title: "Basic conversation"},
	})
	if got != "Basic conversation" {
		t.Fatalf("got %q", got)
	}
	got = preferredSlugTitleFromLocales([]LocaleInput{
		{Locale: "id", Title: "Salam"},
	})
	if got != "Salam" {
		t.Fatalf("id-only got %q", got)
	}
}

func TestNormalizeTagSlugList(t *testing.T) {
	got := normalizeTagSlugList([]string{"Culture", "hiragana", "culture", ""}, "JLPT N5")
	want := []string{"culture", "hiragana", "jlpt-n5"}
	if len(got) != len(want) {
		t.Fatalf("len got %v want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("got %v want %v", got, want)
		}
	}
}

func TestExtractPlainText(t *testing.T) {
	body := map[string]any{
		"type": "doc",
		"content": []any{
			map[string]any{
				"type": "paragraph",
				"content": []any{
					map[string]any{"type": "text", "text": "こんにちは"},
					map[string]any{"type": "text", "text": " world"},
				},
			},
		},
	}
	got := extractPlainText(body)
	if got != "こんにちは world" {
		t.Fatalf("got %q", got)
	}
}
