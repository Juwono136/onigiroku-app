package commerce

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"
	"golang.org/x/text/unicode/norm"

	"github.com/onigiroku/onigiroku-app/backend/internal/domain/media"
	apperrors "github.com/onigiroku/onigiroku-app/backend/pkg/errors"
)

type Service struct {
	Pool   *pgxpool.Pool
	Media  *media.Service
	Doku   *DokuClient
	AppURL string
	Log    *zap.Logger
}

func NewService(pool *pgxpool.Pool, mediaSvc *media.Service, doku *DokuClient, appURL string, log *zap.Logger) *Service {
	if log == nil {
		log = zap.NewNop()
	}
	return &Service{Pool: pool, Media: mediaSvc, Doku: doku, AppURL: strings.TrimRight(appURL, "/"), Log: log}
}

func (s *Service) coverURL(key *string) *string {
	if key == nil || strings.TrimSpace(*key) == "" {
		return nil
	}
	u := "/api/media/" + strings.TrimPrefix(*key, "/")
	return &u
}

func formatTime(t time.Time) string { return t.UTC().Format(time.RFC3339Nano) }

func formatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	v := formatTime(*t)
	return &v
}

func normalizePage(p int) int {
	if p < 1 {
		return 1
	}
	return p
}
func normalizePageSize(n int) int {
	if n < 1 {
		return 12
	}
	if n > 48 {
		return 48
	}
	return n
}

func slugify(raw string) string {
	s := strings.ToLower(norm.NFKD.String(strings.TrimSpace(raw)))
	var b strings.Builder
	prevDash := false
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			prevDash = false
			continue
		}
		if !prevDash {
			b.WriteByte('-')
			prevDash = true
		}
	}
	out := strings.Trim(b.String(), "-")
	if out == "" {
		out = "package"
	}
	if len(out) > 80 {
		out = out[:80]
	}
	return out
}

func parseTimePtr(raw *string) (*time.Time, error) {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, strings.TrimSpace(*raw))
	if err != nil {
		t, err = time.Parse(time.RFC3339Nano, strings.TrimSpace(*raw))
	}
	if err != nil {
		return nil, err
	}
	u := t.UTC()
	return &u, nil
}

func normalizeDiscountPercent(raw float64) float64 {
	if math.IsNaN(raw) || math.IsInf(raw, 0) {
		return 0
	}
	// Round to 2 decimal places (0.25, 0.5, …) to match numeric(5,2).
	rounded := math.Round(raw*100) / 100
	if rounded < 0 {
		return 0
	}
	if rounded > 100 {
		return 100
	}
	return rounded
}

func effectivePrice(price int, discountPercent float64, starts, ends *time.Time, now time.Time) (int, bool) {
	pct := normalizeDiscountPercent(discountPercent)
	if pct <= 0 || pct > 100 {
		return price, false
	}
	active := true
	if starts != nil && now.Before(*starts) {
		active = false
	}
	if ends != nil && !now.Before(*ends) {
		active = false
	}
	if !active {
		return price, false
	}
	off := int(math.Round(float64(price) * pct / 100))
	out := price - off
	if out < 0 {
		out = 0
	}
	return out, true
}

