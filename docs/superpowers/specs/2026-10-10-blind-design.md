# BLIND — Detection Coverage & Evasion Intelligence
## Design Specification
**Date:** 2026-10-10  
**Status:** Approved for implementation  
**Tagline:** See the gaps. Strengthen the signal.

---

## 1. Product Overview

BLIND is a local-first, full-stack detection coverage intelligence platform. It ingests Sigma detection rules, maps them to MITRE ATT&CK Enterprise techniques, computes coverage scores, identifies analytical blind spots, and helps authorized security teams prioritize detection engineering and purple-team validation.

BLIND does NOT:
- Claim that a Sigma rule proves a production SIEM deployment can detect an attack
- Send uploaded data to third-party services
- Execute detection logic or auto-deploy to SIEMs
- Fabricate threat statistics or campaign frequencies

---

## 2. Technology Stack

### Frontend
| Concern | Choice |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Tables | TanStack Table v8 |
| Components | Radix UI primitives |
| Validation | Zod |
| Global state | Zustand |
| Server state | TanStack Query v5 |
| Fonts | Google Fonts: Manrope, Inter, IBM Plex Mono |

### Backend
| Concern | Choice |
|---|---|
| Framework | FastAPI |
| Validation | Pydantic v2 |
| Sigma parsing | pySigma (`sigma-core`) |
| YAML | PyYAML (safe_load only) |
| ATT&CK data | Bundled STIX JSON → SQLite index |
| Database | SQLite via `sqlite3` stdlib + `aiosqlite` |
| File uploads | python-multipart |
| Archive handling | zipfile stdlib (with traversal protection) |
| Testing | Pytest + httpx |

### Dev tooling
- Node 20+, Python 3.11+
- pnpm (frontend), pip + venv (backend)
- Vitest + React Testing Library (frontend tests)
- ESLint + Prettier (frontend)
- Ruff + mypy (backend)

---

## 3. Repository Structure

```
blind/
├── frontend/
│   ├── src/
│   │   ├── app/                    # Router, providers, layout
│   │   ├── components/             # Shared UI primitives
│   │   │   ├── ui/                 # Base components (Button, Card, Badge, etc.)
│   │   │   ├── charts/             # Recharts wrappers
│   │   │   ├── layout/             # Sidebar, TopBar, PageShell
│   │   │   └── motion/             # Shared animation wrappers
│   │   ├── features/
│   │   │   ├── dashboard/          # Overview page
│   │   │   ├── matrix/             # ATT&CK coverage matrix
│   │   │   ├── rules/              # Detection rules explorer
│   │   │   ├── gaps/               # Coverage gap intelligence
│   │   │   ├── telemetry/          # Telemetry intelligence
│   │   │   ├── imports/            # Import center
│   │   │   ├── reports/            # Reports & exports
│   │   │   ├── history/            # Scan history & comparison
│   │   │   ├── settings/           # Settings
│   │   │   └── onboarding/         # Welcome screen
│   │   ├── hooks/                  # Shared custom hooks
│   │   ├── lib/
│   │   │   ├── api.ts              # API client (TanStack Query)
│   │   │   ├── store.ts            # Zustand stores
│   │   │   └── utils.ts
│   │   ├── styles/                 # Global CSS, design tokens
│   │   └── types/                  # Shared TypeScript types
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── health.py
│   │   │       ├── datasets.py
│   │   │       ├── imports.py
│   │   │       ├── rules.py
│   │   │       ├── techniques.py
│   │   │       ├── coverage.py
│   │   │       ├── gaps.py
│   │   │       ├── telemetry.py
│   │   │       ├── analyses.py
│   │   │       └── exports.py
│   │   ├── core/
│   │   │   ├── config.py           # Settings, paths, limits
│   │   │   └── database.py         # SQLite connection, migrations
│   │   ├── models/                 # SQLite table schemas
│   │   ├── schemas/                # Pydantic request/response models
│   │   ├── services/
│   │   │   ├── sigma_parser.py     # pySigma rule ingestion
│   │   │   ├── attack_mapper.py    # STIX → SQLite indexing, ID normalization
│   │   │   ├── coverage_engine.py  # Weighted rule scoring
│   │   │   ├── gap_ranker.py       # Priority scoring
│   │   │   ├── navigator_export.py # ATT&CK Navigator JSON
│   │   │   └── report_service.py   # CSV/JSON/HTML exports
│   │   └── main.py
│   ├── data/
│   │   ├── enterprise-attack.json  # Bundled STIX v14 (~15MB, gitignored from LFS or included)
│   │   └── demo/                   # Synthetic Sigma YAML fixtures
│   │       ├── rules/              # ~40 representative demo rules
│   │       └── demo_manifest.json
│   ├── tests/
│   ├── requirements.txt
│   └── requirements-dev.txt
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-10-10-blind-design.md
├── scripts/
│   ├── setup.sh
│   └── setup.ps1
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Design System — Chromatic Intelligence

### Color Tokens
```css
/* Backgrounds — NO orange, grey, or blue */
--bg-primary:     #FAF7F0   /* Warm ivory — main page background */
--bg-secondary:   #F2ECF8   /* Pale lilac — secondary surfaces */
--bg-mint:        #E7F3E8   /* Soft mint — success surfaces */
--bg-rose:        #F8E5EA   /* Muted rose — gap/warning surfaces */
--bg-lilac:       #EDE4F7   /* Lilac — highlight surfaces */
--bg-butter:      #F5EBCB   /* Butter — info surfaces */
--bg-ink:         #292032   /* Dark ink — sidebar, dark surfaces */

