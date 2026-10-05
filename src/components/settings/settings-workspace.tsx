"use client";

import { LoginHistoryPanel } from "@/components/settings/login-history";
import { PasswordSettingsForm } from "@/components/settings/password-form";
import { ProfileSettingsForm } from "@/components/settings/profile-form";
import type { UserRole } from "@/lib/auth/roles";

type Props = {
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
  role: UserRole;
  eyebrow: string;
  title: string;
  subtitle: string;
};

/**
 * Settings layout:
 * - Mobile: profile → password → history (stacked)
 * - Large: left stack (profile + password) | right sticky history
 */
export function SettingsWorkspace({
  user,
  role,
  eyebrow,
  title,
  subtitle,
}: Props) {
  return (
    <div className="relative flex flex-1 flex-col">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-workspace-mesh"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-seigaiha opacity-[0.16]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-charcoal/70">{subtitle}</p>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-7 xl:col-span-7">
            <ProfileSettingsForm
              initialName={user.name}
              initialEmail={user.email}
              initialImage={user.image}
              role={role}
            />
            <PasswordSettingsForm />
          </div>
          <div className="min-w-0 lg:col-span-5 xl:col-span-5 lg:sticky lg:top-[4.75rem]">
            <LoginHistoryPanel compact />
          </div>
        </div>
      </div>
    </div>
  );
}
