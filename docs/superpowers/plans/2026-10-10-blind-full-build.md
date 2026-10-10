# BLIND — Detection Coverage Intelligence Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build BLIND from scratch — a defensive detection coverage intelligence platform that ingests Sigma rules, maps them to MITRE ATT&CK, calculates evidence-based coverage, identifies gaps, and visualises results interactively.

**Architecture:** Engine-first: Python `blind_engine` package handles all analysis (Sigma ingestion → ATT&CK mapping → coverage scoring → gap prioritisation → exports), FastAPI exposes it as an API, React frontend consumes the API. SQLite is the local analytical database. All core logic is shared between CLI and API.

**Tech Stack:** Python 3.12+, Pydantic v2, FastAPI, Uvicorn, Typer, Rich, SQLite, PyYAML, stix2, reportlab | React 18, TypeScript, Vite, Tailwind CSS v3, Framer Motion, Lucide React, Zustand, TanStack Query, Recharts

**Spec:** Inline 54-section spec provided in conversation

## Global Constraints

- Python ≥ 3.12, Node ≥ 20
- All paths relative to `H:\CLAUDE\DAILY PROJECTS - R\blind\`
- Design palette: Obsidian `#111110`, Graphite `#191917`, Warm Surface `#22211E`, Raised Panel `#292722`, Ivory `#F0EBDD`, Muted Text `#B8B1A2`, Copper `#C47D50`, Burnt Red `#A95445`, Sage `#84937A`, Amber `#D4A65A`
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (code/data)
- Never execute imported YAML/rule content
- All coverage scores labelled as "mapped rule coverage" not "detection effectiveness"
- Demo data must be clearly labelled as synthetic
- Offline-first: no mandatory network calls during analysis

---

## Phase 1 — Python Engine

### Task 1: Data Models

**Files:**
- Create: `blind_engine/models.py`
- Test: `tests/unit/engine/test_models.py`

**Interfaces:**
- Produces: `SigmaRule`, `RuleValidationResult`, `AttackTechnique`, `AttackTactic`, `TechniqueMapping`, `CoverageResult`, `GapAssessment`, `TelemetrySource`, `ValidationRecord`, `IngestionJob`, `CorpusSnapshot`

- [ ] Write `blind_engine/models.py` with all Pydantic v2 models
- [ ] Write `tests/unit/engine/test_models.py` with serialisation round-trip tests
- [ ] Run tests; all pass
- [ ] Commit: `feat(engine): add core Pydantic data models`

### Task 2: SQLite Database Layer

**Files:**
- Create: `blind_engine/db/schema.py`
- Create: `blind_engine/db/dal.py`
- Create: `blind_engine/db/__init__.py`
- Test: `tests/unit/engine/test_db.py`

**Interfaces:**
- Consumes: models from Task 1
- Produces: `Database` class with async CRUD for all entity types

- [ ] Write schema (CREATE TABLE statements for all models)
- [ ] Write DAL with typed methods: `upsert_rule`, `get_rule`, `list_rules`, `upsert_technique`, `get_technique`, `save_coverage`, `list_gaps`, etc.
- [ ] Write tests for persistence round-trips
- [ ] Commit: `feat(db): add SQLite schema and DAL`

### Task 3: Sigma Parser

**Files:**
- Create: `blind_engine/sigma/parser.py`
- Create: `blind_engine/sigma/validator.py`
- Create: `blind_engine/sigma/__init__.py`
- Test: `tests/unit/engine/test_sigma.py`
- Fixtures: `tests/fixtures/sigma/` (valid, invalid, missing-tags, unknown-technique, duplicate-id YAMLs)

**Interfaces:**
- Produces: `parse_rule_file(path) -> SigmaRule | RuleValidationResult`, `parse_directory(path) -> IngestionSummary`