func (s *Service) loadEntitlements(ctx context.Context, packageID string) ([]EntitlementDTO, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT e.id, e.feature_type, e.target_id,
		       COALESCE(c.name_id, c.name_en, '')
		FROM class_package_entitlement e
		LEFT JOIN learning_category c ON c.id = e.target_id AND c.deleted_at IS NULL
		WHERE e.package_id = $1
		ORDER BY e.feature_type, e.created_at
	`, packageID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	out := []EntitlementDTO{}
	for rows.Next() {
		var e EntitlementDTO
		var target *string
		var name string
		if err := rows.Scan(&e.ID, &e.FeatureType, &target, &name); err != nil {
			return nil, apperrors.Internal(err)
		}
		e.TargetID = target
		e.TargetName = name
		out = append(out, e)
	}
	return out, rows.Err()
}

func decodeBenefits(raw []byte) []PackageBenefit {
	if len(raw) == 0 {
		return []PackageBenefit{}
	}
	var out []PackageBenefit
	if err := json.Unmarshal(raw, &out); err != nil || out == nil {
		return []PackageBenefit{}
	}
	return out
}

func (s *Service) scanPackage(row pgx.Row) (*PackageDTO, error) {
	var p PackageDTO
	var cover *string
	var discStart, discEnd *time.Time
	var created, updated time.Time
	var accessDays *int
	var benefitsRaw []byte
	if err := row.Scan(
		&p.ID, &p.Slug, &p.NameID, &p.NameEN, &p.DescriptionID, &p.DescriptionEN, &benefitsRaw,
		&p.PriceIDR, &p.DiscountPercent, &discStart, &discEnd, &accessDays,
		&cover, &p.Position, &p.Status, &created, &updated,
	); err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("package")
		}
		return nil, apperrors.Internal(err)
	}
	p.Benefits = decodeBenefits(benefitsRaw)
	p.CoverObjectKey = cover
	p.CoverURL = s.coverURL(cover)
	p.AccessDurationDays = accessDays
	p.DiscountStartsAt = formatTimePtr(discStart)
	p.DiscountEndsAt = formatTimePtr(discEnd)
	p.EffectivePriceIDR, p.DiscountActive = effectivePrice(p.PriceIDR, p.DiscountPercent, discStart, discEnd, time.Now().UTC())
	p.CreatedAt = formatTime(created)
	p.UpdatedAt = formatTime(updated)
	ents, err := s.loadEntitlements(context.Background(), p.ID)
	if err != nil {
		return nil, err
	}
	p.Entitlements = ents
	return &p, nil
}

func (s *Service) ListPackages(ctx context.Context, page, pageSize int, search, status, sortBy string, publicOnly bool) (*PackageListResult, error) {
	page = normalizePage(page)
	pageSize = normalizePageSize(pageSize)
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	if publicOnly {
		where = append(where, "status = 'PUBLISHED'")
	} else if st := strings.ToUpper(strings.TrimSpace(status)); st != "" && st != "ALL" {
		args = append(args, st)
		where = append(where, fmt.Sprintf("status = $%d::class_package_status", len(args)))
	}
	if q := strings.TrimSpace(search); q != "" {
		args = append(args, "%"+q+"%")
		n := len(args)
		where = append(where, fmt.Sprintf("(name_id ILIKE $%d OR name_en ILIKE $%d OR slug ILIKE $%d)", n, n, n))
	}
	whereSQL := strings.Join(where, " AND ")
	order := "position ASC, updated_at DESC"
	switch strings.TrimSpace(sortBy) {
	case "name":
		order = "name_id ASC, position ASC"
	case "price":
		order = "price_idr ASC, position ASC"
	case "updatedAt":
		order = "updated_at DESC, position ASC"
	}

	var total int
	if err := s.Pool.QueryRow(ctx, `SELECT COUNT(*)::int FROM class_package WHERE `+whereSQL, args...).Scan(&total); err != nil {
		return nil, apperrors.Internal(err)
	}
	args = append(args, pageSize, (page-1)*pageSize)
	rows, err := s.Pool.Query(ctx, `
		SELECT id, slug, name_id, name_en, description_id, description_en, COALESCE(benefits, '[]'::jsonb),
		       price_idr, discount_percent, discount_starts_at, discount_ends_at, access_duration_days,
		       cover_object_key, position, status::text, created_at, updated_at
		FROM class_package
		WHERE `+whereSQL+`
		ORDER BY `+order+`
		LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)), args...)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	items := []PackageDTO{}
	for rows.Next() {
		var p PackageDTO
		var cover *string
		var discStart, discEnd *time.Time
		var created, updated time.Time
		var accessDays *int
		var benefitsRaw []byte
		if err := rows.Scan(
			&p.ID, &p.Slug, &p.NameID, &p.NameEN, &p.DescriptionID, &p.DescriptionEN, &benefitsRaw,
			&p.PriceIDR, &p.DiscountPercent, &discStart, &discEnd, &accessDays,
			&cover, &p.Position, &p.Status, &created, &updated,
		); err != nil {
			return nil, apperrors.Internal(err)
		}
		p.Benefits = decodeBenefits(benefitsRaw)
		p.CoverObjectKey = cover
		p.CoverURL = s.coverURL(cover)
		p.AccessDurationDays = accessDays
		p.DiscountStartsAt = formatTimePtr(discStart)
		p.DiscountEndsAt = formatTimePtr(discEnd)
		p.EffectivePriceIDR, p.DiscountActive = effectivePrice(p.PriceIDR, p.DiscountPercent, discStart, discEnd, time.Now().UTC())
		p.CreatedAt = formatTime(created)
		p.UpdatedAt = formatTime(updated)
		ents, err := s.loadEntitlements(ctx, p.ID)
		if err != nil {
			return nil, err
		}
		p.Entitlements = ents
		items = append(items, p)
	}
	pages := 0
	if total > 0 {
		pages = int(math.Ceil(float64(total) / float64(pageSize)))
	}
	return &PackageListResult{Items: items, Page: page, PageSize: pageSize, Total: total, TotalPages: pages}, rows.Err()
}

