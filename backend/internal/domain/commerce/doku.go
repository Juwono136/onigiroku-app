package commerce

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// DOKU Checkout (non-SNAP) HMACSHA256 signature.
// Official component string (newline-separated):
//
//	Client-Id:{clientId}
//	Request-Id:{requestId}
//	Request-Timestamp:{timestamp}
//	Request-Target:{path}
//	Digest:{base64(sha256(body))}   // POST only
//
// See:
// https://developers.doku.com/get-started-with-doku-api/signature-component/non-snap/signature-component-from-request-header
// https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration

const checkoutPath = "/checkout/v1/payment"

type DokuClient struct {
	ClientID  string
	SecretKey string
	BaseURL   string
	HTTP      *http.Client
}

type dokuCheckoutRequest struct {
	Order    dokuOrder     `json:"order"`
	Payment  dokuPayment   `json:"payment"`
	Customer *dokuCustomer `json:"customer,omitempty"`
}

type dokuOrder struct {
	Amount             int    `json:"amount"`
	InvoiceNumber      string `json:"invoice_number"`
	Currency           string `json:"currency,omitempty"`
	CallbackURL        string `json:"callback_url,omitempty"`
	CallbackURLCancel  string `json:"callback_url_cancel,omitempty"`
	CallbackURLResult  string `json:"callback_url_result,omitempty"`
	AutoRedirect       bool   `json:"auto_redirect"`
}

type dokuPayment struct {
	PaymentDueDate int `json:"payment_due_date"`
}

type dokuCustomer struct {
	ID    string `json:"id,omitempty"`
	Name  string `json:"name,omitempty"`
	Email string `json:"email,omitempty"`
}

type DokuCheckoutResult struct {
	PaymentURL  string
	SessionID   string
	RawResponse map[string]any
}

func NewDokuClient(clientID, secretKey, baseURL string) *DokuClient {
	base := strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if base == "" {
		base = "https://api-sandbox.doku.com"
	}
	return &DokuClient{
		ClientID:  strings.TrimSpace(clientID),
		SecretKey: strings.TrimSpace(secretKey),
		BaseURL:   base,
		HTTP:      &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *DokuClient) Enabled() bool {
	return c != nil && c.ClientID != "" && c.SecretKey != ""
}

func digestBody(body []byte) string {
	sum := sha256.Sum256(body)
	return base64.StdEncoding.EncodeToString(sum[:])
}

// SignRequest builds the official DOKU non-SNAP Signature header value.
func (c *DokuClient) SignRequest(requestID, timestamp, requestTarget, digest string) string {
	var b strings.Builder
	b.WriteString("Client-Id:")
	b.WriteString(c.ClientID)
	b.WriteByte('\n')
	b.WriteString("Request-Id:")
	b.WriteString(requestID)
	b.WriteByte('\n')
	b.WriteString("Request-Timestamp:")
	b.WriteString(timestamp)
	b.WriteByte('\n')
	b.WriteString("Request-Target:")
	b.WriteString(requestTarget)
	if digest != "" {
		b.WriteByte('\n')
		b.WriteString("Digest:")
		b.WriteString(digest)
	}
	mac := hmac.New(sha256.New, []byte(c.SecretKey))
	_, _ = mac.Write([]byte(b.String()))
	return "HMACSHA256=" + base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

// VerifyNotification validates an HTTP notification from DOKU.
// requestTarget must be the merchant notification path (e.g. /api/billing/webhooks/doku).
func (c *DokuClient) VerifyNotification(requestID, timestamp, signature, requestTarget string, body []byte) bool {
	if c == nil || signature == "" || requestTarget == "" {
		return false
	}
	digest := ""
	if len(body) > 0 {
		digest = digestBody(body)
	}
	expected := c.SignRequest(requestID, timestamp, requestTarget, digest)
	return hmac.Equal([]byte(expected), []byte(strings.TrimSpace(signature)))
}

func (c *DokuClient) CreateCheckout(
	amountIDR int,
	invoiceNumber,
	callbackURL,
	callbackCancelURL,
	callbackResultURL,
	customerName,
	customerEmail,
	customerID string,
) (*DokuCheckoutResult, error) {
	if !c.Enabled() {
		return nil, fmt.Errorf("doku credentials are not configured")
	}
	if amountIDR < 1 {
		return nil, fmt.Errorf("amount must be at least 1 IDR")
	}
	payload := dokuCheckoutRequest{
		Order: dokuOrder{
			Amount:            amountIDR,
			InvoiceNumber:     invoiceNumber,
			Currency:          "IDR",
			CallbackURL:       callbackURL,
			CallbackURLCancel: callbackCancelURL,
			CallbackURLResult: callbackResultURL,
			AutoRedirect:      true,
		},
		Payment: dokuPayment{PaymentDueDate: 60},
	}
	if customerEmail != "" || customerName != "" {
		payload.Customer = &dokuCustomer{
			ID:    customerID,
			Name:  customerName,
			Email: customerEmail,
		}
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	requestID := invoiceNumber
	timestamp := time.Now().UTC().Format("2006-01-02T15:04:05Z")
	digest := digestBody(body)
	signature := c.SignRequest(requestID, timestamp, checkoutPath, digest)

	req, err := http.NewRequest(http.MethodPost, c.BaseURL+checkoutPath, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Client-Id", c.ClientID)
	req.Header.Set("Request-Id", requestID)
	req.Header.Set("Request-Timestamp", timestamp)
	req.Header.Set("Signature", signature)

	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	var parsed map[string]any
	_ = json.Unmarshal(raw, &parsed)

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("doku checkout failed (%d): %s", res.StatusCode, strings.TrimSpace(string(raw)))
	}

	result := &DokuCheckoutResult{RawResponse: parsed}
	if resp, ok := parsed["response"].(map[string]any); ok {
		if payment, ok := resp["payment"].(map[string]any); ok {
			if url, ok := payment["url"].(string); ok {
				result.PaymentURL = url
			}
		}
		if order, ok := resp["order"].(map[string]any); ok {
			if sid, ok := order["session_id"].(string); ok {
				result.SessionID = sid
			}
		}
	}
	// Some DOKU responses nest payment.url at the top level.
	if result.PaymentURL == "" {
		if payment, ok := parsed["payment"].(map[string]any); ok {
			if url, ok := payment["url"].(string); ok {
				result.PaymentURL = url
			}
		}
	}
	if result.PaymentURL == "" {
		return nil, fmt.Errorf("doku checkout response missing payment.url")
	}
	return result, nil
}
