package errors

import (
	"fmt"
	"net/http"
)

// Code identifies stable API error codes for clients and i18n (ID/EN).
type Code string

const (
	CodeInternal         Code = "INTERNAL_ERROR"
	CodeValidation       Code = "VALIDATION_ERROR"
	CodeNotFound         Code = "NOT_FOUND"
	CodeUnauthorized     Code = "UNAUTHORIZED"
	CodeForbidden        Code = "FORBIDDEN"
	CodeConflict         Code = "CONFLICT"
	CodeRateLimited      Code = "RATE_LIMITED"
	CodeBadRequest       Code = "BAD_REQUEST"
	CodeServiceUnavail   Code = "SERVICE_UNAVAILABLE"
	CodeCannotModifySelf Code = "CANNOT_MODIFY_SELF"
	CodeUserNotInTrash   Code = "USER_NOT_IN_TRASH"
	CodeUserNotFound     Code = "USER_NOT_FOUND"
	CodeLastAdmin        Code = "LAST_ADMIN"
)

// AppError is the domain/API error type returned to handlers and middleware.
type AppError struct {
	Code       Code
	Message    string
	MessageID  string // Indonesian
	MessageEN  string // English
	HTTPStatus int
	Err        error
	Details    map[string]any
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func (e *AppError) WithDetails(details map[string]any) *AppError {
	cp := *e
	cp.Details = details
	return &cp
}

func New(code Code, httpStatus int, messageEN, messageID string) *AppError {
	return &AppError{
		Code:       code,
		Message:    messageEN,
		MessageEN:  messageEN,
		MessageID:  messageID,
		HTTPStatus: httpStatus,
	}
}

func Internal(err error) *AppError {
	return &AppError{
		Code:       CodeInternal,
		Message:    "An unexpected error occurred",
		MessageEN:  "An unexpected error occurred",
		MessageID:  "Terjadi kesalahan yang tidak terduga",
		HTTPStatus: http.StatusInternalServerError,
		Err:        err,
	}
}

func Validation(messageEN, messageID string) *AppError {
	return New(CodeValidation, http.StatusUnprocessableEntity, messageEN, messageID)
}

func NotFound(resource string) *AppError {
	return New(
		CodeNotFound,
		http.StatusNotFound,
		fmt.Sprintf("%s not found", resource),
		fmt.Sprintf("%s tidak ditemukan", resource),
	)
}

func Unauthorized() *AppError {
	return New(CodeUnauthorized, http.StatusUnauthorized,
		"Authentication required",
		"Autentikasi diperlukan",
	)
}

func Forbidden() *AppError {
	return New(CodeForbidden, http.StatusForbidden,
		"Access denied",
		"Akses ditolak",
	)
}

func BadRequest(messageEN, messageID string) *AppError {
	return New(CodeBadRequest, http.StatusBadRequest, messageEN, messageID)
}

func RateLimited() *AppError {
	return New(CodeRateLimited, http.StatusTooManyRequests,
		"Too many requests",
		"Terlalu banyak permintaan",
	)
}

func ServiceUnavailable(messageEN, messageID string) *AppError {
	return New(CodeServiceUnavail, http.StatusServiceUnavailable, messageEN, messageID)
}

func CannotModifySelf() *AppError {
	return New(
		CodeCannotModifySelf,
		http.StatusForbidden,
		"You cannot change or delete your own account from Users Management.",
		"Anda tidak dapat mengubah atau menghapus akun sendiri dari Users Management.",
	)
}

func UserNotInTrash() *AppError {
	return New(
		CodeUserNotInTrash,
		http.StatusConflict,
		"User must be in trash before permanent delete.",
		"Pengguna harus berada di tempat sampah sebelum dihapus permanen.",
	)
}

func UserNotFound() *AppError {
	return New(
		CodeUserNotFound,
		http.StatusNotFound,
		"User not found",
		"Pengguna tidak ditemukan",
	)
}

func LastAdmin() *AppError {
	return New(
		CodeLastAdmin,
		http.StatusConflict,
		"Cannot remove or demote the last active admin.",
		"Tidak dapat menghapus atau menurunkan role admin aktif terakhir.",
	)
}

func Conflict(code Code, messageEN, messageID string) *AppError {
	if code == "" {
		code = CodeConflict
	}
	return New(code, http.StatusConflict, messageEN, messageID)
}

func FromError(err error) *AppError {
	if err == nil {
		return nil
	}
	var appErr *AppError
	if As(err, &appErr) {
		return appErr
	}
	return Internal(err)
}

// As mirrors errors.As for AppError without importing std errors in every caller.
func As(err error, target **AppError) bool {
	if err == nil {
		return false
	}
	for err != nil {
		if ae, ok := err.(*AppError); ok {
			*target = ae
			return true
		}
		type unwrapper interface{ Unwrap() error }
		if u, ok := err.(unwrapper); ok {
			err = u.Unwrap()
			continue
		}
		break
	}
	return false
}
