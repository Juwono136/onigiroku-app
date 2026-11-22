package commerce

type PackageBenefit struct {
	TextID string `json:"textId"`
	TextEN string `json:"textEn"`
}

type PackageDTO struct {
	ID                  string            `json:"id"`
	Slug                string            `json:"slug"`
	NameID              string            `json:"nameId"`
	NameEN              string            `json:"nameEn"`
	DescriptionID       string            `json:"descriptionId"`
	DescriptionEN       string            `json:"descriptionEn"`
	Benefits            []PackageBenefit  `json:"benefits"`
	PriceIDR            int               `json:"priceIdr"`
	DiscountPercent     float64           `json:"discountPercent"`
	DiscountStartsAt    *string           `json:"discountStartsAt"`
	DiscountEndsAt      *string           `json:"discountEndsAt"`
	EffectivePriceIDR   int               `json:"effectivePriceIdr"`
	DiscountActive      bool              `json:"discountActive"`
	AccessDurationDays  *int              `json:"accessDurationDays"`
	CoverObjectKey      *string           `json:"coverObjectKey"`
	CoverURL            *string           `json:"coverUrl"`
	Position            int               `json:"position"`
	Status              string            `json:"status"`
	Entitlements        []EntitlementDTO  `json:"entitlements"`
	CreatedAt           string            `json:"createdAt"`
	UpdatedAt           string            `json:"updatedAt"`
}

type EntitlementDTO struct {
	ID          string  `json:"id"`
	FeatureType string  `json:"featureType"`
	TargetID    *string `json:"targetId"`
	TargetName  string  `json:"targetName,omitempty"`
}

type PackageListResult struct {
	Items      []PackageDTO `json:"items"`
	Page       int          `json:"page"`
	PageSize   int          `json:"pageSize"`
	Total      int          `json:"total"`
	TotalPages int          `json:"totalPages"`
}

type PackageUpsertInput struct {
	NameID             string              `json:"nameId"`
	NameEN             string              `json:"nameEn"`
	DescriptionID      string              `json:"descriptionId"`
	DescriptionEN      string              `json:"descriptionEn"`
	Benefits           []PackageBenefit    `json:"benefits"`
	PriceIDR           int                 `json:"priceIdr"`
	DiscountPercent    float64             `json:"discountPercent"`
	DiscountStartsAt   *string             `json:"discountStartsAt"`
	DiscountEndsAt     *string             `json:"discountEndsAt"`
	AccessDurationDays *int                `json:"accessDurationDays"`
	CoverObjectKey     *string             `json:"coverObjectKey"`
	Status             string              `json:"status"`
	Entitlements       []EntitlementInput  `json:"entitlements"`
}

type EntitlementInput struct {
	FeatureType string  `json:"featureType"`
	TargetID    *string `json:"targetId"`
}

type CheckoutRequest struct {
	PackageSlug string `json:"packageSlug"`
}

type CheckoutResponse struct {
	OrderID       string `json:"orderId"`
	InvoiceNumber string `json:"invoiceNumber"`
	AmountIDR     int    `json:"amountIdr"`
	Currency      string `json:"currency"`
	PaymentURL    string `json:"paymentUrl"`
	Provider      string `json:"provider"`
}

type OrderDTO struct {
	ID            string  `json:"id"`
	PackageID     string  `json:"packageId"`
	InvoiceNumber string  `json:"invoiceNumber"`
	AmountIDR     int     `json:"amountIdr"`
	Currency      string  `json:"currency"`
	Status        string  `json:"status"`
	PaymentURL    string  `json:"paymentUrl,omitempty"`
	PaidAt        *string `json:"paidAt,omitempty"`
	CreatedAt     string  `json:"createdAt"`
}