func (s *Service) GetPackageByID(ctx context.Context, id string) (*PackageDTO, error) {
	return s.scanPackage(s.Pool.QueryRow(ctx, `
		SELECT id, slug, name_id, name_en, description_id, description_en, COALESCE(benefits, '[]'::jsonb),
		       price_idr, discount_percent, discount_starts_at, discount_ends_at, access_duration_days,
		       cover_object_key, position, status::text, created_at, updated_at
		FROM class_package WHERE id = $1 AND deleted_at IS NULL
	`, id))
}

func (s *Service) GetPackageBySlug(ctx context.Context, slug string, publishedOnly bool) (*PackageDTO, error) {
	q := `
		SELECT id, slug, name_id, name_en, description_id, description_en, COALESCE(benefits, '[]'::jsonb),
		       price_idr, discount_percent, discount_starts_at, discount_ends_at, access_duration_days,
		       cover_object_key, position, status::text, created_at, updated_at
		FROM class_package WHERE slug = $1 AND deleted_at IS NULL`
	if publishedOnly {
		q += ` AND status = 'PUBLISHED'`
	}
	return s.scanPackage(s.Pool.QueryRow(ctx, q, strings.TrimSpace(slug)))
}

func (s *Service) normalizeUpsert(in PackageUpsertInput) (PackageUpsertInput, error) {
	in.NameID = strings.TrimSpace(in.NameID)
	in.NameEN = strings.TrimSpace(in.NameEN)
	if in.NameID == "" && in.NameEN == "" {
		return in, apperrors.Validation("Package name is required", "Nama paket wajib diisi")
	}
	if in.NameID == "" {
		in.NameID = in.NameEN
	}
	if in.NameEN == "" {
		in.NameEN = in.NameID
	}
	if len([]rune(in.NameID)) > 120 || len([]rune(in.NameEN)) > 120 {
		return in, apperrors.Validation("Package name is too long", "Nama paket terlalu panjang")
	}
	if len([]rune(in.DescriptionID)) > 20000 || len([]rune(in.DescriptionEN)) > 20000 {
		return in, apperrors.Validation("Description is too long", "Deskripsi terlalu panjang")
	}
	if in.PriceIDR < 0 || in.PriceIDR > 100_000_000 {
		return in, apperrors.Validation("Invalid price", "Harga tidak valid")
	}
	cleanBenefits := make([]PackageBenefit, 0, len(in.Benefits))
	for _, b := range in.Benefits {
		tid := strings.TrimSpace(b.TextID)
		ten := strings.TrimSpace(b.TextEN)
		if tid == "" && ten == "" {
			continue
		}
		if tid == "" {
			tid = ten
		}
		if ten == "" {
			ten = tid
		}
		if len([]rune(tid)) > 200 || len([]rune(ten)) > 200 {
			return in, apperrors.Validation("Benefit text is too long", "Teks fasilitas terlalu panjang")
		}
		cleanBenefits = append(cleanBenefits, PackageBenefit{TextID: tid, TextEN: ten})
		if len(cleanBenefits) >= 20 {
			break
		}
	}
	in.Benefits = cleanBenefits
	in.DiscountPercent = normalizeDiscountPercent(in.DiscountPercent)
	if in.DiscountPercent < 0 || in.DiscountPercent > 100 {
		return in, apperrors.Validation("Discount must be 0–100%", "Diskon harus 0–100%")
	}
	if in.DiscountPercent > 0 {
		starts, errStart := parseTimePtr(in.DiscountStartsAt)
		ends, errEnd := parseTimePtr(in.DiscountEndsAt)
		if errStart != nil || errEnd != nil || starts == nil || ends == nil {
			return in, apperrors.Validation("Discount requires a start and end time", "Diskon membutuhkan waktu mulai dan berakhir")
		}
		if !ends.After(*starts) {
			return in, apperrors.Validation("Discount end must be after start", "Waktu berakhir diskon harus setelah mulai")
		}
	} else {
		in.DiscountStartsAt = nil
		in.DiscountEndsAt = nil
	}
	if in.AccessDurationDays != nil && *in.AccessDurationDays < 1 {
		return in, apperrors.Validation("Access duration must be at least 1 day", "Durasi akses minimal 1 hari")
	}
	st := strings.ToUpper(strings.TrimSpace(in.Status))
	if st == "" {
		st = "PUBLISHED"
	}
	if st != "DRAFT" && st != "PUBLISHED" && st != "ARCHIVED" {
		return in, apperrors.Validation("Invalid status", "Status tidak valid")
	}
	in.Status = st
	if st == "PUBLISHED" && in.PriceIDR < 1 {
		return in, apperrors.Validation("Published packages need a price of at least Rp 1", "Paket terpublikasi minimal Rp 1")
	}
	clean := make([]EntitlementInput, 0, len(in.Entitlements))
	seen := map[string]struct{}{}
	for _, e := range in.Entitlements {
		ft := strings.TrimSpace(e.FeatureType)
		if ft == "" {
			continue
		}
		var tid *string
		if e.TargetID != nil && strings.TrimSpace(*e.TargetID) != "" {
			v := strings.TrimSpace(*e.TargetID)
			tid = &v
		}
		key := ft + "|"
		if tid != nil {
			key += *tid
		}
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		clean = append(clean, EntitlementInput{FeatureType: ft, TargetID: tid})
	}
	in.Entitlements = clean
	return in, nil
}

