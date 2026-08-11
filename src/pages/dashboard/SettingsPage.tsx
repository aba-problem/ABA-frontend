/**
 * @module pages/dashboard/SettingsPage
 * @description Full-page settings — `/dashboard/settings`.
 *
 * Direct-link/deep-link fallback. Day-to-day access goes through
 * {@link SettingsModal} (opened from the sidebar/topbar without leaving the
 * current page) — both render the exact same {@link ProfileSection} /
 * {@link AppearanceSection} content so they never drift apart.
 *
 * @see components/SettingsSections.tsx — shared content
 * @see components/SettingsModal.tsx — overlay version
 */

import { AppearanceSection, ProfileSection } from '../../components/SettingsSections'

export default function SettingsPage() {
  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold text-[var(--aba-text)] tracking-tight mb-1">Settings</h1>
        <p className="text-[14px] text-[var(--aba-text-muted)]">Manage your account and profile information.</p>
      </div>

      <div className="max-w-xl">
        <AppearanceSection />
      </div>

      <div className="max-w-xl">
        <ProfileSection />
      </div>
    </div>
  )
}
