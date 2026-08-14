/**
 * @module components/ErrorBoundary
 * @description Root-level React error boundary. Without this, ANY uncaught
 * render exception anywhere in the tree unmounts the entire app, leaving a
 * blank page with zero feedback — exactly what happened when SettingsModal
 * crashed in production with nothing telling the user (or us) what broke.
 *
 * Class component on purpose — `componentDidCatch`/`getDerivedStateFromError`
 * have no hook equivalent in React yet.
 */

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary atrapó:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
          <div className="max-w-[440px] w-full rounded-[16px] border border-[#2B2D31] bg-[#111217] p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-[12px] bg-[#2A1010] border border-[#7F1D1D] flex items-center justify-center mb-5">
              <AlertTriangle size={20} className="text-[#F87171]" />
            </div>
            <h1 className="text-[18px] font-semibold text-[#F5F5F5] mb-2">Algo salió mal</h1>
            <p className="text-[13px] text-[#71717A] mb-6">
              Encontramos un error inesperado en esta parte de la página. Recarga para seguir donde estabas.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="h-10 px-5 rounded-[10px] bg-[#3B82F6] text-[14px] font-medium text-white hover:bg-[#2563EB] transition-all cursor-pointer"
            >
              Recargar página
            </button>
            <p className="text-[11px] text-[#52525B] mt-5 font-mono break-all">{this.state.error.message}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