func (s *Service) replaceEntitlements(ctx context.Context, tx pgx.Tx, packageID string, ents []EntitlementInput) error {
	if _, err := tx.Exec(ctx, `DELETE FROM class_package_entitlement WHERE package_id = $1`, packageID); err != nil {
		return apperrors.Internal(err)
	}
	for _, e := range ents {
		if _, err := tx.Exec(ctx, `
			INSERT INTO class_package_entitlement (id, package_id, feature_type, target_id, created_at)
			VALUES ($1,$2,$3,$4,NOW())
		`, uuid.NewString(), packageID, e.FeatureType, e.TargetID); err != nil {
			return apperrors.Internal(err)
		}
	}
	return nil
}

func (s *Service) uniqueSlug(ctx context.Context, base, excludeID string) (string, error) {
	slug := slugify(base)
	for i := 0; i < 50; i++ {
		candidate := slug
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", slug, i+1)
		}
		var exists bool
		err := s.Pool.QueryRow(ctx, `
			SELECT EXISTS(
			  SELECT 1 FROM class_package
			  WHERE slug = $1 AND deleted_at IS NULL AND ($2 = '' OR id <> $2)
			)
		`, candidate, excludeID).Scan(&exists)
		if err != nil {
			return "", apperrors.Internal(err)
		}
		if !exists {
			return candidate, nil
		}
	}
	return "", apperrors.Validation("Could not allocate a unique slug", "Gagal membuat slug unik")
}