- [ ] Write safe YAML loader (no execution, size limit 1 MB)
- [ ] Extract: id, title, description, author, status, date, modified, tags, logsource, detection, falsepositives, references
- [ ] Extract ATT&CK tags from `attack.*` tag patterns
- [ ] Assign parse status: PARSED / PARSED_WITH_WARNINGS / INVALID / UNSUPPORTED / DUPLICATE
- [ ] Write validator: required fields, ID format, status enum, tag format, logsource completeness
- [ ] Write tests with all fixture types
- [ ] Commit: `feat(sigma): add Sigma YAML parser and validator`

### Task 4: ATT&CK STIX Parser

**Files:**
- Create: `blind_engine/attack/parser.py`
- Create: `blind_engine/attack/__init__.py`
- Test: `tests/unit/engine/test_attack.py`
- Demo fixture: `data/demo/attack/enterprise-attack-demo.json`

**Interfaces:**
- Produces: `load_attack_dataset(path) -> AttackDataset`, `AttackDataset.get_technique(id)`, `AttackDataset.list_techniques()`, `AttackDataset.version`

- [ ] Parse STIX bundles: extract techniques, sub-techniques, tactics, platforms, data sources, deprecation/revocation
- [ ] Build technique hierarchy (parent/sub-technique relationships)
- [ ] Handle missing fields, deprecated objects, revoked objects gracefully
- [ ] Create minimal demo STIX JSON (40-50 techniques, representative tactics)
- [ ] Write tests: valid STIX, malformed STIX, deprecated techniques, revoked objects
- [ ] Commit: `feat(attack): add ATT&CK STIX parser`

### Task 5: Technique Mapping Engine

**Files:**
- Create: `blind_engine/mapping/mapper.py`
- Create: `blind_engine/mapping/__init__.py`
- Test: `tests/unit/engine/test_mapping.py`

**Interfaces:**
- Consumes: `SigmaRule` list, `AttackDataset`
- Produces: `map_rules_to_techniques(rules, dataset) -> list[TechniqueMapping]`

- [ ] Normalise ATT&CK IDs from sigma tags (e.g. `attack.t1059.001` → `T1059.001`)
- [ ] Resolve against loaded dataset; flag unknown/deprecated IDs
- [ ] Support multiple techniques per rule, multiple rules per technique
- [ ] Produce mapping warnings for unknown/deprecated IDs
- [ ] Write tests: valid mappings, unknown IDs, deprecated IDs, sub-techniques
- [ ] Commit: `feat(mapping): add sigma-to-attack mapping engine`

### Task 6: Coverage Scoring Engine

**Files:**
- Create: `blind_engine/coverage/scorer.py`
- Create: `blind_engine/coverage/levels.py`
- Create: `blind_engine/coverage/__init__.py`
- Test: `tests/unit/engine/test_coverage.py`

**Interfaces:**
- Consumes: `list[TechniqueMapping]`, `AttackDataset`
- Produces: `calculate_coverage(mappings, dataset, config) -> list[CoverageResult]`

- [ ] Implement maturity weights: stable=1.0, test=0.75, experimental=0.50, unknown=unscored
- [ ] Formula: `C_t = 100 * (1 - exp(-lambda * sum(w_r)))` with configurable lambda
- [ ] Coverage levels: NO_MAPPED_COVERAGE (0), LIMITED (<25), PARTIAL (25-60), STRONG (>60), UNKNOWN
- [ ] Represent telemetry readiness: AVAILABLE / PARTIAL / MISSING / UNKNOWN
- [ ] Represent validation confidence: NOT_TESTED / PLANNED / TESTED / FAILED / INCONCLUSIVE
- [ ] Make formula and thresholds configurable via `CoverageConfig`
- [ ] Write tests: deterministic scoring, level classification, unknown handling
- [ ] Commit: `feat(coverage): add deterministic coverage scoring engine`

### Task 7: Gap Prioritisation Engine

**Files:**
- Create: `blind_engine/prioritization/engine.py`
- Create: `blind_engine/prioritization/__init__.py`
- Test: `tests/unit/engine/test_prioritization.py`

