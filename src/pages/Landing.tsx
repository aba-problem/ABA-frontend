/**
 * @module pages/Landing
 * @description Public landing page for ABA.
 *
 * The main marketing page shown to unauthenticated visitors. Contains:
 * - Hero section with animated terminal demo
 * - "How it works" 3-step flow
 * - Feature cards (6 items)
 * - Security section with visual diagram
 * - Pricing (single free plan)
 * - Documentation teaser
 * - FAQ accordion
 * - Call-to-action
 * - Footer with links
 *
 * Navigation targets are mapped through react-router's `useNavigate`
 * to keep everything in the SPA without full page reloads.
 *
 * @see instrucciones_de_diseño0.md — Design philosophy and visual language
 * @see instrucciones_de_diseño1.md — Architecture blueprint requirements
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ds/Button'
import { Badge } from '../ds/Badge'
import { FAQ } from '../data'
import {
  Database, Terminal, Shield, Globe, Key,
  BarChart3, BookOpen, ChevronDown, ChevronRight, Check,
  GitBranch, ArrowRight, Clock, Lock, Cpu, ExternalLink,
} from 'lucide-react'

/** Available navigation targets from the landing page. */
type NavTarget = 'register' | 'login' | 'docs'
type Navigate = (target: NavTarget) => void

// ─── Navigation Bar ────────────────────────────────────────────────────────

/**
 * Sticky top navigation bar with logo, nav links, and auth buttons.
 * Uses backdrop blur for a frosted glass effect over content.
 */
function LandingNav({ navigate }: { navigate: Navigate }) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#2B2D31]/80 bg-[#09090B]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[#3B82F6] flex items-center justify-center">
            <span className="text-white text-[12px] font-bold">A</span>
          </div>
          <span className="text-[15px] font-semibold text-[#F5F5F5]">ABA</span>
        </div>
        {/* Nav links — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1 text-[13px] text-[#71717A]">
          {['Features', 'Pricing', 'Documentation', 'Changelog'].map(item => (
            <button key={item} className="px-3 py-1.5 rounded-[6px] hover:text-[#F5F5F5] hover:bg-[#18181B] transition-all">
              {item}
            </button>
          ))}
        </nav>
        {/* Auth buttons */}
        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('login')}>Sign in</Button>
          <Button variant="primary" size="sm" onClick={() => navigate('register')}>
            Get started free
          </Button>
        </div>
      </div>
    </header>
  )
}

// ─── Hero Terminal ─────────────────────────────────────────────────────────

/** Simulated terminal output for the hero section. */
const TERMINAL_LINES = [
  { delay: 0, type: 'cmd', text: '$ aba create my-app-db --engine postgres' },
  { delay: 400, type: 'info', text: '  Selecting region us-east-1…' },
  { delay: 800, type: 'info', text: '  Provisioning PostgreSQL 16…' },
  { delay: 1200, type: 'success', text: '  ✓ Database ready in 8.4s' },
  { delay: 1600, type: 'success', text: '  ✓ Connection string copied' },
  { delay: 2000, type: 'blank', text: '' },
  { delay: 2200, type: 'conn', text: '  postgres://user:••••@host.aba.dev:5432/my-app-db' },
]

/**
 * Animated terminal mock showing the database creation flow.
 * Renders each line with a delay to simulate real-time output.
 */