func (s *Service) CreatePackage(ctx context.Context, in PackageUpsertInput) (*PackageDTO, error) {
	normalized, err := s.normalizeUpsert(in)
	if err != nil {
		return nil, err
	}
	starts, err := parseTimePtr(normalized.DiscountStartsAt)
	if err != nil {
		return nil, apperrors.Validation("Invalid discount start", "Tanggal mulai diskon tidak valid")
	}
	ends, err := parseTimePtr(normalized.DiscountEndsAt)
	if err != nil {
		return nil, apperrors.Validation("Invalid discount end", "Tanggal akhir diskon tidak valid")
	}
	slug, err := s.uniqueSlug(ctx, firstNonEmpty(normalized.NameEN, normalized.NameID), "")
	if err != nil {
		return nil, err
	}
	var nextPos int
	_ = s.Pool.QueryRow(ctx, `SELECT COALESCE(MAX(position),0)+1 FROM class_package WHERE deleted_at IS NULL`).Scan(&nextPos)
	id := uuid.NewString()
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer tx.Rollback(ctx)
	benefitsJSON, err := json.Marshal(normalized.Benefits)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO class_package (
		  id, slug, name_id, name_en, description_id, description_en, benefits,
		  price_idr, discount_percent, discount_starts_at, discount_ends_at, access_duration_days,
		  cover_object_key, position, status, created_at, updated_at
		) VALUES (
		  $1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14,$15::class_package_status,NOW(),NOW()
		)
	`, id, slug, normalized.NameID, normalized.NameEN, normalized.DescriptionID, normalized.DescriptionEN, benefitsJSON,
		normalized.PriceIDR, normalized.DiscountPercent, starts, ends, normalized.AccessDurationDays,
		nullStr(normalized.CoverObjectKey), nextPos, normalized.Status); err != nil {
		return nil, apperrors.Internal(err)
	}
	if err := s.replaceEntitlements(ctx, tx, id, normalized.Entitlements); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	return s.GetPackageByID(ctx, id)
}

func (s *Service) UpdatePackage(ctx context.Context, id string, in PackageUpsertInput) (*PackageDTO, error) {
	normalized, err := s.normalizeUpsert(in)
	if err != nil {
		return nil, err
	}
	starts, err := parseTimePtr(normalized.DiscountStartsAt)
	if err != nil {
		return nil, apperrors.Validation("Invalid discount start", "Tanggal mulai diskon tidak valid")
	}
	ends, err := parseTimePtr(normalized.DiscountEndsAt)
	if err != nil {
		return nil, apperrors.Validation("Invalid discount end", "Tanggal akhir diskon tidak valid")
	}
	var oldCover *string
	if err := s.Pool.QueryRow(ctx, `SELECT cover_object_key FROM class_package WHERE id=$1 AND deleted_at IS NULL`, id).Scan(&oldCover); err != nil {
		if err == pgx.ErrNoRows {
			return nil, apperrors.NotFound("package")
		}
		return nil, apperrors.Internal(err)
	}
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer tx.Rollback(ctx)
	benefitsJSON, err := json.Marshal(normalized.Benefits)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	tag, err := tx.Exec(ctx, `
		UPDATE class_package SET
		  name_id=$2, name_en=$3, description_id=$4, description_en=$5, benefits=$6::jsonb,
		  price_idr=$7, discount_percent=$8, discount_starts_at=$9, discount_ends_at=$10,
		  access_duration_days=$11, cover_object_key=$12, status=$13::class_package_status, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`, id, normalized.NameID, normalized.NameEN, normalized.DescriptionID, normalized.DescriptionEN, benefitsJSON,
		normalized.PriceIDR, normalized.DiscountPercent, starts, ends, normalized.AccessDurationDays,
		nullStr(normalized.CoverObjectKey), normalized.Status)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return nil, apperrors.NotFound("package")
	}
	if err := s.replaceEntitlements(ctx, tx, id, normalized.Entitlements); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, apperrors.Internal(err)
	}
	// Clean previous cover when replaced.
	newCover := nullStr(normalized.CoverObjectKey)
	if s.Media != nil && oldCover != nil && (newCover == nil || *oldCover != *newCover) {
		_ = s.Media.DeleteObject(*oldCover)
	}
	return s.GetPackageByID(ctx, id)
}

func (s *Service) ArchivePackage(ctx context.Context, id string) error {
	tag, err := s.Pool.Exec(ctx, `
		UPDATE class_package SET status='ARCHIVED', updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("package")
	}
	return nil
}

func (s *Service) HardDeletePackage(ctx context.Context, id string) error {
	var paid int
	if err := s.Pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM commerce_order WHERE package_id=$1 AND status='paid'
	`, id).Scan(&paid); err != nil {
		return apperrors.Internal(err)
	}
	if paid > 0 {
		return apperrors.Conflict(apperrors.CodeConflict, "Cannot hard-delete a package with paid orders", "Paket dengan order berbayar tidak bisa dihapus permanen")
	}
	var cover *string
	_ = s.Pool.QueryRow(ctx, `SELECT cover_object_key FROM class_package WHERE id=$1`, id).Scan(&cover)
	tag, err := s.Pool.Exec(ctx, `
		UPDATE class_package SET deleted_at=NOW(), status='ARCHIVED', updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return apperrors.Internal(err)
	}
	if tag.RowsAffected() == 0 {
		return apperrors.NotFound("package")
	}
	if s.Media != nil && cover != nil {
		_ = s.Media.DeleteObject(*cover)
	}
	return nil
}

