package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Meta struct {
	RequestID string `json:"requestId"`
}

type Envelope struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   *Error `json:"error,omitempty"`
	Meta    Meta   `json:"meta"`
}

type Error struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	MessageID string         `json:"messageId,omitempty"`
	MessageEN string         `json:"messageEn,omitempty"`
	Details   map[string]any `json:"details,omitempty"`
}

func requestID(c *gin.Context) string {
	if id, ok := c.Get("request_id"); ok {
		if s, ok := id.(string); ok {
			return s
		}
	}
	return ""
}

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, Envelope{
		Success: true,
		Data:    data,
		Meta:    Meta{RequestID: requestID(c)},
	})
}

func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, Envelope{
		Success: true,
		Data:    data,
		Meta:    Meta{RequestID: requestID(c)},
	})
}

func Fail(c *gin.Context, err error) {
	appErr := apperrors.FromError(err)
	c.JSON(appErr.HTTPStatus, Envelope{
		Success: false,
		Error: &Error{
			Code:      string(appErr.Code),
			Message:   appErr.MessageEN,
			MessageID: appErr.MessageID,
			MessageEN: appErr.MessageEN,
			Details:   appErr.Details,
		},
		Meta: Meta{RequestID: requestID(c)},
	})
}

func AbortWithError(c *gin.Context, err error) {
	Fail(c, err)
	c.Abort()
}