function HeroTerminal() {
  return (
    <div className="relative rounded-[16px] border border-[#2B2D31] bg-[#111217] shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* Window chrome — macOS-style traffic lights */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2B2D31] bg-[#0E0E14]">
        <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
        <div className="w-3 h-3 rounded-full bg-[#EAB308]/80" />
        <div className="w-3 h-3 rounded-full bg-[#22C55E]/80" />
        <span className="ml-3 text-[11px] font-mono text-[#52525B]">Terminal</span>
      </div>
      {/* Terminal content */}
      <div className="p-5 font-mono text-[13px] space-y-1 min-h-[200px]">
        {TERMINAL_LINES.map((line, i) => (
          <div
            key={i}
            className="transition-all"
            style={{ animationDelay: `${line.delay}ms` }}
          >
            {line.type === 'cmd' && (
              <span className="text-[#F5F5F5]">{line.text}</span>
            )}
            {line.type === 'info' && (
              <span className="text-[#71717A]">{line.text}</span>
            )}
            {line.type === 'success' && (
              <span className="text-[#22C55E]">{line.text}</span>
            )}
            {line.type === 'conn' && (
              <span className="text-[#60A5FA]">{line.text}</span>
            )}
            {line.type === 'blank' && <span>&nbsp;</span>}
          </div>
        ))}
      </div>
      {/* Subtle blue glow at bottom */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#3B82F6]/5 to-transparent" />
    </div>
  )
}

// ─── Features Data ─────────────────────────────────────────────────────────

/** Feature cards displayed in the features section. */
const FEATURES = [
  {
    icon: Database, color: '#3B82F6',
    title: 'PostgreSQL & MySQL',
    desc: 'Support for PostgreSQL 14–16 and MySQL 8.0 with full SQL compliance. Get a production-ready database in seconds.',
  },
  {
    icon: Terminal, color: '#6366F1',
    title: 'Browser SQL Console',
    desc: 'Run queries directly from your browser. Schema browser, query history, and result exports — no local client needed.',
  },
  {
    icon: Key, color: '#A855F7',
    title: 'API Key Management',
    desc: 'Scoped API keys with granular read/write/delete permissions. Rotate keys without downtime.',
  },
  {
    icon: BarChart3, color: '#22C55E',
    title: 'Real-time Analytics',
    desc: 'Query volume, storage usage, slow query detection, and connection monitoring — all in one dashboard.',
  },
  {
    icon: Activity2, color: '#EAB308',
    title: 'Traffic Monitoring',
    desc: 'Reads, writes, bandwidth, and error rates over daily, weekly, and monthly time ranges.',
  },
  {
    icon: Globe, color: '#06B6D4',
    title: 'Global Regions',
    desc: 'Deploy to 6 regions across US, EU, and APAC. Choose the region closest to your users.',
  },
]

/** Custom activity icon (not available in lucide-react). */
function Activity2(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg width={props.size ?? 24} height={props.size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
}

// ─── Security Data ─────────────────────────────────────────────────────────

/** Security features listed in the security section. */
const SECURITY = [
  { icon: Lock, title: 'TLS 1.3 Encryption', desc: 'All connections encrypted in transit using TLS 1.3.' },
  { icon: Shield, title: 'AES-256 at Rest', desc: 'Data encrypted at rest using AES-256-GCM.' },
  { icon: Clock, title: 'Daily Backups', desc: 'Automated encrypted backups with 7-day retention.' },
  { icon: Cpu, title: 'IP Allowlisting', desc: 'Restrict database access to specific IP ranges.' },
]

// ─── How It Works ──────────────────────────────────────────────────────────

/** Three-step "how it works" flow. */
const HOW_IT_WORKS = [
  { step: '01', title: 'Create a database', desc: 'Choose PostgreSQL or MySQL, pick a region, name your database. Done in under 30 seconds.' },
  { step: '02', title: 'Copy the connection string', desc: 'Get your URI, JDBC, or .env format instantly. Works with any ORM or framework.' },
  { step: '03', title: 'Build your app', desc: 'Connect Prisma, Drizzle, SQLAlchemy, or any SQL client. Monitor usage in the dashboard.' },
]

// ─── FAQ Item ──────────────────────────────────────────────────────────────

/** Expandable FAQ accordion item. */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#2B2D31] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full py-5 text-left gap-4 group"
      >
        <span className="text-[15px] font-medium text-[#F5F5F5] group-hover:text-[#60A5FA] transition-colors">{q}</span>
        <ChevronDown size={16} className={`text-[#71717A] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="text-[14px] text-[#A1A1AA] leading-relaxed pb-5">{a}</p>
      )}
    </div>
  )
}

// ─── Route Mapping ─────────────────────────────────────────────────────────

/** Maps navigation targets to actual routes. */
const ROUTES: Record<NavTarget, string> = {
  register: '/login', // Both register and login go to the same OAuth page
  login: '/login',
  docs: '/docs',
}

// ─── Main Landing Component ────────────────────────────────────────────────

/**
 * ABA Landing page — the public marketing page.
 *
 * Renders all sections in order: Hero → Social Proof → How It Works →
 * Features → Security → Pricing → Docs → FAQ → CTA → Footer.
 *
 * Uses the ABA Design System (dark theme, Inter/JetBrains Mono fonts,
 * 12px rounded corners, blue accent color).
 */
export default function Landing() {
  const routerNavigate = useNavigate()
  const navigate: Navigate = (target) => {
    routerNavigate(ROUTES[target])
  }

  return (
    <div className="min-h-screen bg-[#09090B]">
      <LandingNav navigate={navigate} />

      {/* ═══ Hero ═══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
        {/* Radial blue glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#3B82F6]/8 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 lg:pt-24 pb-14 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Copy */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Badge variant="primary" dot size="sm">Now in public beta</Badge>
              </div>
              <h1 className="text-[36px] sm:text-[48px] md:text-[56px] font-semibold text-[#F5F5F5] leading-[1.1] tracking-tight mb-6">
                SQL databases<br />
                <span className="text-[#3B82F6]">for every builder.</span>
              </h1>
              <p className="text-[18px] text-[#A1A1AA] leading-relaxed mb-8 max-w-lg">
                Free PostgreSQL and MySQL databases. Instant connection strings, browser SQL console, real-time analytics — no credit card needed.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-10">
                <Button variant="primary" size="lg" onClick={() => navigate('register')} iconRight={<ArrowRight size={16} />}>
                  Start building free
                </Button>
                <Button variant="secondary" size="lg" onClick={() => navigate('docs')} iconLeft={<BookOpen size={16} />}>
                  Read the docs
                </Button>
              </div>

              <div className="flex items-center gap-6 text-[13px] text-[#71717A]">
                {['No credit card', 'PostgreSQL & MySQL', '512 MB free'].map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <Check size={13} className="text-[#22C55E]" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Terminal demo */}
            <div className="relative">
              <HeroTerminal />
            </div>
          </div>
        </div>

        {/* Social proof bar */}
        <div className="border-t border-[#2B2D31] bg-[#111217]/50">
          <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-[#71717A]">
              Trusted by <span className="text-[#F5F5F5] font-semibold">12,400+</span> students and developers
            </p>
            <div className="flex items-center gap-6 opacity-40 grayscale">
              {['Vercel', 'Supabase', 'Railway', 'Neon', 'PlanetScale'].map(b => (
                <span key={b} className="text-[13px] font-semibold text-[#A1A1AA]">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ How It Works ══════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 lg:py-24 border-t border-[#2B2D31]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-[26px] sm:text-[36px] font-semibold text-[#F5F5F5] tracking-tight">From zero to connected in 30 seconds</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line between steps (desktop only) */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-[#2B2D31] to-transparent z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-[12px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center mb-4">
                    <span className="font-mono text-[13px] font-bold text-[#3B82F6]">{step.step}</span>
                  </div>
                  <h3 className="text-[16px] font-semibold text-[#F5F5F5] mb-2">{step.title}</h3>
                  <p className="text-[14px] text-[#71717A] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features ══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 lg:py-24 border-t border-[#2B2D31]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-14">
            <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-widest mb-3">Features</p>
            <div className="flex items-end justify-between gap-6">
              <h2 className="text-[26px] sm:text-[36px] font-semibold text-[#F5F5F5] tracking-tight max-w-lg">
                Everything you need to ship.
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('docs')} iconRight={<ChevronRight size={14} />}>
                Full documentation
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="group rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-6 hover:border-[#3F4146] hover:bg-[#1C1C1F] transition-all duration-200 cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.color}18`, border: `1px solid ${f.color}30` }}
                >
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="text-[15px] font-semibold text-[#F5F5F5] mb-2 group-hover:text-[#60A5FA] transition-colors">{f.title}</h3>
                <p className="text-[13px] text-[#71717A] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Security ══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 lg:py-24 border-t border-[#2B2D31]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-widest mb-4">Security</p>
              <h2 className="text-[26px] sm:text-[36px] font-semibold text-[#F5F5F5] tracking-tight mb-4">
                Enterprise security, free of charge.
              </h2>
              <p className="text-[15px] text-[#71717A] leading-relaxed mb-8">
                ABA is built on the same security principles as paid platforms. Your data is encrypted, backed up, and protected.
              </p>
              <div className="space-y-4">
                {SECURITY.map((s, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-9 h-9 rounded-[8px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center shrink-0">
                      <s.icon size={16} className="text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#F5F5F5] mb-0.5">{s.title}</p>
                      <p className="text-[13px] text-[#71717A]">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Security architecture diagram */}
            <div className="relative">
              <div className="rounded-[16px] border border-[#2B2D31] bg-[#111217] p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="text-[12px] font-mono text-[#71717A]">All connections encrypted</span>
                </div>
                {[
                  { label: 'Your App', icon: '◧', color: '#3B82F6' },
                  { label: 'TLS 1.3 Layer', icon: '⬟', color: '#22C55E' },
                  { label: 'ABA Edge', icon: '⬡', color: '#A855F7' },
                  { label: 'AES-256 Database', icon: '⬢', color: '#EAB308' },
                ].map((layer, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-[#2B2D31] last:border-0">
                    <div
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: `${layer.color}18`, color: layer.color }}
                    >
                      {layer.icon}
                    </div>
                    <span className="text-[13px] text-[#A1A1AA]">{layer.label}</span>
                    {i < 3 && <div className="ml-auto w-16 h-px bg-gradient-to-r from-[#2B2D31] to-[#22C55E]/50" />}
                  </div>
                ))}
                <div className="mt-4 px-3 py-2 rounded-[8px] bg-[#14291E] border border-[#14522D]">
                  <p className="text-[12px] text-[#4ADE80]">✓ SOC 2 Type II compliant infrastructure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 lg:py-24 border-t border-[#2B2D31]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-[26px] sm:text-[36px] font-semibold text-[#F5F5F5] tracking-tight mb-3">Free forever. No tricks.</h2>
            <p className="text-[15px] text-[#71717A]">One plan. Everything included. No credit card required.</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="rounded-[16px] border border-[#3B82F6]/50 bg-[#18181B] p-8 relative overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.15)]">
              {/* Top glow accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent" />

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[20px] font-semibold text-[#F5F5F5]">Free Plan</h3>
                  <p className="text-[13px] text-[#71717A] mt-0.5">For students and developers</p>
                </div>
                <Badge variant="primary" size="md">Current</Badge>
              </div>

              <div className="flex items-end gap-1 mb-8">
                <span className="text-[52px] font-bold text-[#F5F5F5] leading-none">$0</span>
                <span className="text-[15px] text-[#71717A] mb-2">/ month</span>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  '512 MB storage per database',
                  'Unlimited databases',
                  'Unlimited queries',
                  '20 concurrent connections',
                  'PostgreSQL 14/15/16 & MySQL 8.0',
                  'Browser SQL Console',
                  'API key management',
                  'Real-time analytics',
                  'Daily automated backups',
                  'SSL/TLS encryption',
                  '6 global regions',
                  'Community support',
                ].map(feature => (
                  <div key={feature} className="flex items-center gap-3 text-[14px] text-[#A1A1AA]">
                    <Check size={14} className="text-[#22C55E] shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>

              <Button variant="primary" size="lg" fullWidth onClick={() => navigate('register')} iconRight={<ArrowRight size={16} />}>
                Start for free
              </Button>
              <p className="text-center text-[12px] text-[#52525B] mt-3">No credit card required · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Documentation Teaser ══════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 lg:py-24 border-t border-[#2B2D31]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-widest mb-4">Documentation</p>
              <h2 className="text-[26px] sm:text-[36px] font-semibold text-[#F5F5F5] tracking-tight mb-4">Comprehensive guides and references.</h2>
              <p className="text-[15px] text-[#71717A] leading-relaxed mb-6">
                From quick starts to advanced configuration — every concept is documented with real code examples.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => navigate('docs')} iconRight={<ExternalLink size={14} />}>
                  Browse docs
                </Button>
                <Button variant="ghost" iconLeft={<GitBranch size={14} />}>
                  View on GitHub
                </Button>
              </div>
            </div>
            {/* Documentation links list */}
            <div className="rounded-[14px] border border-[#2B2D31] bg-[#111217] overflow-hidden">
              {['Getting Started', 'Connection Guide', 'SQL Console', 'API Reference', 'Analytics', 'Security'].map((doc, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#2B2D31] last:border-0 hover:bg-[#18181B] transition-colors cursor-pointer group">
                  <BookOpen size={14} className="text-[#52525B] shrink-0" />
                  <span className="text-[14px] text-[#A1A1AA] group-hover:text-[#F5F5F5] transition-colors">{doc}</span>
                  <ChevronRight size={12} className="text-[#52525B] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══════════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 lg:py-24 border-t border-[#2B2D31]">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[11px] font-mono text-[#3B82F6] uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-[26px] sm:text-[36px] font-semibold text-[#F5F5F5] tracking-tight">Common questions</h2>
          </div>
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] px-4 sm:px-8">
            {FAQ.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══════════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 lg:py-24 border-t border-[#2B2D31]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-[28px] sm:text-[40px] font-semibold text-[#F5F5F5] tracking-tight mb-4">
            Start building in 30 seconds.
          </h2>
          <p className="text-[16px] text-[#71717A] mb-8">No setup. No credit card. Just a database.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" size="lg" onClick={() => navigate('register')} iconRight={<ArrowRight size={16} />}>
              Create free account
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate('login')}>
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ Footer ════════════════════════════════════════════════════════ */}
      <footer className="border-t border-[#2B2D31] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-6 h-6 rounded-[7px] bg-[#3B82F6] flex items-center justify-center">
              <span className="text-white text-[11px] font-bold">A</span>
            </div>
            <span className="text-[14px] font-semibold text-[#F5F5F5]">ABA</span>
            <span className="text-[#52525B] text-[13px] ml-2">Free SQL databases for everyone.</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Status', 'Roadmap'] },
              { title: 'Developers', links: ['Documentation', 'API Reference', 'CLI', 'GitHub', 'SDKs'] },
              { title: 'Company', links: ['About', 'Blog', 'Privacy', 'Terms', 'Security'] },
              { title: 'Support', links: ['Help Center', 'Discord', 'Contact', 'Report Bug'] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[#71717A] mb-3">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link}>
                      <span className="text-[13px] text-[#52525B] hover:text-[#A1A1AA] transition-colors cursor-pointer">{link}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-[#1F2024]">
            <p className="text-[12px] text-[#52525B]">© 2024 ABA Technologies. All rights reserved.</p>
            <p className="text-[12px] text-[#52525B]">Built with ♥ for the open-source community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