func nullStr(v *string) *string {
	if v == nil || strings.TrimSpace(*v) == "" {
		return nil
	}
	t := strings.TrimSpace(*v)
	return &t
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

func (s *Service) CreateCheckout(ctx context.Context, userID, userName, userEmail, packageSlug string) (*CheckoutResponse, error) {
	if s.Doku == nil || !s.Doku.Enabled() {
		return nil, apperrors.Validation("Payment gateway is not configured", "Payment gateway belum dikonfigurasi")
	}
	pkg, err := s.GetPackageBySlug(ctx, packageSlug, true)
	if err != nil {
		return nil, err
	}
	amount := pkg.EffectivePriceIDR
	if amount < 1 {
		return nil, apperrors.Validation("Package price is invalid", "Harga paket tidak valid")
	}
	orderID := uuid.NewString()
	invoice := fmt.Sprintf("ONI-%d-%s", time.Now().UTC().Unix(), strings.ToUpper(orderID[:8]))
	resultURL := s.AppURL + "/classes/" + pkg.Slug + "/checkout/result"
	cancelURL := s.AppURL + "/classes/" + pkg.Slug + "/checkout"
	callbackURL := resultURL

	dokuRes, err := s.Doku.CreateCheckout(
		amount, invoice, callbackURL, cancelURL, resultURL, userName, userEmail, userID,
	)
	if err != nil {
		s.Log.Warn("doku checkout create failed", zap.Error(err))
		return nil, apperrors.Internal(fmt.Errorf("checkout failed"))
	}

	_, err = s.Pool.Exec(ctx, `
		INSERT INTO commerce_order (
		  id, user_id, package_id, invoice_number, amount_idr, currency, status,
		  doku_session_id, doku_payment_url, doku_request_id, created_at, updated_at
		) VALUES ($1,$2,$3,$4,$5,'IDR','pending',$6,$7,$8,NOW(),NOW())
	`, orderID, userID, pkg.ID, invoice, amount, dokuRes.SessionID, dokuRes.PaymentURL, invoice)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	return &CheckoutResponse{
		OrderID: orderID, InvoiceNumber: invoice, AmountIDR: amount,
		Currency: "IDR", PaymentURL: dokuRes.PaymentURL, Provider: "doku",
	}, nil
}

func (s *Service) HandleDokuNotification(ctx context.Context, requestID, timestamp, signature, requestTarget string, body []byte) error {
	if s.Doku == nil || !s.Doku.Enabled() {
		return apperrors.Unauthorized()
	}
	target := strings.TrimSpace(requestTarget)
	if target == "" {
		target = "/api/billing/webhooks/doku"
	}
	if !strings.HasPrefix(target, "/") {
		target = "/" + target
	}
	if !s.Doku.VerifyNotification(requestID, timestamp, signature, target, body) {
		return apperrors.Unauthorized()
	}
	var payload map[string]any
	if err := json.Unmarshal(body, &payload); err != nil {
		return apperrors.Validation("Invalid payload", "Payload tidak valid")
	}
	invoice := extractInvoice(payload)
	if invoice == "" {
		return apperrors.Validation("Missing invoice", "Invoice tidak ditemukan")
	}
	status := strings.ToUpper(extractString(payload, "transaction", "status"))
	if status == "" {
		status = strings.ToUpper(extractString(payload, "order", "status"))
	}
	// Accept SUCCESS / PAID variants from DOKU notifications.
	paid := status == "SUCCESS" || status == "PAID" || status == "SETTLEMENT" || strings.Contains(status, "SUCCESS")
	if !paid {
		_, _ = s.Pool.Exec(ctx, `
			UPDATE commerce_order SET status='failed', external_ref=$2, updated_at=NOW()
			WHERE invoice_number=$1 AND status='pending'
		`, invoice, requestID)
		return nil
	}
	return s.applyPaidNotification(ctx, invoice, requestID, body)
}

// SimulatePaid marks a pending order paid and writes grants.
// Intended for local/sandbox development when a public webhook tunnel is unavailable.
// Caller must enforce ALLOW_PAYMENT_SIMULATION + non-production.
func (s *Service) SimulatePaid(ctx context.Context, invoiceOrOrderID string) error {
	id := strings.TrimSpace(invoiceOrOrderID)
	if id == "" {
		return apperrors.Validation("invoice or order id is required", "invoice/order id wajib")
	}
	var invoice string
	err := s.Pool.QueryRow(ctx, `
		SELECT invoice_number FROM commerce_order
		WHERE (id = $1 OR invoice_number = $1) AND status = 'pending'
		LIMIT 1
	`, id).Scan(&invoice)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("order")
		}
		return apperrors.Internal(err)
	}
	fakeBody, _ := json.Marshal(map[string]any{
		"order": map[string]any{
			"invoice_number": invoice,
			"status":         "SUCCESS",
		},
		"transaction": map[string]any{"status": "SUCCESS"},
	})
	// Bypass signature by applying the paid transition directly (same grant writer).
	return s.applyPaidNotification(ctx, invoice, "simulate:"+uuid.NewString(), fakeBody)
}

