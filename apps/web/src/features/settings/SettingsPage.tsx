import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

// â”€â”€â”€ Types & Defaults â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SETTINGS_KEY = 'blind_settings'

interface CoverageThresholds {
  limited: number
  partial: number
  strong: number
}

interface PriorityWeights {
  coverageGap: number
  telemetryReadiness: number
  deploymentConfidence: number
  validationConfidence: number
  businessCriticality: number
  threatRelevance: number
}

interface DisplayOptions {
  showDeprecated: boolean
  showSubtechniques: boolean
  compactMatrix: boolean
}

interface Settings {
  lambdaFactor: number
  thresholds: CoverageThresholds
  weights: PriorityWeights
  display: DisplayOptions
}

const DEFAULT_SETTINGS: Settings = {
  lambdaFactor: 0.3,
  thresholds: {
    limited: 0.2,
    partial: 0.5,
    strong: 0.8,
  },
  weights: {
    coverageGap: 1.0,
    telemetryReadiness: 1.0,
    deploymentConfidence: 1.0,
    validationConfidence: 1.0,
    businessCriticality: 1.0,
    threatRelevance: 1.0,
  },
  display: {
    showDeprecated: false,
    showSubtechniques: false,
    compactMatrix: false,
  },
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      lambdaFactor: parsed.lambdaFactor ?? DEFAULT_SETTINGS.lambdaFactor,
      thresholds: { ...DEFAULT_SETTINGS.thresholds, ...parsed.thresholds },
      weights: { ...DEFAULT_SETTINGS.weights, ...parsed.weights },
      display: { ...DEFAULT_SETTINGS.display, ...parsed.display },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// â”€â”€â”€ Section Wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-warm-surface border border-border rounded-xl p-6 space-y-5">
      <h2 className="font-display font-semibold text-ivory text-sm border-b border-border pb-3">
        {title}
      </h2>
      {children}
    </section>
  )
}

// â”€â”€â”€ Slider Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SliderRowProps {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  formatValue?: (v: number) => string
}

function SliderRow({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: SliderRowProps) {
  const display = formatValue ? formatValue(value) : value.toFixed(2)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-ivory">{label}</span>
          {description && (
            <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>
        <span className="font-mono text-sm text-copper shrink-0 ml-4">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className={cn(
          'w-full h-1.5 rounded-full appearance-none cursor-pointer',
          'bg-graphite',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-copper',
          '[&::-webkit-slider-thumb]:cursor-pointer',
          '[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-copper',
          '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer'
        )}
      />
    </div>
  )
}

// â”€â”€â”€ Number Input Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ThresholdRowProps {
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}

function ThresholdRow({ label, description, value, onChange }: ThresholdRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm text-ivory">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <input
        type="number"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={e => {
          const parsed = parseFloat(e.target.value)
          if (!isNaN(parsed)) onChange(Math.min(1, Math.max(0, parsed)))
        }}
        className="w-20 bg-obsidian border border-border rounded-lg px-3 py-1.5 text-sm text-ivory font-mono text-right focus:outline-none focus:border-copper/60 transition-colors"
      />
    </div>
  )
}

// â”€â”€â”€ Toggle Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer group">
      <div className="flex-1">
        <p className="text-sm text-ivory group-hover:text-ivory transition-colors">{label}</p>
        {description && (
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent',
          'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-copper/50 mt-0.5',
          checked ? 'bg-copper' : 'bg-graphite'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-ivory shadow-sm',
            'transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </label>
  )
}