**Interfaces:**
- Consumes: `list[CoverageResult]`, `AttackDataset`, optional `PriorityConfig`
- Produces: `prioritize_gaps(results, dataset, config) -> list[GapAssessment]`

- [ ] Score factors: rule absence, low coverage, maturity, telemetry readiness, validation status, tactic, business criticality
- [ ] Make factor weights configurable; default weights documented
- [ ] Each gap shows: technique, priority, factors with contributions, recommended action
- [ ] Deterministic: same input + config → same output
- [ ] Never assign invented threat prevalence; mark unknown as UNKNOWN
- [ ] Write tests: ordering stability, factor contribution, unknown data handling
- [ ] Commit: `feat(prioritization): add gap prioritization engine`

### Task 8: Demo Data Generator

**Files:**
- Create: `blind_engine/ingestion/demo.py`
- Create: `data/demo/sigma_rules/` (30+ synthetic YAML rules)
- Create: `data/demo/attack/enterprise-attack-demo.json` (50 techniques)
- Test: `tests/unit/engine/test_demo.py`

**Interfaces:**
- Produces: `load_demo_data() -> DemoDataset` with pre-computed coverage, gaps, snapshots

- [ ] Generate 30+ synthetic Sigma rules across multiple tactics (execution, persistence, discovery, lateral-movement, exfiltration, etc.)
- [ ] Include: stable/test/experimental rules, rules with missing fields, duplicate ID fixture, unknown technique ID fixture
- [ ] Generate demo snapshot A and snapshot B (version comparison)
- [ ] Mark all demo data clearly as synthetic in metadata
- [ ] Build compact ATT&CK STIX demo dataset (50 techniques, 8 tactics)
- [ ] Write tests: demo loads without errors, returns expected technique count
- [ ] Commit: `feat(demo): add synthetic demo dataset`

### Task 9: Snapshot Comparison Engine

**Files:**
- Create: `blind_engine/ingestion/snapshotter.py`
- Create: `blind_engine/ingestion/__init__.py`
- Test: `tests/unit/engine/test_snapshots.py`

**Interfaces:**
- Produces: `create_snapshot(corpus_id, rules, coverage) -> CorpusSnapshot`, `compare_snapshots(a, b) -> SnapshotDiff`

- [ ] Snapshot: stable ID, content hash, timestamp, ATT&CK version, coverage summary
- [ ] Diff: added rules, removed rules, changed maturity, new mappings, removed mappings, coverage delta, newly exposed gaps
- [ ] Use content hashes for change detection
- [ ] Write tests: round-trip, diff correctness, incompatible ATT&CK version warning
- [ ] Commit: `feat(snapshots): add corpus snapshot and comparison engine`

### Task 10: Export Engine

**Files:**
- Create: `blind_engine/export/navigator.py`
- Create: `blind_engine/export/csv_exporter.py`
- Create: `blind_engine/export/json_exporter.py`
- Create: `blind_engine/export/pdf_reporter.py`
- Create: `blind_engine/export/__init__.py`
- Test: `tests/unit/engine/test_exports.py`

**Interfaces:**
- Produces: `export_navigator(coverage, dataset) -> dict`, `export_csv(gaps) -> str`, `export_json(analysis) -> dict`, `export_pdf(analysis) -> bytes`

- [ ] Navigator export: valid schema, ATT&CK version, technique IDs, coverage scores, comments distinguishing mapped vs empirical coverage
- [ ] CSV: gap rankings with technique, score, factors, rule count
- [ ] JSON: full normalized analysis with scoring metadata and provenance
- [ ] PDF: executive summary, methodology, top gaps, recommendations using reportlab
- [ ] Write tests: navigator schema validity, CSV parsability, JSON completeness
- [ ] Commit: `feat(export): add Navigator, CSV, JSON, PDF exporters`

---