func (s *Service) applyPaidNotification(ctx context.Context, invoice, requestID string, _ []byte) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return apperrors.Internal(err)
	}
	defer tx.Rollback(ctx)

	var orderID, userID, packageID string
	var amount int
	var current string
	err = tx.QueryRow(ctx, `
		SELECT id, user_id, package_id, amount_idr, status::text
		FROM commerce_order WHERE invoice_number=$1 FOR UPDATE
	`, invoice).Scan(&orderID, &userID, &packageID, &amount, &current)
	if err != nil {
		if err == pgx.ErrNoRows {
			return apperrors.NotFound("order")
		}
		return apperrors.Internal(err)
	}
	if current == "paid" {
		return nil
	}
	if _, err := tx.Exec(ctx, `
		UPDATE commerce_order
		SET status='paid', external_ref=$2, paid_at=NOW(), updated_at=NOW()
		WHERE id=$1
	`, orderID, requestID); err != nil {
		return apperrors.Internal(err)
	}
	var accessDays *int
	if err := tx.QueryRow(ctx, `SELECT access_duration_days FROM class_package WHERE id=$1`, packageID).Scan(&accessDays); err != nil {
		return apperrors.Internal(err)
	}
	var endsAt *time.Time
	if accessDays != nil && *accessDays > 0 {
		t := time.Now().UTC().AddDate(0, 0, *accessDays)
		endsAt = &t
	}
	rows, err := tx.Query(ctx, `
		SELECT feature_type, target_id FROM class_package_entitlement WHERE package_id=$1
	`, packageID)
	if err != nil {
		return apperrors.Internal(err)
	}
	type ent struct {
		ft  string
		tid *string
	}
	ents := []ent{}
	for rows.Next() {
		var e ent
		if err := rows.Scan(&e.ft, &e.tid); err != nil {
			rows.Close()
			return apperrors.Internal(err)
		}
		ents = append(ents, e)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return apperrors.Internal(err)
	}
	for _, e := range ents {
		if _, err := tx.Exec(ctx, `
			INSERT INTO user_feature_grant (
			  id, user_id, feature_type, target_id, source, order_id, status, starts_at, ends_at, created_at, updated_at
			) VALUES ($1,$2,$3,$4,'doku',$5,'active',NOW(),$6,NOW(),NOW())
		`, uuid.NewString(), userID, e.ft, e.tid, orderID, endsAt); err != nil {
			return apperrors.Internal(err)
		}
	}
	return tx.Commit(ctx)
}

func extractInvoice(payload map[string]any) string {
	if v := extractString(payload, "order", "invoice_number"); v != "" {
		return v
	}
	if v := extractString(payload, "transaction", "invoice_number"); v != "" {
		return v
	}
	if v, ok := payload["invoice_number"].(string); ok {
		return v
	}
	return ""
}

func extractString(payload map[string]any, nest, key string) string {
	if nest == "" {
		if v, ok := payload[key].(string); ok {
			return v
		}
		return ""
	}
	if m, ok := payload[nest].(map[string]any); ok {
		if v, ok := m[key].(string); ok {
			return v
		}
	}
	return ""
}

// PackagesForCategory returns published packages that include a learning path (specific or all).
func (s *Service) PackagesForCategory(ctx context.Context, categoryID string) ([]PackageDTO, error) {
	rows, err := s.Pool.Query(ctx, `
		SELECT DISTINCT p.id
		FROM class_package p
		JOIN class_package_entitlement e ON e.package_id = p.id
		WHERE p.deleted_at IS NULL AND p.status = 'PUBLISHED'
		  AND e.feature_type = 'learning_path'
		  AND (e.target_id IS NULL OR e.target_id = $1)
		ORDER BY p.id
	`, categoryID)
	if err != nil {
		return nil, apperrors.Internal(err)
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, apperrors.Internal(err)
		}
		ids = append(ids, id)
	}
	out := make([]PackageDTO, 0, len(ids))
	for _, id := range ids {
		p, err := s.GetPackageByID(ctx, id)
		if err != nil {
			continue
		}
		out = append(out, *p)
	}
	return out, nil
}