/* Text */
--text-primary:   #28202D
--text-secondary: #665C6C
--text-on-dark:   #FFF9F1

/* Accents */
--accent-violet:  #7650B8   /* Primary — selections, CTAs */
--accent-green:   #24784E   /* Success, mapped coverage */
--accent-rose:    #C04468   /* Warnings, gaps */
--accent-plum:    #4D2B6E   /* Dark accent */

/* Coverage semantics */
--cov-none:       #F8E5EA   /* No rules mapped */
--cov-limited:    #EDE4F7   /* 1 rule */
--cov-moderate:   #D4C9F0   /* 2-3 rules */
--cov-good:       #C8E8CC   /* 4+ rules */
--cov-strong:     #24784E   /* 6+ rules, stable */
```

### Typography
- **Display/Headings**: Manrope (700, 600)
- **Body/UI**: Inter (400, 500)
- **Monospace/IDs**: IBM Plex Mono (400, 500)

### Geometry
- Main panels: `rounded-3xl` (24px)
- Cards: `rounded-2xl` (16-20px)
- Inputs/buttons: `rounded-xl` (12-14px)
- Chips: `rounded-full`
- Spacing: 8px base grid

### Motion
- Standard transitions: 150–250ms ease-out
- Page transitions: 300ms
- Matrix stagger: 30ms per tactic column
- Entrance animations use `initial/animate/exit` with Framer Motion
- All animations respect `prefers-reduced-motion`

---

## 5. Application Pages

| # | Page | Route | Description |
|---|---|---|---|
| 1 | Welcome/Onboarding | `/welcome` | Brand intro, demo mode entry, import CTA |
| 2 | Overview Dashboard | `/` | KPIs, charts, recent activity, priority findings |
| 3 | ATT&CK Coverage Matrix | `/matrix` | Interactive tactic grid with drill-down |
| 4 | Detection Rules | `/rules` | TanStack Table with search, filters, raw YAML drawer |
| 5 | Coverage Gaps | `/gaps` | Ranked gap list with transparent scoring |
| 6 | Telemetry Intelligence | `/telemetry` | Log source analysis, env config |
| 7 | Import Center | `/imports` | Drag-drop upload, progress, results |
| 8 | Reports & Exports | `/reports` | Navigator JSON, CSV, HTML report exports |
| 9 | Scan History | `/history` | Prior runs, side-by-side comparison |
| 10 | Settings | `/settings` | Theme, scoring weights, data sources, storage |
| 11 | Technique Detail | (drawer/modal) | Rich panel from matrix or gap click |

---

## 6. Data Model (SQLite)

### Tables

**`datasets`** — imported rule sets
```sql
id TEXT PRIMARY KEY,
name TEXT,
source_type TEXT,      -- 'upload' | 'demo' | 'directory'
source_hash TEXT,
rule_count INTEGER,
parsed_count INTEGER,
warn_count INTEGER,
error_count INTEGER,
attack_version TEXT,
imported_at TEXT,
is_demo INTEGER DEFAULT 0
```

**`rules`** — parsed Sigma rules
```sql
id TEXT PRIMARY KEY,        -- rule UUID from YAML
dataset_id TEXT,
title TEXT,
description TEXT,
status TEXT,               -- stable | test | experimental | unsupported
level TEXT,                -- critical | high | medium | low | informational
author TEXT,
logsource_category TEXT,
logsource_product TEXT,
logsource_service TEXT,
detection_summary TEXT,    -- human-readable condition summary
filename TEXT,
source_path TEXT,
content_hash TEXT,
raw_yaml TEXT,
parse_warnings TEXT,       -- JSON array
created_at TEXT
```

**`rule_techniques`** — many-to-many
```sql
rule_id TEXT,
technique_id TEXT,         -- normalized ATT&CK ID (e.g. T1059.001)
tactic TEXT,               -- mitre-attack tactic slug
source TEXT,               -- 'tag' | 'inferred'
PRIMARY KEY (rule_id, technique_id)
```

**`techniques`** — ATT&CK index (built from STIX)
```sql
technique_id TEXT PRIMARY KEY,
name TEXT,
description TEXT,
tactic_ids TEXT,           -- JSON array
platforms TEXT,            -- JSON array
data_sources TEXT,         -- JSON array
is_subtechnique INTEGER,
parent_id TEXT,
is_deprecated INTEGER,
is_revoked INTEGER,
external_url TEXT,
stix_id TEXT
```

**`tactics`**
```sql
tactic_id TEXT PRIMARY KEY,  -- e.g. 'TA0001'
name TEXT,
short_name TEXT,             -- e.g. 'initial-access'
description TEXT,
order_index INTEGER
```

**`analyses`** — coverage analysis runs
```sql
id TEXT PRIMARY KEY,
dataset_id TEXT,
attack_version TEXT,
scoring_config TEXT,       -- JSON scoring weights
rule_count INTEGER,
mapped_technique_count INTEGER,
unmapped_technique_count INTEGER,
coverage_summary TEXT,     -- JSON
created_at TEXT
```

**`scan_history`** — for comparison
```sql
id TEXT PRIMARY KEY,
analysis_id TEXT,
snapshot TEXT,             -- JSON full snapshot for diff
created_at TEXT
```

---

## 7. Backend API (v1)

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health + ATT&CK load status |
| GET | `/api/v1/datasets` | List datasets |
| POST | `/api/v1/imports` | Upload Sigma ZIP/YAML, start parse |
| GET | `/api/v1/imports/{id}` | Import job status + results |
| GET | `/api/v1/rules` | Paginated rule list with filters |
| GET | `/api/v1/rules/{id}` | Single rule detail + raw YAML |
| GET | `/api/v1/techniques` | ATT&CK technique list with coverage |
| GET | `/api/v1/techniques/{id}` | Technique detail + mapped rules |
| GET | `/api/v1/coverage/summary` | Dashboard KPIs |
| GET | `/api/v1/coverage/matrix` | Full tactic/technique matrix data |
| GET | `/api/v1/gaps` | Ranked coverage gaps |
| GET | `/api/v1/telemetry` | Log source analysis |
| GET | `/api/v1/analyses` | Analysis history list |
| POST | `/api/v1/analyses` | Trigger new analysis for dataset |
| GET | `/api/v1/analyses/{id}` | Analysis details |
| GET | `/api/v1/analyses/{id}/compare` | Diff two analyses |
| POST | `/api/v1/exports/navigator` | Download Navigator JSON layer |
| POST | `/api/v1/exports/report` | Download report (CSV/JSON/HTML) |

### Security constraints
- Upload size limit: 50MB
- Max files per ZIP: 5,000
- ZIP traversal protection: resolve all paths against a temp dir, reject `../` escapes
- YAML: `yaml.safe_load` only, never `yaml.load`
- No shell execution from import content
- CORS: `localhost:5173` in dev; configurable for prod

---

## 8. Coverage Scoring Engine

### Maturity weights (configurable in Settings)
| Status | Default Weight |
|---|---|
| stable | 1.00 |
| test | 0.75 |
| experimental | 0.50 |
| unsupported / unknown | 0.25 |

### Per-technique score
```
weighted_score = Σ weight(rule.status) for distinct eligible mapped rules
rule_count = count of distinct mapped rules
coverage_band = none | limited | moderate | good | strong
```

Coverage bands:
- `none`: 0 rules
- `limited`: weighted_score < 1.0
- `moderate`: 1.0 ≤ score < 2.5
- `good`: 2.5 ≤ score < 5.0
- `strong`: score ≥ 5.0

**Caveat displayed throughout the UI:** A coverage score reflects rule-mapping density, not validated operational detection capability.

---

## 9. Gap Prioritization Engine

### Factors (all configurable)
| Factor | Source | Default weight |
|---|---|---|
| Rule absence | Coverage engine | 40% |
| Telemetry gap | Configured env | 30% |
| Technique prevalence | ATT&CK data source metadata | 20% (neutral if no TI loaded) |
| Rule maturity | Rule status | 10% |

Gap record includes:
- Priority score (0–100)
- Priority band (critical / high / medium / low)
- Human-readable reasoning sentences
- Missing factors labeled explicitly
- Suggested next defensive validation step

---

## 10. Demo Data

~40 synthetic Sigma YAML rules covering:
- 8 ATT&CK tactics
- ~25 techniques including sub-techniques
- 6 log source types (windows/security, windows/sysmon, linux/auditd, proxy, dns, process_creation)
- Mix of stable/test/experimental status
- Some rules with missing or incomplete metadata
- Parsing warning examples
- At least 10 techniques with zero rule mappings (intentional gaps)

Demo data is always clearly labeled with a `DEMO DATA` banner. Switching to an imported dataset removes the banner.

---

## 11. Import Flow

1. User drops ZIP or selects directory/files in Import Center
2. Frontend sends multipart POST to `/api/v1/imports`
3. Backend validates: size limit, file count, path traversal check
4. Creates import job record, returns `{id, status: "queued"}`
5. FastAPI BackgroundTask processes the import:
   - Extracts to isolated temp dir
   - Iterates YAML files, parses each with pySigma
   - Extracts metadata, normalizes ATT&CK IDs against technique index
   - Stores rules + rule_techniques in SQLite
   - Updates job progress (stages: validating → extracting → parsing → mapping → complete)
6. Frontend polls `/api/v1/imports/{id}` every 1.5s while status != terminal
7. On complete: shows summary (parsed, skipped, warnings, errors)
8. User clicks "View Analysis" → triggers POST `/api/v1/analyses`

---

## 12. ATT&CK Matrix Visualization

- Columns = tactics (ordered by ATT&CK tactic order)
- Rows within column = techniques + sub-techniques
- Each cell shows: technique ID, short name, rule count badge
- Cell background color = coverage band color token
- Selecting a cell opens Technique Detail drawer (slides in from right)
- Filters: tactic, coverage band, platform, log source, rule status
- Search: technique ID or name
- List view alternative: TanStack Table with same filters
- Keyboard navigable (arrow keys within matrix, Enter to open detail)

---

## 13. Accessibility

- WCAG 2.2 AA target
- All icon buttons have `aria-label`
- Matrix cells are keyboard navigable with role="button"
- Coverage colors supplemented by text labels and count badges
- `prefers-reduced-motion`: all Framer Motion animations wrapped with `useReducedMotion()` check
- Sufficient contrast ratios verified for all color token pairs
- Semantic HTML throughout (nav, main, section, article, aside)
- Focus rings visible on all interactive elements

---

## 14. Testing Plan

### Backend (Pytest)
- Sigma parsing: valid YAML, invalid YAML, missing tags, malformed detection
- ATT&CK ID extraction and normalization
- ZIP traversal attack rejection
- Upload size limit enforcement
- Coverage score determinism with known inputs
- Navigator JSON schema validation
- Gap ranking with complete and missing factors
- Database persistence across restarts
- All API endpoints: happy path + error cases

### Frontend (Vitest + RTL)
- Dashboard renders with demo data
- Matrix renders correct tactic count
- Technique detail opens and closes
- Import flow validation states
- Filter chips update results
- Search debounce works
- Export button triggers download

---

## 15. Known Limitations (to document)

1. Coverage score = rule-mapping density, NOT validated operational detection
2. pySigma may not parse every community rule variant perfectly; malformed rules are skipped with warnings
3. ATT&CK data is the bundled snapshot version; update requires replacing the STIX file
4. No live SIEM integration — BLIND is an analysis tool only
5. Threat-intelligence enrichment requires separate user-provided TI data (not included in MVP)
6. Gap priority "prevalence" factor defaults to neutral (0.5) when no TI data is loaded