## Phase 2 — FastAPI Backend + CLI

### Task 11: FastAPI Application

**Files:**
- Create: `apps/api/main.py`
- Create: `apps/api/routes/health.py`
- Create: `apps/api/routes/ingest.py`
- Create: `apps/api/routes/rules.py`
- Create: `apps/api/routes/techniques.py`
- Create: `apps/api/routes/coverage.py`
- Create: `apps/api/routes/gaps.py`
- Create: `apps/api/routes/telemetry.py`
- Create: `apps/api/routes/validation.py`
- Create: `apps/api/routes/snapshots.py`
- Create: `apps/api/routes/export.py`
- Create: `apps/api/services/analysis.py`
- Create: `apps/api/__init__.py`
- Test: `tests/api/test_endpoints.py`

**Interfaces:**
- Consumes: all blind_engine modules
- Produces: REST API with all endpoints from spec section 34

- [ ] Health: `GET /api/health`, `GET /api/version`
- [ ] Datasets: `GET /api/datasets`
- [ ] Ingest: `POST /api/ingest`, `GET /api/ingest/jobs/{job_id}` (background tasks)
- [ ] Rules: `GET /api/rules` (paginated, filtered), `GET /api/rules/{rule_id}`
- [ ] Techniques: `GET /api/techniques` (paginated), `GET /api/techniques/{technique_id}`
- [ ] Coverage: `GET /api/coverage`
- [ ] Gaps: `GET /api/gaps` (sorted, filtered)
- [ ] Telemetry: `GET /api/telemetry`, `POST /api/telemetry`
- [ ] Validation: `GET /api/validation`, `POST /api/validation`
- [ ] Snapshots: `GET /api/snapshots`, `POST /api/snapshots`, `POST /api/compare`
- [ ] Export: `POST /api/export/navigator`, `POST /api/export/report`
- [ ] Pagination, filtering, schema validation on all list endpoints
- [ ] CORS restricted to localhost, secure headers, file size limits, path traversal prevention
- [ ] OpenAPI docs at `/docs`
- [ ] Write integration tests for all endpoints
- [ ] Commit: `feat(api): add complete FastAPI backend`

### Task 12: CLI

**Files:**
- Create: `blind_engine/cli/main.py`
- Create: `blind_engine/cli/__init__.py`
- Test: `tests/unit/engine/test_cli.py`

**Interfaces:**
- Consumes: all blind_engine modules
- Produces: `blind` CLI with all commands from spec section 33

- [ ] `blind --help`, `blind version`
- [ ] `blind init` — initialise local database
- [ ] `blind demo load` — load demo data
- [ ] `blind serve [--port]` — start FastAPI server
- [ ] `blind scan <path>` — scan directory of Sigma rules
- [ ] `blind validate <path>` — validate rules only
- [ ] `blind map --attack <path>` — load ATT&CK dataset
- [ ] `blind analyze` — run full analysis on current corpus
- [ ] `blind gaps [--minimum-score N]` — list gaps
- [ ] `blind compare <snapshot-a> <snapshot-b>` — diff snapshots
- [ ] `blind export navigator [--output path]`
- [ ] `blind report [--format pdf|json|csv]`
- [ ] Rich tables for human output; `--json` flag for machine output; exit codes; progress bars
- [ ] Write tests for each command
- [ ] Commit: `feat(cli): add Typer CLI with all commands`

---

## Phase 3 — React Frontend

### Task 13: Vite + TypeScript + Tailwind Setup

