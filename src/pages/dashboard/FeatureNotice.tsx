/**
 * @module pages/dashboard/FeatureNotice
 * @description Reusable inline placeholder for dashboard routes that are
 * temporarily disabled ('maintenance') or not released yet ('soon').
 *
 * Used to gate individual routes (see App.tsx) without a blanket full-app
 * maintenance redirect — the rest of the dashboard stays fully usable while
 * one specific module is paused or pending release.
 *
 * @see App.tsx — route wiring for /dashboard/databases, /dashboard/new,
 *      /dashboard/databases/:id, /dashboard/apikeys, /dashboard/dns
 */

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Wrench, Sparkles } from 'lucide-react'

interface FeatureNoticeProps {
  /** Display name of the feature, e.g. "Bases de datos". */
  feature: string
  /** 'maintenance' — temporarily paused, was working before. 'soon' — not released yet. */
  mode: 'maintenance' | 'soon'
  /** Optional extra context shown below the main message. */
  detail?: string
}

export default function FeatureNotice({ feature, mode, detail }: FeatureNoticeProps) {
  const navigate = useNavigate()
  const isMaintenance = mode === 'maintenance'

  return (
    <div className="p-6 lg:p-8 max-w-[720px] mx-auto">
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer mb-6"
      >
        <ArrowLeft size={14} />
        Volver al dashboard
      </button>

      <div className="rounded-[16px] border border-[#2B2D31] bg-[#111217] p-10 text-center">
        <div
          className={`w-14 h-14 mx-auto rounded-[14px] border flex items-center justify-center mb-5 ${
            isMaintenance
              ? 'bg-[#2A2008] border-[#422006]'
              : 'bg-[#1E2D4A] border-[#1E3A6E]'
          }`}
        >
          {isMaintenance ? (
            <Wrench size={22} className="text-[#EAB308]" />
          ) : (
            <Sparkles size={22} className="text-[#60A5FA]" />
          )}
        </div>

        <h1 className="text-[20px] font-semibold text-[#F5F5F5] mb-2">
          {feature} {isMaintenance ? 'en mantenimiento' : '— próxima implementación'}
        </h1>
        <p className="text-[14px] text-[#71717A] max-w-md mx-auto">
          {isMaintenance
            ? 'Estamos resolviendo un problema en este servicio. Tus datos existentes no se ven afectados; vuelve a intentarlo en un rato.'
            : 'Este módulo todavía no está disponible para uso general. Ya puedes ver cómo luce, pero la integración final sigue en desarrollo.'}
        </p>
        {detail && (
          <p className="text-[12px] text-[#52525B] mt-4">{detail}</p>
        )}
      </div>
    </div>
  )
}
