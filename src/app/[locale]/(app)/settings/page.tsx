import { getTranslations, setRequestLocale } from "next-intl/server";

import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { ROLE_LABELS } from "@/lib/auth/roles";
import {
  getSessionRole,
  getSessionUser,
  requireSession,
} from "@/lib/auth/session";
import { toBrowserMediaUrl } from "@/lib/storage";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession({
    locale,
    callbackPath: "/settings",
  });
  const t = await getTranslations("settings");
  const user = getSessionUser(session);
  const role = getSessionRole(session);
  const roleLabel =
    locale === "en" ? ROLE_LABELS[role].en : ROLE_LABELS[role].id;

  return (
    <SettingsWorkspace
      user={{
        name: user.name,
        email: user.email,
        image: toBrowserMediaUrl(user.image),
      }}
      roleLabel={roleLabel}
      eyebrow={t("eyebrow")}
      title={t("title")}
      subtitle={t("subtitle")}
    />
  );
}
