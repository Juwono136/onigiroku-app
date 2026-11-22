package commerce

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"testing"
)

func TestSignRequestMatchesOfficialLayout(t *testing.T) {
	c := NewDokuClient("MCH-0001-10791114622547", "SK-test-secret", "https://api-sandbox.doku.com")
	digest := digestBody([]byte(`{"order":{"amount":10000}}`))
	sig := c.SignRequest(
		"cc682442-6c22-493e-8121-b9ef6b3fa728",
		"2020-08-11T08:45:42Z",
		"/checkout/v1/payment",
		digest,
	)
	if !stringsHasPrefix(sig, "HMACSHA256=") {
		t.Fatalf("signature missing algorithm prefix: %s", sig)
	}

	component := "Client-Id:MCH-0001-10791114622547\n" +
		"Request-Id:cc682442-6c22-493e-8121-b9ef6b3fa728\n" +
		"Request-Timestamp:2020-08-11T08:45:42Z\n" +
		"Request-Target:/checkout/v1/payment\n" +
		"Digest:" + digest
	mac := hmac.New(sha256.New, []byte("SK-test-secret"))
	_, _ = mac.Write([]byte(component))
	want := "HMACSHA256=" + base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if sig != want {
		t.Fatalf("signature mismatch\n got %s\nwant %s", sig, want)
	}
}

func TestVerifyNotification(t *testing.T) {
	c := NewDokuClient("BRN-test", "secret", "https://api-sandbox.doku.com")
	body := []byte(`{"order":{"invoice_number":"ONI-1"}}`)
	ts := "2020-08-11T08:45:42Z"
	id := "req-1"
	target := "/api/billing/webhooks/doku"
	sig := c.SignRequest(id, ts, target, digestBody(body))
	if !c.VerifyNotification(id, ts, sig, target, body) {
		t.Fatal("expected valid notification signature")
	}
	if c.VerifyNotification(id, ts, sig, "/wrong-path", body) {
		t.Fatal("wrong request target must fail")
	}
}

func stringsHasPrefix(s, p string) bool {
	return len(s) >= len(p) && s[:len(p)] == p
}
