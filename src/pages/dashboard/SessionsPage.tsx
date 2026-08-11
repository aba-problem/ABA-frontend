/**
 * @module pages/dashboard/SessionsPage
 * @description Direct-link fallback for `/dashboard/sesiones` — day-to-day
 * access now goes through the "Registros de sesión" tab inside
 * {@link SettingsModal} (sidebar no longer links here directly). Kept as a
 * route so an existing bookmark/link doesn't break, rendering the exact
 * same {@link SesionesSection} content.
 *
 * @see components/SesionesSection.tsx — shared content
 * @see components/SettingsModal.tsx — where users normally reach this now
 */

import { useNavigate } from 'react-router-dom'
import { SesionesSection } from '../../components/SesionesSection'
import { ArrowLeft } from 'lucide-react'

export default function SessionsPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 lg:p-8 max-w-[720px] mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver
      </button>
      <SesionesSection />
    </div>
  )
}
