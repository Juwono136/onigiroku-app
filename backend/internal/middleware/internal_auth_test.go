package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/onigiroku/onigiroku-app/backend/internal/middleware"
)

func TestRequireInternalSecret(t *testing.T) {
	gin.SetMode(gin.TestMode)

	engine := gin.New()
	engine.Use(middleware.RequireInternalSecret("super-secret-value", true))
	engine.POST("/api/v1/media/presign", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	engine.GET("/api/v1/catalog", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// GET remains open
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/catalog", nil)
	getRec := httptest.NewRecorder()
	engine.ServeHTTP(getRec, getReq)
	if getRec.Code != http.StatusOK {
		t.Fatalf("GET should pass without secret, got %d", getRec.Code)
	}

	// POST without secret rejected
	postReq := httptest.NewRequest(http.MethodPost, "/api/v1/media/presign", nil)
	postRec := httptest.NewRecorder()
	engine.ServeHTTP(postRec, postReq)
	if postRec.Code != http.StatusUnauthorized {
		t.Fatalf("POST without secret should be 401, got %d", postRec.Code)
	}

	// POST with secret accepted
	okReq := httptest.NewRequest(http.MethodPost, "/api/v1/media/presign", nil)
	okReq.Header.Set("X-Internal-Secret", "super-secret-value")
	okRec := httptest.NewRecorder()
	engine.ServeHTTP(okRec, okReq)
	if okRec.Code != http.StatusOK {
		t.Fatalf("POST with secret should be 200, got %d", okRec.Code)
	}
}
