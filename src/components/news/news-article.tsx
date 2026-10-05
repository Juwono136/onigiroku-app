import { getTranslations } from "next-intl/server";

import { MaterialReader } from "@/components/materials/material-reader";
import type { MaterialDetail } from "@/lib/materials/types";

type Props = {
  material: MaterialDetail;
  locale: string;
};

/** Public news detail — long-form reader with share + image zoom. */
export async function NewsArticle({ material, locale }: Props) {
  const t = await getTranslations("news");
  return (
    <MaterialReader
      material={material}
      locale={locale}
      backHref="/news"
      backLabel={t("actions.backToList")}
      eyebrow={t("reader.eyebrow")}
      showExcerpt={false}
      wide
    />
  );
}
