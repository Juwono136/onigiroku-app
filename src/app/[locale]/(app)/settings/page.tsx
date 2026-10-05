import { getTranslations, setRequestLocale } from "next-intl/server";

import { SettingsWorkspace } from "@/components/settings/settings-workspace";
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

  return (
    <SettingsWorkspace
      user={{
        name: user.name,
        email: user.email,
        image: toBrowserMediaUrl(user.image),
      }}
      role={role}
      eyebrow={t("eyebrow")}
      title={t("title")}
      subtitle={t("subtitle")}
    />
  );
}
