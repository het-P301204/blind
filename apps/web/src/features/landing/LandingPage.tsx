import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { api } from '@/lib/api'
import { Button } from '@/components/ui'
import {
  ShieldAlert,
  Lock,
  Cpu,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

// ─── Demo data ──────────────────────────────────────────────────────────────

const DEMO_TACTICS = [
  {
    id: 'reconnaissance',
    name: 'Reconnaissance',
    techniques: [
      { id: 'T1595', name: 'Active Scanning', level: 'PARTIAL' },
      { id: 'T1592', name: 'Gather Victim Host Info', level: 'LIMITED' },
      { id: 'T1589', name: 'Gather Victim Identity Info', level: 'NO_MAPPED_COVERAGE' },
      { id: 'T1590', name: 'Gather Victim Network Info', level: 'NO_MAPPED_COVERAGE' },
    ],
  },
  {
    id: 'initial-access',
    name: 'Initial Access',
    techniques: [
      { id: 'T1190', name: 'Exploit Public-Facing App', level: 'STRONG' },
      { id: 'T1566', name: 'Phishing', level: 'PARTIAL' },
      { id: 'T1078', name: 'Valid Accounts', level: 'LIMITED' },
      { id: 'T1133', name: 'External Remote Services', level: 'NO_MAPPED_COVERAGE' },
    ],
  },
  {
    id: 'execution',
    name: 'Execution',
    techniques: [
      { id: 'T1059', name: 'Command & Scripting Interpreter', level: 'STRONG' },
      { id: 'T1047', name: 'WMI', level: 'PARTIAL' },
      { id: 'T1053', name: 'Scheduled Task/Job', level: 'STRONG' },
      { id: 'T1204', name: 'User Execution', level: 'LIMITED' },
    ],
  },
  {
    id: 'persistence',
    name: 'Persistence',
    techniques: [
      { id: 'T1547', name: 'Boot or Logon Autostart', level: 'PARTIAL' },
      { id: 'T1543', name: 'Create/Modify System Process', level: 'LIMITED' },
      { id: 'T1136', name: 'Create Account', level: 'STRONG' },
      { id: 'T1098', name: 'Account Manipulation', level: 'NO_MAPPED_COVERAGE' },
    ],
  },
  {
    id: 'lateral-movement',
    name: 'Lateral Movement',
    techniques: [
      { id: 'T1021', name: 'Remote Services', level: 'PARTIAL' },
      { id: 'T1550', name: 'Use Alternate Auth Material', level: 'LIMITED' },
      { id: 'T1534', name: 'Internal Spearphishing', level: 'NO_MAPPED_COVERAGE' },
      { id: 'T1563', name: 'Remote Service Session Hijacking', level: 'NO_MAPPED_COVERAGE' },
    ],
  },
] as const

const COVERAGE_COLORS: Record<string, string> = {
  NO_MAPPED_COVERAGE: '#292722',
  LIMITED: '#4A3D1A',
  PARTIAL: '#5C480F',
  STRONG: '#7A4020',
  UNKNOWN: '#292722',
}

const DEMO_GAPS = [
  { rank: 1, id: 'T1589', name: 'Gather Victim Identity Info', score: 92.4, tactic: 'Reconnaissance' },
  { rank: 2, id: 'T1534', name: 'Internal Spearphishing', score: 87.1, tactic: 'Lateral Movement' },
  { rank: 3, id: 'T1098', name: 'Account Manipulation', score: 81.7, tactic: 'Persistence' },
]

// ─── Scroll-reveal wrapper ───────────────────────────────────────────────────

function RevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  async function handleExploreDemo() {
    setLoading(true)
    try {
      await api.startIngest({ path: '', type: 'demo' })
    } catch {
      // swallow — navigate regardless
    } finally {
      setLoading(false)
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-obsidian/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-ivory tracking-widest text-lg">BLIND</span>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/matrix')}>
              Load Local Rules
            </Button>
            <Button size="sm" loading={loading} onClick={handleExploreDemo}>
              Explore Demo
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-6 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1
            className="font-display font-bold leading-none tracking-tight text-ivory"
            style={{ fontSize: 'clamp(64px, 10vw, 120px)' }}
          >
            BLIND
          </h1>
          <p className="font-display text-4xl text-muted mt-3 mb-5">
            Detection Coverage Intelligence
          </p>
          <p className="text-xl text-ivory/80 mb-10">See your detection surface.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" loading={loading} onClick={handleExploreDemo}>
              Explore Demo
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/matrix')}>
              Analyse Local Rules
            </Button>
          </div>
        </motion.div>

        {/* Mini ATT&CK matrix preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
          className="mt-16"
        >
          <p className="text-xs font-mono text-muted uppercase tracking-widest mb-4">
            Illustrative Demo Data
          </p>
          <div className="overflow-x-auto rounded-xl border border-border p-4 bg-graphite">
            <div className="flex gap-2 w-fit mx-auto">
              {DEMO_TACTICS.map(tactic => (
                <div key={tactic.id} className="flex flex-col gap-1" style={{ width: 148 }}>
                  <p className="text-[10px] font-mono text-muted uppercase tracking-wide px-1 mb-1 truncate">
                    {tactic.name}
                  </p>
                  {tactic.techniques.map(t => (
                    <div
                      key={t.id}
                      className="rounded px-1.5 py-1.5 h-12 flex flex-col justify-between"
                      style={{ backgroundColor: COVERAGE_COLORS[t.level] }}
                    >
                      <span className="text-[9px] font-mono text-muted/70 leading-none">{t.id}</span>
                      <span className="text-[10px] text-ivory/80 leading-tight line-clamp-2">
                        {t.name}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── The Coverage Gap Problem ─────────────────────────────────────── */}
      <RevealSection>
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-ivory mb-3">
              The Coverage Gap Problem
            </h2>
            <p className="text-muted text-lg mb-12 max-w-2xl">
              Having a Sigma rule does not mean you can detect an attack. True detection requires
              all three pillars to align simultaneously.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {[
                {
                  icon: <CheckCircle size={28} className="text-copper" />,
                  title: 'Rule Exists',
                  description:
                    'A Sigma rule is written and ingested into your corpus. Necessary — but not sufficient.',
                  step: '01',
                },
                {
                  icon: <AlertCircle size={28} className="text-amber" />,
                  title: 'Telemetry Available',
                  description:
                    'The log source the rule queries is actually collected and flowing into your SIEM.',
                  step: '02',
                },
                {
                  icon: <CheckCircle size={28} className="text-sage" />,
                  title: 'Detection Validated',
                  description:
                    'The rule fires correctly against real or simulated adversary activity in your environment.',
                  step: '03',
                },
              ].map((card, i) => (
                <div key={i} className="bg-warm-surface border border-border rounded-xl p-6 relative">
                  <div className="absolute top-4 right-4 font-mono text-xs text-muted/40">
                    {card.step}
                  </div>
                  <div className="mb-4">{card.icon}</div>
                  <h3 className="font-display font-semibold text-ivory text-lg mb-2">{card.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{card.description}</p>
                  {i < 2 && (
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center z-10 w-8">
                      <ArrowRight size={18} className="text-copper" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── From Sigma to ATT&CK ────────────────────────────────────────── */}
      <RevealSection>
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-ivory mb-3">
              From Sigma to ATT&CK
            </h2>
            <p className="text-muted text-lg mb-10 max-w-2xl">
              BLIND parses your Sigma rule corpus and maps every rule to ATT&CK techniques,
              surfacing your coverage across tactics at a glance.
            </p>
            <div className="flex items-center gap-0 overflow-x-auto pb-3">
              {(
                [
                  {
                    label: 'Sigma Rule',
                    content: 'detection:\n  keywords:\n    - "mimikatz"',
                    mono: true,
                    borderColor: 'border-copper',
                  },
                  null,
                  {
                    label: 'ATT&CK Tag',
                    content: 'attack.t1003.001',
                    mono: true,
                    borderColor: 'border-amber',
                  },
                  null,
                  {
                    label: 'Technique',
                    content: 'OS Credential Dumping:\nLSASS Memory',
                    mono: false,
                    borderColor: 'border-sage',
                  },
                  null,
                  {
                    label: 'Tactic',
                    content: 'Credential Access',
                    mono: false,
                    borderColor: 'border-muted',
                  },
                ] as const
              ).map((item, i) => {
                if (item === null) {
                  return (
                    <ArrowRight key={`arrow-${i}`} size={20} className="text-muted/50 mx-3 shrink-0" />
                  )
                }
                return (
                  <div
                    key={i}
                    className={`bg-warm-surface border ${item.borderColor} rounded-lg p-4 min-w-[160px] shrink-0`}
                  >
                    <p className="text-xs text-muted mb-2 uppercase tracking-wide">{item.label}</p>
                    {item.mono ? (
                      <pre className="text-xs font-mono text-ivory whitespace-pre leading-relaxed">
                        {item.content}
                      </pre>
                    ) : (
                      <p className="text-sm text-ivory leading-snug">{item.content}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Coverage is not Detection — 5 Dimensions ────────────────────── */}
      <RevealSection>
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-ivory mb-3">
              Coverage is not Detection
            </h2>
            <p className="text-muted text-lg mb-10 max-w-2xl">
              BLIND scores each technique across five dimensions to give you a real picture of
              detection effectiveness — not just rule presence.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                {
                  name: 'Presence',
                  num: '01',
                  description:
                    'A Sigma rule with a valid ATT&CK tag exists in your corpus.',
                },
                {
                  name: 'Quality',
                  num: '02',
                  description:
                    'Rule maturity, status, and parse health indicate production readiness.',
                },
                {
                  name: 'Telemetry',
                  num: '03',
                  description:
                    'Required log sources are collected and available in your SIEM.',
                },
                {
                  name: 'Deployment',
                  num: '04',
                  description:
                    'The rule is active and deployed to your detection pipeline.',
                },
                {
                  name: 'Validation',
                  num: '05',
                  description:
                    'The rule fires correctly against adversary simulation or real events.',
                },
              ].map((dim) => (
                <div key={dim.num} className="bg-warm-surface border border-border rounded-xl p-5">
                  <p className="font-mono text-xs text-copper mb-3">{dim.num}</p>
                  <h3 className="font-display font-semibold text-ivory text-base mb-2">{dim.name}</h3>
                  <p className="text-muted text-xs leading-relaxed">{dim.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Prioritise What Matters ──────────────────────────────────────── */}
      <RevealSection>
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-ivory mb-3">
              Prioritise What Matters
            </h2>
            <p className="text-muted text-lg mb-10 max-w-2xl">
              Not all gaps are equal. BLIND ranks them by exploitability, prevalence, and
              coverage deficit so you focus engineering time where it counts.
            </p>
            <div className="max-w-2xl space-y-3">
              <p className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4">
                Illustrative Demo Data
              </p>
              {DEMO_GAPS.map(gap => (
                <div
                  key={gap.id}
                  className="bg-warm-surface border border-border rounded-xl px-5 py-4 flex items-center gap-5"
                >
                  <div className="w-8 h-8 rounded-full bg-copper/20 border border-copper/40 flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs text-copper font-bold">{gap.rank}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-copper mb-0.5">{gap.id}</p>
                    <p className="text-sm text-ivory font-medium truncate">{gap.name}</p>
                    <p className="text-xs text-muted">{gap.tactic}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm text-ivory font-semibold">
                      {gap.score.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted">priority score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Offline-First Architecture ───────────────────────────────────── */}
      <RevealSection>
        <section className="py-20 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-ivory mb-3">
              Offline-First Architecture
            </h2>
            <p className="text-muted text-lg mb-10 max-w-2xl">
              Your detection posture is sensitive. BLIND is built to stay on your machine.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Cpu size={24} className="text-copper" />,
                  title: 'Local Processing',
                  description:
                    'All rule parsing, ATT&CK mapping, and coverage scoring happens locally. No data leaves your machine.',
                },
                {
                  icon: <Lock size={24} className="text-copper" />,
                  title: 'Private by Design',
                  description:
                    'No telemetry, no cloud sync, no accounts required. Your detection posture is yours alone.',
                },
                {
                  icon: <ShieldAlert size={24} className="text-copper" />,
                  title: 'Sigma Native',
                  description:
                    'Built for the Sigma detection format. Point BLIND at any directory of .yml rules and start immediately.',
                },
              ].map((feature, i) => (
                <div key={i} className="bg-warm-surface border border-border rounded-xl p-6">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="font-display font-semibold text-ivory text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <RevealSection>
        <section className="py-24 px-6 border-t border-border text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="font-display text-3xl font-semibold text-ivory mb-4">
              Ready to see your detection surface?
            </h2>
            <p className="text-muted mb-8">
              Load the demo dataset and explore the ATT&CK coverage matrix in seconds. No setup required.
            </p>
            <Button size="lg" loading={loading} onClick={handleExploreDemo}>
              Explore Demo
            </Button>
          </div>
        </section>
      </RevealSection>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-muted text-sm font-mono">
          BLIND — Detection Coverage Intelligence | © 2026 | MIT License
        </p>
      </footer>
    </div>
  )
}
