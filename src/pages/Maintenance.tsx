/**
 * @module pages/Maintenance
 * @description Maintenance mode page shown after login while the platform
 * is temporarily unavailable. The rest of the dashboard routes redirect here
 * until maintenance mode is turned off in App.tsx (`MAINTENANCE_MODE`).
 */

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Database, Wrench } from 'lucide-react'

export default function Maintenance() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#3B82F6]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-[440px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-[10px] bg-[#3B82F6] flex items-center justify-center">
            <Database size={18} className="text-white" />
          </div>
          <span className="text-[20px] font-semibold text-[#F5F5F5]">ABA</span>
        </div>

        {/* Card */}
        <div className="rounded-[16px] border border-[#2B2D31] bg-[#111217] p-8 text-center">
          <div className="w-12 h-12 mx-auto rounded-[12px] bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mb-5">
            <Wrench size={20} className="text-[#60A5FA]" />
          </div>

          <h1 className="text-[22px] font-semibold text-[#F5F5F5] mb-2">We'll be right back</h1>
          <p className="text-[14px] text-[#71717A] mb-6">
            ABA is under maintenance right now. Your databases and data are safe.
            <br />
            Please check back in a few minutes.
          </p>

          {user && (
            <p className="text-[12px] text-[#52525B] mb-6">
              Signed in as <span className="text-[#71717A]">{user.correo}</span>
            </p>
          )}

          <button
            onClick={handleLogout}
            className="w-full h-11 rounded-[10px] border border-[#2B2D31] bg-[#18181B] text-[14px] font-medium text-[#F5F5F5] hover:bg-[#1C1C1F] hover:border-[#3F4146] transition-all duration-150 cursor-pointer"
          >
            Sign out
          </button>
        </div>

        <p className="text-center text-[12px] text-[#52525B] mt-6">
          Free SQL databases for students and developers
        </p>
      </div>
    </div>
  )
}
