export type ParseStatus = 'PARSED' | 'PARSED_WITH_WARNINGS' | 'INVALID' | 'UNSUPPORTED' | 'DUPLICATE'
export type CoverageLevel = 'NO_MAPPED_COVERAGE' | 'LIMITED' | 'PARTIAL' | 'STRONG' | 'UNKNOWN'
export type TelemetryStatus = 'AVAILABLE' | 'PARTIAL' | 'MISSING' | 'UNKNOWN'
export type ValidationStatus = 'NOT_TESTED' | 'PLANNED' | 'TESTED' | 'PASSED' | 'FAILED' | 'INCONCLUSIVE'
export type DeploymentStatus = 'NOT_CONFIGURED' | 'PLANNED' | 'DEPLOYED' | 'DISABLED' | 'UNKNOWN'

export interface SigmaLogSource {
  category?: string
  product?: string
  service?: string
}

export interface SigmaRule {
  id: string
  file_path: string
  content_hash: string
  parse_status: ParseStatus
  parse_warnings: string[]
  title?: string
  description?: string
  author?: string
  status?: string
  date?: string
  modified?: string
  tags: string[]
  attack_technique_ids: string[]
  attack_tactic_tags: string[]
  logsource?: SigmaLogSource
  detection_condition?: string
  falsepositives: string[]
  references: string[]
  is_demo: boolean
  corpus_id?: string
  ingested_at: string
}

export interface AttackTechnique {
  id: string
  name: string
  description?: string
  tactics: string[]
  platforms: string[]
  is_subtechnique: boolean
  parent_id?: string
  subtechnique_ids: string[]
  is_deprecated: boolean
  is_revoked: boolean
  dataset_version: string
  detection_guidance?: string
}

export interface CoverageResult {
  technique_id: string
  technique_name: string
  tactics: string[]
  mapped_rule_count: number
  mapped_rule_ids: string[]
  coverage_score: number
  coverage_level: CoverageLevel
  telemetry_status: TelemetryStatus
  validation_status: ValidationStatus
  deployment_status: DeploymentStatus
  maturity_distribution: Record<string, number>
  scoring_formula: string
  computed_at: string
}

export interface PriorityFactor {
  name: string
  value: number
  weight: number
  contribution: number
  description: string
}

export interface GapAssessment {
  technique_id: string
  technique_name: string
  tactics: string[]
  priority_score: number
  priority_rank: number
  priority_factors: PriorityFactor[]
  mapped_rule_count: number
  coverage_score: number
  coverage_level: CoverageLevel
  telemetry_status: TelemetryStatus
  deployment_status: DeploymentStatus
  validation_status: ValidationStatus
  recommended_action: string
  telemetry_dependencies: string[]
}

export interface IngestionJob {
  job_id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  progress_stage: string
  progress_pct: number
  created_at: string
  summary?: IngestionSummary
}

export interface IngestionSummary {
  corpus_id: string
  files_discovered: number
  successfully_parsed: number
  parsed_with_warnings: number
  invalid_files: number
  duplicates: number
  rules_with_attack_tags: number
  total_rules: number
}

export interface CorpusSnapshot {
  snapshot_id: string
  corpus_id: string
  label: string
  attack_version: string
  rule_count: number
  technique_coverage_count: number
  mean_coverage_score: number
  content_hash: string
  created_at: string
  is_demo: boolean
}

export interface TelemetrySource {
  id: string
  name: string
  platform: string
  collection_status: TelemetryStatus
  coverage_scope?: string
  last_verified?: string
  owner?: string
  notes?: string
  is_demo: boolean
}

export interface ValidationRecord {
  id: string
  technique_id: string
  rule_id?: string
  objective: string
  required_telemetry: string[]
  prerequisites: string[]
  expected_evidence: string
  expected_detection: string
  observed_result?: string
  analyst_notes?: string
  remediation?: string
  status: ValidationStatus
  tested_at?: string
  is_synthetic: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
}

export interface HealthResponse {
  status: string
  version: string
  demo_loaded: boolean
  attack_version?: string
  rule_count?: number
}

export interface SnapshotDiff {
  added_rules: SigmaRule[]
  removed_rules: SigmaRule[]
  modified_rules: SigmaRule[]
  newly_covered_techniques: string[]
  newly_exposed_gaps: string[]
  coverage_delta_by_tactic: Record<string, number>
}