// â”€â”€â”€ Settings Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  function handleSave() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    }
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS)
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))
    } catch {
      // ignore
    }
    toast.success('Reset to defaults')
  }

  function setLambda(v: number) {
    setSettings(s => ({ ...s, lambdaFactor: v }))
  }
  function setThreshold(key: keyof CoverageThresholds, v: number) {
    setSettings(s => ({ ...s, thresholds: { ...s.thresholds, [key]: v } }))
  }
  function setWeight(key: keyof PriorityWeights, v: number) {
    setSettings(s => ({ ...s, weights: { ...s.weights, [key]: v } }))
  }
  function setDisplay(key: keyof DisplayOptions, v: boolean) {
    setSettings(s => ({ ...s, display: { ...s.display, [key]: v } }))
  }

  const WEIGHT_LABELS: { key: keyof PriorityWeights; label: string; description: string }[] = [
    {
      key: 'coverageGap',
      label: 'Coverage Gap',
      description: 'Weight for techniques with low or no rule coverage',
    },
    {
      key: 'telemetryReadiness',
      label: 'Telemetry Readiness',
      description: 'Weight for techniques missing required log sources',
    },
    {
      key: 'deploymentConfidence',
      label: 'Deployment Confidence',
      description: 'Weight for rules that are not yet deployed',
    },
    {
      key: 'validationConfidence',
      label: 'Validation Confidence',
      description: 'Weight for rules lacking empirical test evidence',
    },
    {
      key: 'businessCriticality',
      label: 'Business Criticality',
      description: 'Weight for techniques targeting business-critical assets',
    },
    {
      key: 'threatRelevance',
      label: 'Threat Relevance',
      description: 'Weight for techniques seen in recent threat intelligence',
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <h1 className="font-display font-semibold text-ivory text-lg">Settings</h1>
        <p className="text-xs text-muted mt-0.5">
          Configure scoring, weights, and display preferences
        </p>
      </div>

      <div className="flex-1 p-6 space-y-5 max-w-2xl">
        {/* â”€â”€ Coverage Configuration â”€â”€ */}
        <Section title="Coverage Configuration">
          <SliderRow
            label="Lambda Factor (Î»)"
            description="Decay coefficient applied to coverage scores. Higher values penalise rule count over quality."
            value={settings.lambdaFactor}
            min={0.1}
            max={1.0}
            step={0.05}
            onChange={setLambda}
            formatValue={v => v.toFixed(2)}
          />

          <div className="pt-2 space-y-4">
            <p className="text-xs text-muted uppercase tracking-wider font-medium">
              Coverage level thresholds
            </p>
            <ThresholdRow
              label="Limited threshold"
              description="Scores below this value are classified as Limited coverage"
              value={settings.thresholds.limited}
              onChange={v => setThreshold('limited', v)}
            />
            <ThresholdRow
              label="Partial threshold"
              description="Scores between Limited and Partial thresholds are classified as Partial"
              value={settings.thresholds.partial}
              onChange={v => setThreshold('partial', v)}
            />
            <ThresholdRow
              label="Strong threshold"
              description="Scores above this value are classified as Strong coverage"
              value={settings.thresholds.strong}
              onChange={v => setThreshold('strong', v)}
            />
          </div>
        </Section>

        {/* â”€â”€ Priority Weights â”€â”€ */}
        <Section title="Priority Weights">
          <p className="text-xs text-muted -mt-2 leading-relaxed">
            Adjust the relative importance of each factor when computing gap priority scores.
            Range: 0 (ignored) to 2 (double weight).
          </p>
          <div className="space-y-5">
            {WEIGHT_LABELS.map(({ key, label, description }) => (
              <SliderRow
                key={key}
                label={label}
                description={description}
                value={settings.weights[key]}
                min={0}
                max={2}
                step={0.1}
                onChange={v => setWeight(key, v)}
                formatValue={v => v.toFixed(1)}
              />
            ))}
          </div>
        </Section>

        {/* â”€â”€ Display â”€â”€ */}
        <Section title="Display">
          <div className="space-y-4">
            <ToggleRow
              label="Show deprecated techniques"
              description="Include ATT&CK techniques marked as deprecated in matrix and gap views"
              checked={settings.display.showDeprecated}
              onChange={v => setDisplay('showDeprecated', v)}
            />
            <ToggleRow
              label="Show sub-techniques by default"
              description="Expand sub-techniques automatically in the ATT&CK matrix view"
              checked={settings.display.showSubtechniques}
              onChange={v => setDisplay('showSubtechniques', v)}
            />
            <ToggleRow
              label="Compact matrix view"
              description="Reduce cell size in the ATT&CK matrix to fit more techniques on screen"
              checked={settings.display.compactMatrix}
              onChange={v => setDisplay('compactMatrix', v)}
            />
          </div>
        </Section>

        {/* â”€â”€ Actions â”€â”€ */}
        <div className="flex items-center gap-3 pt-1 pb-8">
          <Button onClick={handleSave} className="min-w-[100px] justify-center">
            Save Settings
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