**Files:**
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/index.html`
- Create: `apps/web/src/styles/globals.css`
- Create: `apps/web/src/types/api.ts`

- [ ] Configure Vite with React plugin, path aliases (`@/` → `src/`)
- [ ] Configure Tailwind with custom design tokens (all palette colours as CSS vars)
- [ ] Set up Google Fonts: Space Grotesk, Inter, JetBrains Mono
- [ ] Define all colour tokens, typography scale, spacing
- [ ] Define TypeScript API response types matching backend schemas
- [ ] Commit: `chore(web): setup Vite, Tailwind, TypeScript`

### Task 14: Design System Components

**Files:**
- Create: `apps/web/src/components/ui/Button.tsx`
- Create: `apps/web/src/components/ui/Badge.tsx`
- Create: `apps/web/src/components/ui/StatusIndicator.tsx`
- Create: `apps/web/src/components/ui/MetricPanel.tsx`
- Create: `apps/web/src/components/ui/DataTable.tsx`
- Create: `apps/web/src/components/ui/FilterBar.tsx`
- Create: `apps/web/src/components/ui/SearchInput.tsx`
- Create: `apps/web/src/components/ui/Drawer.tsx`
- Create: `apps/web/src/components/ui/Modal.tsx`
- Create: `apps/web/src/components/ui/Tooltip.tsx`
- Create: `apps/web/src/components/ui/Tabs.tsx`
- Create: `apps/web/src/components/ui/EmptyState.tsx`
- Create: `apps/web/src/components/ui/LoadingState.tsx`
- Create: `apps/web/src/components/ui/ErrorState.tsx`
- Create: `apps/web/src/components/ui/index.ts`
- Test: `tests/unit/components/ui.test.tsx`

- [ ] All components use design tokens (no hardcoded hex)
- [ ] StatusIndicator: never colour-only; always icon + text
- [ ] Rounded corners per spec: panels 20-26px, cards 14-20px, buttons 10-14px
- [ ] Framer Motion variants for all interactive states
- [ ] Accessible: ARIA labels, keyboard nav, visible focus rings
- [ ] Write tests for render and interactions
- [ ] Commit: `feat(web): add design system component library`

### Task 15: App Shell, Routing, and Sidebar

**Files:**
- Create: `apps/web/src/app/App.tsx`
- Create: `apps/web/src/app/Router.tsx`
- Create: `apps/web/src/components/layout/Sidebar.tsx`
- Create: `apps/web/src/components/layout/TopBar.tsx`
- Create: `apps/web/src/components/layout/AppShell.tsx`
- Create: `apps/web/src/lib/api.ts` (Axios client + TanStack Query config)
- Create: `apps/web/src/lib/store.ts` (Zustand global state)

- [ ] React Router with all route definitions
- [ ] Sidebar: Overview, Analysis, Validation, Intelligence, Reporting, System sections
- [ ] Active dataset version + ingestion status in sidebar footer
- [ ] TopBar: global search trigger, dark theme only
- [ ] Zustand store: current corpus, active technique, filter state
- [ ] Axios client pointed at `/api` with error handling
- [ ] TanStack Query provider with retry/cache config
- [ ] Commit: `feat(web): add app shell, routing, and sidebar`

### Task 16: Command Palette

**Files:**
- Create: `apps/web/src/components/CommandPalette.tsx`
- Create: `apps/web/src/hooks/useCommandPalette.ts`

- [ ] `Cmd/Ctrl+K` to open
- [ ] Actions: Search Technique, Search Rule, Open Matrix, Open Gap Explorer, Start Ingestion, Compare Snapshots, Generate Report, Export Navigator, Toggle Documentation
- [ ] Keyboard navigation: up/down arrows, Enter to execute, Escape to close
- [ ] Search across techniques, rules, tactics, findings
- [ ] Clear empty state
- [ ] Commit: `feat(web): add global command palette`

### Task 17: Landing Page

**Files:**
- Create: `apps/web/src/features/landing/LandingPage.tsx`
- Create: `apps/web/src/features/landing/MiniMatrix.tsx`
- Create: `apps/web/src/features/landing/sections/`

- [ ] Hero: BLIND logotype, tagline "See your detection surface.", "Explore Demo" + "Analyse Local Rules" CTAs
- [ ] Mini interactive ATT&CK matrix (demo cells, clearly labelled as illustrative)
- [ ] Sections: detection coverage problem, Sigma mapping, matrix preview, coverage vs telemetry vs validation, prioritisation, validation workflow, offline-first, export/reporting
- [ ] Footer with GitHub link placeholder, docs link
- [ ] No blue/navy backgrounds; warm obsidian palette
- [ ] Framer Motion scroll-triggered section reveals
- [ ] Commit: `feat(web): add landing page`

### Task 18: Dashboard

**Files:**
- Create: `apps/web/src/features/dashboard/DashboardPage.tsx`
- Create: `apps/web/src/features/dashboard/MetricsRow.tsx`
- Create: `apps/web/src/features/dashboard/CoverageOverview.tsx`
- Create: `apps/web/src/features/dashboard/TopGapsWidget.tsx`
- Create: `apps/web/src/features/dashboard/IngestionHealth.tsx`

- [ ] Metrics: rules ingested, valid, ATT&CK-mapped, techniques with/without rules, awaiting validation
- [ ] Coverage by tactic bar chart (Recharts, warm palette)
- [ ] Top-5 priority gaps list
- [ ] Ingestion health + last analysis timestamp
- [ ] Filters: platform, tactic, rule status, maturity, validation status
- [ ] All numbers from API, not hardcoded
- [ ] Commit: `feat(web): add analytics dashboard`

### Task 19: Interactive ATT&CK Matrix

**Files:**
- Create: `apps/web/src/features/matrix/MatrixPage.tsx`
- Create: `apps/web/src/features/matrix/MatrixGrid.tsx`
- Create: `apps/web/src/features/matrix/TechniqueCell.tsx`
- Create: `apps/web/src/features/matrix/TechniqueDetailsPanel.tsx`
- Create: `apps/web/src/features/matrix/MatrixLegend.tsx`
- Create: `apps/web/src/features/matrix/MatrixFilters.tsx`

- [ ] Tactics as columns, techniques as rows/cells, loaded from ATT&CK dataset
- [ ] Colour cells by coverage level: none (graphite), limited (amber-dim), partial (amber), strong (copper) — never colour-only, always show text score
- [ ] Sub-technique expansion toggle per technique
- [ ] Filters: tactic, platform, coverage level, rule maturity, validation status
- [ ] Search by ID or name (highlights matching cells)
- [ ] Keyboard navigation (arrow keys, Enter to open details, Escape to close)
- [ ] Accessible table/list alternative view
- [ ] Details panel (slide-in): technique ID/name/tactics/platforms, coverage score, rule count, maturity distribution, telemetry, validation, prioritisation factors, rules list, references, defensive recs
- [ ] Legend explaining all coverage states
- [ ] Framer Motion cell transitions on filter change
- [ ] Commit: `feat(web): add interactive ATT&CK coverage matrix`

### Task 20: Rule Explorer

**Files:**
- Create: `apps/web/src/features/rules/RulesPage.tsx`
- Create: `apps/web/src/features/rules/RuleCard.tsx`
- Create: `apps/web/src/features/rules/RuleDetailDrawer.tsx`
- Create: `apps/web/src/features/rules/RuleFilters.tsx`

- [ ] Virtualised table (TanStack Virtual) for thousands of rules
- [ ] Search: full-text across title, ID, description
- [ ] Filters: technique, tactic, product, log source, status, maturity, validation status
- [ ] Sort: title, ID, modified date, maturity
- [ ] Rule detail drawer: ID, title, description, tags, ATT&CK IDs, log source, detection structure (syntax-highlighted), validation warnings
- [ ] Copy rule ID / copy ATT&CK IDs buttons with clipboard feedback
- [ ] Detection logic displayed as data, never executed
- [ ] Commit: `feat(web): add rule explorer`

### Task 21: Gap Explorer

**Files:**
- Create: `apps/web/src/features/gaps/GapsPage.tsx`
- Create: `apps/web/src/features/gaps/GapCard.tsx`
- Create: `apps/web/src/features/gaps/GapDetailDrawer.tsx`
- Create: `apps/web/src/features/gaps/GapFilters.tsx`

- [ ] Sortable table: technique, tactic, rule count, coverage score, telemetry readiness, deployment, validation, priority, priority explanation, recommended action
- [ ] Filter: no mapped rules, low coverage, unknown telemetry, undeployed, untested, failed validation
- [ ] Group by: tactic, telemetry requirement
- [ ] Detail drawer with full gap assessment
- [ ] CSV export button
- [ ] Priority threshold slider
- [ ] Commit: `feat(web): add gap explorer`

### Task 22: Prioritisation Workspace

**Files:**
- Create: `apps/web/src/features/prioritization/PrioritizationPage.tsx`
- Create: `apps/web/src/features/prioritization/WeightEditor.tsx`
- Create: `apps/web/src/features/prioritization/PriorityResults.tsx`

- [ ] Formula display showing factor weights and their contributions
- [ ] Adjustable weight sliders for: coverage gap, telemetry readiness, deployment confidence, validation confidence, business criticality, threat relevance
- [ ] Real-time recalculation via API call
- [ ] Compare two configurations side-by-side
- [ ] Export ranked result as CSV/JSON
- [ ] Unknown data clearly labelled as UNKNOWN (not filled with maximums)
- [ ] Commit: `feat(web): add prioritisation workspace`

### Task 23: Telemetry Inventory

**Files:**
- Create: `apps/web/src/features/telemetry/TelemetryPage.tsx`
- Create: `apps/web/src/features/telemetry/TelemetryEditor.tsx`

- [ ] Table of data sources: source name, platform, collection status, availability, scope, last verified, owner, notes
- [ ] Status: AVAILABLE / PARTIAL / MISSING / UNKNOWN — never infer availability from rule references
- [ ] Inline editable rows
- [ ] Import from JSON/CSV
- [ ] Commit: `feat(web): add telemetry inventory`

### Task 24: Validation Lab

**Files:**
- Create: `apps/web/src/features/validation/ValidationPage.tsx`
- Create: `apps/web/src/features/validation/TestPlanBuilder.tsx`
- Create: `apps/web/src/features/validation/ValidationRegistry.tsx`

- [ ] Select technique → select rule → generate test plan
- [ ] Test plan: objective, required telemetry, prerequisites, expected evidence, expected detection, observed result, analyst notes, remediation
- [ ] Built-in synthetic scenarios (clearly labelled)
- [ ] Deployment registry: rule ID, SIEM, deployment status, enabled state, last verified
- [ ] Validation status registry with timestamps and provenance
- [ ] Commit: `feat(web): add validation lab`

### Task 25: Technique Context + Corpus Explorer

**Files:**
- Create: `apps/web/src/features/context/TechniqueContextPage.tsx`
- Create: `apps/web/src/features/context/CorpusExplorerPage.tsx`
- Create: `apps/web/src/features/context/ChangeAnalysisPage.tsx`

- [ ] Technique context: overview, tactics, platforms, mapped rules, telemetry deps, detection limitations, validation recommendations, references, evidence confidence
- [ ] Corpus explorer: browse/search all ingested rules by any field
- [ ] Change analysis: select two snapshots → diff view (added/removed/modified rules, coverage deltas)
- [ ] Commit: `feat(web): add technique context and corpus explorer`

### Task 26: Reports + Export Pages

**Files:**
- Create: `apps/web/src/features/reports/ReportsPage.tsx`
- Create: `apps/web/src/features/reports/ExportPanel.tsx`

- [ ] PDF report generation with progress indicator
- [ ] Navigator layer export with schema validation feedback
- [ ] JSON / CSV export with filter state applied
- [ ] Download button with filename suggestion
- [ ] Error state if export fails with explanation
- [ ] Commit: `feat(web): add reports and export pages`

### Task 27: Data Sources + Import History + Settings

**Files:**
- Create: `apps/web/src/features/settings/DataSourcesPage.tsx`
- Create: `apps/web/src/features/settings/ImportHistoryPage.tsx`
- Create: `apps/web/src/features/settings/SettingsPage.tsx`

- [ ] Data sources: current Sigma corpus version, ATT&CK version, last ingestion, ingestion job history
- [ ] Import flow: drop folder / single file → ingestion progress stages → summary
- [ ] Ingestion progress: DISCOVERING FILES → PARSING RULES → VALIDATING METADATA → RESOLVING ATT&CK IDS → CALCULATING COVERAGE → BUILDING REPORT
- [ ] Settings: coverage config (lambda, thresholds), priority weights, theme
- [ ] Commit: `feat(web): add data sources, import history, settings`

### Task 28: Onboarding Flow

**Files:**
- Create: `apps/web/src/features/onboarding/OnboardingFlow.tsx`

- [ ] 6-step modal on first launch: what BLIND measures, demo offer, mapped coverage, telemetry, validation, local data ingestion
- [ ] Skip button to go straight to demo
- [ ] Store onboarding-complete in localStorage
- [ ] Commit: `feat(web): add onboarding flow`

### Task 29: Branding — Logo + Favicon + Icons

**Files:**
- Create: `apps/web/public/favicon.svg`
- Create: `apps/web/public/favicon.ico`
- Create: `apps/web/public/apple-touch-icon.png`
- Create: `apps/web/src/components/brand/Logo.tsx`
- Create: `apps/web/src/components/brand/LoadingMark.tsx`
- Create: `apps/web/src/components/brand/icons.tsx` (custom domain icons)

- [ ] Logo concept: signal with absence — partial visibility motif in Copper/Ivory
- [ ] SVG favicon legible at 16×16 and 32×32
- [ ] Manifest entries for PWA icons
- [ ] Custom SVG icons: ATT&CK Technique, Tactic, Sigma Rule, Coverage, Detection Gap, Telemetry, Validation, Evidence, Priority, Data Source, Export, Corpus
- [ ] Lucide icons for navigation/controls
- [ ] Commit: `feat(brand): add logo, favicon, and domain icon set`

---

## Phase 4 — Tests + CI

### Task 30: Integration Tests

**Files:**
- Create: `tests/integration/test_full_pipeline.py`
- Create: `tests/integration/test_api_contracts.py`

- [ ] Full pipeline: load demo → parse → map → score → gaps → export
- [ ] API contracts: all endpoints return expected shapes
- [ ] Malformed input handling
- [ ] Commit: `test: add integration tests`

### Task 31: E2E Tests (Playwright)

**Files:**
- Create: `tests/e2e/test_user_journey.py`

- [ ] Launch → Explore Demo → Open Matrix → Select Technique → Inspect Rules → Gap Explorer → Generate Report → Export Navigator
- [ ] Commit: `test: add Playwright E2E tests`

### Task 32: CI/CD

**Files:**
- Create: `.github/workflows/python.yml`
- Create: `.github/workflows/frontend.yml`
- Create: `.github/workflows/e2e.yml`

- [ ] Python: lint (ruff), type check (mypy), tests (pytest with coverage)
- [ ] Frontend: lint (eslint), type check (tsc), tests (vitest)
- [ ] E2E: playwright on built app
- [ ] Dependency audit
- [ ] Commit: `ci: add GitHub Actions workflows`

### Task 33: Documentation + README

**Files:**
- Create: `README.md`
- Create: `SECURITY.md`
- Create: `LICENSE`
- Create: `.env.example`
- Create: `Makefile`

- [ ] README: what BLIND does, problem, data inputs, outputs, quick start, coverage methodology, what it does NOT claim
- [ ] Makefile targets: install, dev, test, build, lint
- [ ] Commit: `docs: add README, SECURITY, LICENSE, Makefile`
