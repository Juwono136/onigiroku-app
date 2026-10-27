package content

import "testing"

func TestNormalizeAnswerText(t *testing.T) {
	cases := map[string]string{
		"Ohayou":   "ohayou",
		"  OHAYOU ": "ohayou",
		"カタカナ":     "かたかな",
		"かたかな":     "かたかな",
		"ＡＢＣ":      "abc",
		"おはよう  ":   "おはよう",
	}
	for in, want := range cases {
		got := normalizeAnswerText(in)
		if got != want {
			t.Fatalf("normalizeAnswerText(%q)=%q want %q", in, got, want)
		}
	}
}
