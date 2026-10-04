package media

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strings"
	"time"
	"unicode"
)

const (
	MaxUploadBytes = 25 * 1024 * 1024
	PresignTTL     = 15 * time.Minute
)

var allowedMIME = map[string]struct{}{
	"image/jpeg":      {},
	"image/png":       {},
	"image/webp":      {},
	"image/gif":       {},
	"audio/mpeg":      {},
	"audio/wav":       {},
	"application/pdf": {},
}

var unsafeFilename = regexp.MustCompile(`[^a-zA-Z0-9._-]`)

type PresignRequest struct {
	Filename      string `json:"filename"`
	ContentType   string `json:"contentType"`
	SizeBytes     int64  `json:"sizeBytes"`
	Folder        string `json:"folder"`
	PreviousKey   string `json:"previousObjectKey"`
	ReplaceAfter  bool   `json:"replaceAfterUpload"`
}

type PresignResponse struct {
	UploadURL          string `json:"uploadUrl"`
	PublicURL          string `json:"publicUrl"`
	ObjectKey          string `json:"objectKey"`
	Method             string `json:"method"`
	ExpiresIn          int    `json:"expiresIn"`
	PreviousObjectKey  string `json:"previousObjectKey,omitempty"`
	DeleteAfterConfirm bool   `json:"deletePreviousAfterConfirm"`
}

type DeleteRequest struct {
	ObjectKey string `json:"objectKey"`
}

type Service struct {
	Endpoint        string
	PublicBase      string
	Bucket          string
	Username        string
	Password        string
	AllowLocalhost  bool
	HTTPClient      *http.Client
}

func NewService(endpoint, publicBase, bucket, username, password string, allowLocalhost bool) *Service {
	if publicBase == "" {
		publicBase = endpoint
	}
	if bucket == "" {
		bucket = "onigiroku"
	}
	return &Service{
		Endpoint:       strings.TrimRight(endpoint, "/"),
		PublicBase:     strings.TrimRight(publicBase, "/"),
		Bucket:         bucket,
		Username:       username,
		Password:       password,
		AllowLocalhost: allowLocalhost,
		HTTPClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func ValidatePresign(req PresignRequest) error {
	if strings.TrimSpace(req.Filename) == "" {
		return fmt.Errorf("filename is required")
	}
	if strings.Contains(req.Filename, "..") || strings.ContainsAny(req.Filename, `/\`) {
		return fmt.Errorf("invalid filename")
	}
	if _, ok := allowedMIME[req.ContentType]; !ok {
		return fmt.Errorf("unsupported content type: %s", req.ContentType)
	}
	if req.SizeBytes <= 0 || req.SizeBytes > MaxUploadBytes {
		return fmt.Errorf("file size must be between 1 byte and %d bytes", MaxUploadBytes)
	}
	return nil
}

func SanitizeFilename(filename string) string {
	base := path.Base(strings.TrimSpace(filename))
	base = strings.ToLower(base)
	base = unsafeFilename.ReplaceAllString(base, "_")
	if base == "" || base == "." || base == ".." {
		base = "file"
	}
	return base
}

func BuildObjectKey(filename, folder string) (string, error) {
	safe := SanitizeFilename(filename)
	id, err := randomID(16)
	if err != nil {
		return "", err
	}
	folder = strings.Trim(folder, "/")
	if folder == "" {
		folder = "uploads"
	}
	if strings.Contains(folder, "..") {
		return "", fmt.Errorf("invalid folder")
	}
	for _, r := range folder {
		if !(unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' || r == '-' || r == '/') {
			return "", fmt.Errorf("invalid folder")
		}
	}
	return fmt.Sprintf("%s/%s-%s", folder, id, safe), nil
}

// AssertOwnedObjectKey rejects path traversal and keys outside the expected bucket/prefix.
func AssertOwnedObjectKey(objectKey, bucket string) error {
	key := strings.TrimSpace(objectKey)
	if key == "" {
		return fmt.Errorf("objectKey is required")
	}
	if strings.Contains(key, "..") || strings.HasPrefix(key, "/") || strings.Contains(key, "\\") {
		return fmt.Errorf("invalid objectKey")
	}
	clean := path.Clean("/" + key)
	clean = strings.TrimPrefix(clean, "/")
	if clean != key {
		return fmt.Errorf("invalid objectKey")
	}
	prefix := strings.Trim(bucket, "/")
	if prefix != "" && !strings.HasPrefix(key, prefix+"/") && key != prefix {
		// Allow keys under bucket OR under common media folders for gradual migration.
		allowedRoots := []string{prefix + "/", "uploads/", "media/", "cms/", "avatars/"}
		ok := false
		for _, root := range allowedRoots {
			if strings.HasPrefix(key, root) {
				ok = true
				break
			}
		}
		if !ok {
			return fmt.Errorf("objectKey outside allowed storage namespace")
		}
	}
	return nil
}

func (s *Service) assertSafeEndpoint() error {
	u, err := url.Parse(s.Endpoint)
	if err != nil {
		return fmt.Errorf("invalid storage endpoint")
	}
	host := strings.ToLower(u.Hostname())
	if !s.AllowLocalhost && (host == "localhost" || host == "127.0.0.1" || host == "::1") {
		return fmt.Errorf("localhost storage endpoint is not allowed")
	}
	return nil
}

func (s *Service) CreatePresign(req PresignRequest) (*PresignResponse, error) {
	if err := ValidatePresign(req); err != nil {
		return nil, err
	}
	if err := s.assertSafeEndpoint(); err != nil {
		return nil, err
	}

	folder := req.Folder
	if folder == "" {
		folder = s.Bucket
	}
	objectKey, err := BuildObjectKey(req.Filename, folder)
	if err != nil {
		return nil, err
	}

	previous := strings.TrimSpace(req.PreviousKey)
	if previous != "" {
		if err := AssertOwnedObjectKey(previous, s.Bucket); err != nil {
			return nil, err
		}
	}

	return &PresignResponse{
		UploadURL:          s.Endpoint + "/" + objectKey,
		PublicURL:          s.PublicBase + "/" + objectKey,
		ObjectKey:          objectKey,
		Method:             http.MethodPut,
		ExpiresIn:          int(PresignTTL.Seconds()),
		PreviousObjectKey:  previous,
		DeleteAfterConfirm: previous != "" && req.ReplaceAfter,
	}, nil
}

// DeleteObject removes an object from SeaweedFS via the nginx gateway.
// Missing objects (404/410) are treated as success for idempotency.
func (s *Service) DeleteObject(objectKey string) error {
	if err := AssertOwnedObjectKey(objectKey, s.Bucket); err != nil {
		return err
	}
	if err := s.assertSafeEndpoint(); err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodDelete, s.Endpoint+"/"+objectKey, nil)
	if err != nil {
		return err
	}
	if s.Username != "" || s.Password != "" {
		req.SetBasicAuth(s.Username, s.Password)
	}

	res, err := s.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("storage delete failed: %w", err)
	}
	defer res.Body.Close()

	switch res.StatusCode {
	case http.StatusOK, http.StatusNoContent, http.StatusAccepted, http.StatusNotFound, http.StatusGone:
		return nil
	default:
		return fmt.Errorf("storage delete returned status %d", res.StatusCode)
	}
}

func randomID(nBytes int) (string, error) {
	buf := make([]byte, nBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
