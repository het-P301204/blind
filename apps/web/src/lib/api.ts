import axios from 'axios'
import type {
  HealthResponse,
  SigmaRule,
  AttackTechnique,
  CoverageResult,
  GapAssessment,
  IngestionJob,
  CorpusSnapshot,
  TelemetrySource,
  ValidationRecord,
  PaginatedResponse,
  SnapshotDiff,
} from '@/types/api'

const client = axios.create({ baseURL: '/api', timeout: 30000 })

client.interceptors.response.use(
  r => r,
  error => {
    console.error('API error:', error.response?.data ?? error.message)
    return Promise.reject(error)
  }
)

export default client

export const api = {
  health: () => client.get<HealthResponse>('/health'),

  // datasets
  listDatasets: () => client.get<{ datasets: string[] }>('/datasets'),

  // ingest
  startIngest: (body: { path: string; type: 'directory' | 'file' | 'demo' }) =>
    client.post<{ job_id: string }>('/ingest', body),
  getJob: (jobId: string) => client.get<IngestionJob>(`/ingest/jobs/${jobId}`),

  // rules
  listRules: (params: {
    skip?: number
    limit?: number
    search?: string
    technique_id?: string
    status?: string
    tactic?: string
    product?: string
    parse_status?: string
  }) => client.get<PaginatedResponse<SigmaRule>>('/rules', { params }),
  getRule: (id: string) => client.get<SigmaRule>(`/rules/${id}`),

  // techniques
  listTechniques: (params?: { tactic?: string; platform?: string; coverage_level?: string }) =>
    client.get<PaginatedResponse<AttackTechnique>>('/techniques', { params }),
  getTechnique: (id: string) => client.get<AttackTechnique>(`/techniques/${id}`),

  // coverage
  getCoverage: (params?: { tactic?: string }) =>
    client.get<{ data: CoverageResult[]; total: number; stats: Record<string, unknown> }>('/coverage', { params }),
  getCoverageForTechnique: (techniqueId: string) =>
    client.get<CoverageResult>(`/coverage/${techniqueId}`),

  // gaps
  listGaps: (params?: {
    min_score?: number
    tactic?: string
    skip?: number
    limit?: number
    coverage_level?: string
    telemetry_status?: string
    validation_status?: string
  }) => client.get<PaginatedResponse<GapAssessment>>('/gaps', { params }),
  recalculateGaps: (weights: Record<string, number>) =>
    client.post<PaginatedResponse<GapAssessment>>('/gaps/recalculate', { weights }),

  // telemetry
  listTelemetry: () => client.get<{ data: TelemetrySource[]; total: number }>('/telemetry'),
  upsertTelemetry: (data: Partial<TelemetrySource>) =>
    client.post<TelemetrySource>('/telemetry', data),
  deleteTelemetry: (id: string) => client.delete(`/telemetry/${id}`),

  // validation
  listValidation: () => client.get<{ data: ValidationRecord[]; total: number }>('/validation'),
  createValidation: (data: Partial<ValidationRecord>) =>
    client.post<ValidationRecord>('/validation', data),
  updateValidation: (id: string, data: Partial<ValidationRecord>) =>
    client.put<ValidationRecord>(`/validation/${id}`, data),

  // snapshots
  listSnapshots: () => client.get<{ data: CorpusSnapshot[]; total: number }>('/snapshots'),
  createSnapshot: (label: string) =>
    client.post<CorpusSnapshot>('/snapshots', { label }),
  compareSnapshots: (a: string, b: string) =>
    client.post<SnapshotDiff>('/compare', { snapshot_a: a, snapshot_b: b }),

  // export
  exportNavigator: () =>
    client.post('/export/navigator', {}, { responseType: 'blob' }),
  exportReport: (format: 'pdf' | 'json' | 'csv') =>
    client.post('/export/report', { format }, { responseType: 'blob' }),
}
