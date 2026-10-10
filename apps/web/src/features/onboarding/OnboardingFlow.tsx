import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'blind_onboarding_complete'

function useOnboardingComplete() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return true
  }
}

function markComplete() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // ignore
  }
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1() {
  return (
    <div className="space-y-4">
      <div className="font-display text-4xl font-bold text-ivory">BLIND</div>
      <p className="text-muted text-sm leading-relaxed">
        BLIND measures your actual detection surface — not just rule count.
      </p>
      <div className="space-y-2 mt-4">
        {[
          'Maps Sigma rules to ATT&CK techniques via attack.technique tags',
          'Scores true detection confidence across 5 dimensions',
          'Prioritizes your coverage gaps by threat relevance',
        ].map((point, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-copper mt-1.5 flex-shrink-0" />
            <span className="text-sm text-ivory">{point}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Step2({ onLoadDemo }: { onLoadDemo: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Start with our curated demo dataset to see BLIND in action — no setup required.
      </p>
      <div className="bg-raised-panel border border-border rounded-card p-4 text-sm text-muted space-y-1.5">
        <div>250+ Sigma rules mapped to ATT&CK</div>
        <div>14 tactics covered</div>
        <div>Coverage scored across all dimensions</div>
        <div>Priority gaps pre-ranked</div>
      </div>
      <Button variant="primary" onClick={onLoadDemo} className="w-full">
        Load Demo Data
      </Button>
    </div>
  )
}

function Step3() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-xs bg-graphite border border-border text-muted px-2 py-1 rounded">sigma_rule.yml</span>
        <span className="text-muted">→</span>
        <span className="font-mono text-xs bg-copper/20 text-copper border border-copper/30 px-2 py-1 rounded">T1059.001</span>
        <span className="text-muted">→</span>
        <span className="text-xs text-ivory">PowerShell</span>
        <span className="text-muted">→</span>
        <span className="text-xs text-muted">Execution</span>
      </div>
      <p className="text-sm text-muted leading-relaxed">
        BLIND maps each Sigma rule's <span className="font-mono text-xs text-copper">attack.technique</span> tags
        to ATT&CK technique IDs, then groups them by tactic.
      </p>
      <div className="bg-amber/10 border border-amber/30 rounded-card px-3 py-2 text-xs text-amber">
        Coverage scores reflect rule presence and quality — not empirical detection effectiveness.
        A rule without telemetry or deployment is not the same as a working detection.
      </div>
    </div>
  )
}

function Step4() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        A rule without the right telemetry source cannot fire — even if perfectly written.
      </p>
      <div className="bg-raised-panel border border-border rounded-card p-4 font-mono text-xs space-y-1.5 text-muted">
        <div><span className="text-copper">proc_creation</span> rules require:</div>
        <div className="pl-3 text-ivory">Windows Security Event 4688, or</div>
        <div className="pl-3 text-ivory">Sysmon Event ID 1</div>
      </div>
      <p className="text-sm text-muted leading-relaxed">
        BLIND flags telemetry dependencies in your coverage assessment, so you know
        which log sources to enable before your rules can be effective.
      </p>
    </div>
  )
}

function Step5() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Rules need empirical testing to confirm they detect what they claim.
      </p>
      <div className="flex flex-col gap-1.5">
        {['Not Tested', 'Planned', 'Tested', 'Passed', 'Failed', 'Inconclusive'].map((status, i) => (
          <div key={status} className="flex items-center gap-2.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: ['#333330', '#6B5F25', '#6B5F25', '#84937A', '#A95445', '#4A4036'][i],
              }}
            />
            <span className="text-xs text-ivory">{status}</span>
          </div>
        ))}
      </div>
      <div className="bg-burnt-red/10 border border-burnt-red/30 rounded-card px-3 py-2 text-xs text-burnt-red">
        Untested rules are <strong>not</strong> the same as working detections.
        BLIND tracks validation status so you see your real confidence level.
      </div>
    </div>
  )
}

function Step6({ onImport }: { onImport: () => void }) {
  const [path, setPath] = useState('')
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Point BLIND at your Sigma rule directory to analyse your real coverage.
      </p>
      <div>
        <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide">
          Path to Sigma rules
        </label>
        <input
          type="text"
          value={path}
          onChange={e => setPath(e.target.value)}
          placeholder="/opt/sigma/rules or C:\sigma\rules"
          className="w-full h-9 px-3 text-sm bg-graphite border border-border rounded-input text-ivory placeholder-muted/50 focus:outline-none focus:border-copper"
        />
      </div>
      <Button variant="primary" onClick={onImport} className="w-full">
        Start Import
      </Button>
    </div>
  )
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-200"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background: i < current ? '#C47D50' : i === current ? '#C47D50' : '#333330',
          }}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(useOnboardingComplete)
  const navigate = useNavigate()

  function handleSkip() {
    markComplete()
    setDone(true)
  }

  function handleNext() {
    if (step < 5) setStep(s => s + 1)
    else {
      markComplete()
      setDone(true)
      navigate('/dashboard')
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  async function handleLoadDemo() {
    try {
      await api.startIngest({ path: '', type: 'demo' })
      toast.success('Demo data loading…')
      markComplete()
      setDone(true)
      navigate('/dashboard')
    } catch {
      toast.error('Failed to load demo data')
    }
  }

  function handleImport() {
    markComplete()
    setDone(true)
    navigate('/data-sources')
  }

  if (done) return null

  const steps: { title: string; content: React.ReactNode }[] = [
    { title: 'Welcome to BLIND', content: <Step1 /> },
    { title: 'Explore the Demo', content: <Step2 onLoadDemo={handleLoadDemo} /> },
    { title: 'Mapped Rule Coverage', content: <Step3 /> },
    { title: 'Telemetry Readiness', content: <Step4 /> },
    { title: 'Validation Confidence', content: <Step5 /> },
    { title: 'Import Your Rules', content: <Step6 onImport={handleImport} /> },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(17,17,16,0.85)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          key="onboarding-panel"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-graphite border border-border rounded-panel w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            <ProgressDots total={steps.length} current={step} />
            <button
              onClick={handleSkip}
              className="text-xs text-muted hover:text-ivory transition-colors flex items-center gap-1"
            >
              Skip <X size={12} />
            </button>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="px-6 py-5"
            >
              <h2 className="font-display text-xl font-semibold text-ivory mb-4">
                {current.title}
              </h2>
              {current.content}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="px-6 pb-5 flex items-center justify-between border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={step === 0}
              className={step === 0 ? 'invisible' : ''}
            >
              <ArrowLeft size={14} className="mr-1" />
              Back
            </Button>

            {step !== 1 && (
              <Button variant="primary" size="sm" onClick={handleNext}>
                {isLast ? 'Get Started' : 'Next'}
                {!isLast && <ArrowRight size={14} className="ml-1" />}
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
