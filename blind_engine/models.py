"""BLIND data models — all Pydantic v2 with aliases and computed properties."""
from __future__ import annotations

import math
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, computed_field, model_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ParseStatus(str, Enum):
    PARSED = "PARSED"
    PARSED_WITH_WARNINGS = "PARSED_WITH_WARNINGS"
    INVALID = "INVALID"
    UNSUPPORTED = "UNSUPPORTED"
    DUPLICATE = "DUPLICATE"


class RuleStatus(str, Enum):
    STABLE = "stable"
    TEST = "test"
    EXPERIMENTAL = "experimental"
    DEPRECATED = "deprecated"
    UNSUPPORTED = "unsupported"


class TelemetryStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    PARTIAL = "PARTIAL"
    MISSING = "MISSING"
    UNKNOWN = "UNKNOWN"


class ValidationStatus(str, Enum):
    NOT_TESTED = "NOT_TESTED"
    PLANNED = "PLANNED"
    TESTED = "TESTED"
    PASSED = "PASSED"
    FAILED = "FAILED"
    INCONCLUSIVE = "INCONCLUSIVE"


class DeploymentStatus(str, Enum):
    NOT_CONFIGURED = "NOT_CONFIGURED"
    PLANNED = "PLANNED"
    DEPLOYED = "DEPLOYED"
    DISABLED = "DISABLED"
    UNKNOWN = "UNKNOWN"


class CoverageLevel(str, Enum):
    NO_MAPPED_COVERAGE = "NO_MAPPED_COVERAGE"
    LIMITED = "LIMITED"
    PARTIAL = "PARTIAL"
    STRONG = "STRONG"
    UNKNOWN = "UNKNOWN"


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


# ---------------------------------------------------------------------------
# Log source
# ---------------------------------------------------------------------------

class SigmaLogSource(BaseModel):
    model_config = {"populate_by_name": True}

    category: Optional[str] = None
    product: Optional[str] = None
    service: Optional[str] = None
    definition: Optional[str] = None


# Alias for parser convenience
LogSource = SigmaLogSource


# ---------------------------------------------------------------------------
# SigmaRule
# ---------------------------------------------------------------------------

_MATURITY_WEIGHTS: dict[str, float] = {
    "stable": 1.0,
    "test": 0.75,
    "experimental": 0.50,
    "deprecated": 0.25,
    "unsupported": 0.25,
    "unknown": 0.25,
}


class SigmaRule(BaseModel):
    model_config = {"populate_by_name": True}

    id: str
    file_path: Optional[str] = Field(default=None)
    source_path: Optional[str] = Field(default=None, exclude=True)  # alias → file_path
    content_hash: Optional[str] = None
    parse_status: Optional[ParseStatus] = ParseStatus.PARSED
    parse_warnings: list[str] = Field(default_factory=list)
    parse_errors: list[str] = Field(default_factory=list)   # alias for parse_warnings
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None
    date: Optional[str] = None
    created_at: Optional[str] = None  # alias for date
    modified: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    attack_technique_ids: list[str] = Field(default_factory=list)
    technique_ids: Optional[list[str]] = Field(default=None, exclude=True)  # alias
    attack_tactic_tags: list[str] = Field(default_factory=list)
    tactic_tags: Optional[list[str]] = Field(default=None, exclude=True)    # alias
    logsource: Optional[SigmaLogSource] = None
    detection_condition: Optional[str] = None
    detection: Optional[str] = Field(default=None, exclude=True)  # alias
    falsepositives: list[str] = Field(default_factory=list)
    references: list[str] = Field(default_factory=list)
    related: list[str] = Field(default_factory=list)
    is_demo: bool = False
    corpus_id: Optional[str] = None
    ingested_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode="after")
    def _apply_aliases(self) -> "SigmaRule":
        # source_path → file_path
        if self.file_path is None and self.source_path is not None:
            self.file_path = self.source_path
        # technique_ids → attack_technique_ids
        if self.technique_ids is not None and not self.attack_technique_ids:
            self.attack_technique_ids = self.technique_ids
        # tactic_tags → attack_tactic_tags
        if self.tactic_tags is not None and not self.attack_tactic_tags:
            self.attack_tactic_tags = self.tactic_tags
        # detection → detection_condition
        if self.detection is not None and self.detection_condition is None:
            self.detection_condition = self.detection
        # parse_errors → parse_warnings (they are the same field)
        if self.parse_errors and not self.parse_warnings:
            self.parse_warnings = self.parse_errors
        elif self.parse_warnings and not self.parse_errors:
            self.parse_errors = self.parse_warnings
        return self

    @property
    def maturity_weight(self) -> float:
        s = (self.status or "unknown").lower()
        return _MATURITY_WEIGHTS.get(s, 0.25)


# ---------------------------------------------------------------------------
# ATT&CK Dataset
# ---------------------------------------------------------------------------

class AttackDataSource(BaseModel):
    name: str
    component: Optional[str] = None


class AttackTechnique(BaseModel):
    model_config = {"populate_by_name": True}

    id: Optional[str] = Field(default=None)
    technique_id_alias: Optional[str] = Field(default=None, alias="technique_id", exclude=True)
    name: str
    description: Optional[str] = None
    tactics: list[str] = Field(default_factory=list)
    tactic_short_names_alias: Optional[list[str]] = Field(default=None, alias="tactic_short_names", exclude=True)
    platforms: list[str] = Field(default_factory=list)
    data_sources: list[AttackDataSource] = Field(default_factory=list)
    is_subtechnique: bool = False
    parent_id: Optional[str] = None
    subtechnique_ids: list[str] = Field(default_factory=list)
    is_deprecated: bool = False
    is_revoked: bool = False
    external_references: list[str] = Field(default_factory=list)
    dataset_version: str = "unknown"
    detection_guidance: Optional[str] = None
    detection_alias: Optional[str] = Field(default=None, alias="detection", exclude=True)
    external_url: Optional[str] = None
    stix_id: Optional[str] = None

    @model_validator(mode="after")
    def _apply_aliases(self) -> "AttackTechnique":
        # technique_id kwarg → id
        if self.id is None and self.technique_id_alias is not None:
            self.id = self.technique_id_alias
        # tactic_short_names → tactics
        if self.tactic_short_names_alias is not None and not self.tactics:
            self.tactics = self.tactic_short_names_alias
        # detection → detection_guidance
        if self.detection_alias is not None and self.detection_guidance is None:
            self.detection_guidance = self.detection_alias
        return self

    @property
    def technique_id(self) -> Optional[str]:
        return self.id

    @property
    def tactic_ids(self) -> list[str]:
        return self.tactics


class AttackTactic(BaseModel):
    model_config = {"populate_by_name": True}

    id: Optional[str] = Field(default=None)
    tactic_id_alias: Optional[str] = Field(default=None, alias="tactic_id", exclude=True)
    name: str
    short_name: str = ""
    description: Optional[str] = None
    technique_ids: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _apply_aliases(self) -> "AttackTactic":
        if self.id is None and self.tactic_id_alias is not None:
            self.id = self.tactic_id_alias
        return self

    @property
    def tactic_id(self) -> Optional[str]:
        return self.id


class AttackDataset(BaseModel):
    version: str = "unknown"
    techniques: dict[str, AttackTechnique] = Field(default_factory=dict)
    tactics: dict[str, AttackTactic] = Field(default_factory=dict)
    tactics_by_short_name: dict[str, AttackTactic] = Field(default_factory=dict)
    loaded_at: datetime = Field(default_factory=datetime.utcnow)
    source_path: Optional[str] = None

    def get_technique(self, tech_id: str) -> Optional[AttackTechnique]:
        return self.techniques.get(tech_id)

    def list_techniques(self) -> list[AttackTechnique]:
        return list(self.techniques.values())


# ---------------------------------------------------------------------------
# Technique Mapping
# ---------------------------------------------------------------------------

class TechniqueMapping(BaseModel):
    model_config = {"populate_by_name": True}

    technique_id: str
    rule_ids: list[str] = Field(default_factory=list)
    is_explicit: bool = True
    warnings: list[str] = Field(default_factory=list)
    mapping_warnings_alias: Optional[list[str]] = Field(default=None, alias="mapping_warnings", exclude=True)
    is_unknown: bool = False

    @model_validator(mode="after")
    def _apply_aliases(self) -> "TechniqueMapping":
        if self.mapping_warnings_alias is not None and not self.warnings:
            self.warnings = self.mapping_warnings_alias
        return self

    @property
    def mapping_warnings(self) -> list[str]:
        return self.warnings


# ---------------------------------------------------------------------------
# Coverage
# ---------------------------------------------------------------------------

class CoverageConfig(BaseModel):
    maturity_weights: dict[str, float] = Field(default_factory=lambda: {
        "stable": 1.0,
        "test": 0.75,
        "experimental": 0.50,
        "deprecated": 0.25,
        "unsupported": 0.25,
        "unknown": 0.25,
    })
    lambda_factor: float = 0.3
    thresholds: dict[str, float] = Field(default_factory=lambda: {
        "limited": 25.0,
        "partial": 60.0,
    })

    @property
    def lambda_(self) -> float:
        return self.lambda_factor


class CoverageResult(BaseModel):
    model_config = {"populate_by_name": True}

    technique_id: str
    technique_name: str
    tactics: list[str] = Field(default_factory=list)
    tactic_ids_alias: Optional[list[str]] = Field(default=None, alias="tactic_ids", exclude=True)
    mapped_rule_count: int = 0
    rule_count_alias: Optional[int] = Field(default=None, alias="rule_count", exclude=True)
    mapped_rule_ids: list[str] = Field(default_factory=list)
    rule_ids_alias: Optional[list[str]] = Field(default=None, alias="rule_ids", exclude=True)
    coverage_score: float = 0.0
    coverage_level: CoverageLevel = CoverageLevel.UNKNOWN
    telemetry_status: TelemetryStatus = TelemetryStatus.UNKNOWN
    validation_status: ValidationStatus = ValidationStatus.NOT_TESTED
    deployment_status: DeploymentStatus = DeploymentStatus.UNKNOWN
    maturity_distribution: dict[str, int] = Field(default_factory=dict)
    scoring_formula: str = ""
    computed_at: datetime = Field(default_factory=datetime.utcnow)

    @model_validator(mode="after")
    def _apply_aliases(self) -> "CoverageResult":
        if self.tactic_ids_alias is not None and not self.tactics:
            self.tactics = self.tactic_ids_alias
        if self.rule_count_alias is not None and self.mapped_rule_count == 0:
            self.mapped_rule_count = self.rule_count_alias
        if self.rule_ids_alias is not None and not self.mapped_rule_ids:
            self.mapped_rule_ids = self.rule_ids_alias
        return self

    @property
    def rule_count(self) -> int:
        return self.mapped_rule_count

    @property
    def rule_ids(self) -> list[str]:
        return self.mapped_rule_ids

    @property
    def tactic_ids(self) -> list[str]:
        return self.tactics


# ---------------------------------------------------------------------------
# Gaps
# ---------------------------------------------------------------------------

class PriorityFactor(BaseModel):
    name: str
    value: float = 0.0
    weight: float = 1.0
    contribution: float = 0.0
    description: str = ""


class GapAssessment(BaseModel):
    model_config = {"populate_by_name": True}

    technique_id: str
    technique_name: str
    tactics: list[str] = Field(default_factory=list)
    tactic_ids_alias: Optional[list[str]] = Field(default=None, alias="tactic_ids", exclude=True)
    priority_score: float = 0.0
    priority_rank: int = 0
    priority_factors: list[PriorityFactor] = Field(default_factory=list)
    mapped_rule_count: int = 0
    coverage_score: float = 0.0
    coverage_level: CoverageLevel = CoverageLevel.UNKNOWN
    telemetry_status: TelemetryStatus = TelemetryStatus.UNKNOWN
    deployment_status: DeploymentStatus = DeploymentStatus.UNKNOWN
    validation_status: ValidationStatus = ValidationStatus.NOT_TESTED
    recommended_action: str = ""
    telemetry_dependencies: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _apply_aliases(self) -> "GapAssessment":
        if self.tactic_ids_alias is not None and not self.tactics:
            self.tactics = self.tactic_ids_alias
        return self

    @property
    def tactic_ids(self) -> list[str]:
        return self.tactics


# ---------------------------------------------------------------------------
# Telemetry + Deployment + Validation
# ---------------------------------------------------------------------------

class TelemetrySource(BaseModel):
    id: str = Field(..., max_length=200)
    name: str = Field(..., max_length=200)
    platform: str = Field("unknown", max_length=100)
    collection_status: TelemetryStatus = TelemetryStatus.UNKNOWN
    coverage_scope: Optional[str] = Field(None, max_length=500)
    last_verified: Optional[datetime] = None
    owner: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=5000)
    is_demo: bool = False


class DeploymentRecord(BaseModel):
    id: str
    rule_id: str
    siem_target: Optional[str] = None
    deployment_status: DeploymentStatus = DeploymentStatus.UNKNOWN
    enabled: bool = False
    last_verified: Optional[datetime] = None
    validation_status: ValidationStatus = ValidationStatus.NOT_TESTED
    last_tested: Optional[datetime] = None
    test_result: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None


class ValidationRecord(BaseModel):
    id: str = Field(..., max_length=200)
    technique_id: str = Field(..., max_length=50)
    rule_id: Optional[str] = Field(None, max_length=200)
    objective: str = Field("", max_length=5000)
    required_telemetry: list[str] = Field(default_factory=list)
    prerequisites: list[str] = Field(default_factory=list)
    expected_evidence: str = Field("", max_length=5000)
    expected_detection: str = Field("", max_length=5000)
    observed_result: Optional[str] = Field(None, max_length=5000)
    analyst_notes: Optional[str] = Field(None, max_length=5000)
    remediation: Optional[str] = Field(None, max_length=5000)
    status: ValidationStatus = ValidationStatus.NOT_TESTED
    tested_at: Optional[datetime] = None
    is_synthetic: bool = True

    @property
    def validation_status(self) -> ValidationStatus:
        return self.status


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

class IngestionSummary(BaseModel):
    model_config = {"populate_by_name": True}

    corpus_id: str
    files_discovered: int = 0
    total_files_alias: Optional[int] = Field(default=None, alias="total_files", exclude=True)
    successfully_parsed: int = 0
    parsed_alias: Optional[int] = Field(default=None, alias="parsed", exclude=True)
    parsed_with_warnings: int = 0
    invalid_files: int = 0
    invalid_alias: Optional[int] = Field(default=None, alias="invalid", exclude=True)
    duplicates: int = 0
    duplicate_alias: Optional[int] = Field(default=None, alias="duplicate", exclude=True)
    rules_with_attack_tags: int = 0
    total_rules: int = 0
    technique_ids_found: list[str] = Field(default_factory=list)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    errors: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def _apply_aliases(self) -> "IngestionSummary":
        if self.total_files_alias is not None and self.files_discovered == 0:
            self.files_discovered = self.total_files_alias
        if self.parsed_alias is not None and self.successfully_parsed == 0:
            self.successfully_parsed = self.parsed_alias
        if self.invalid_alias is not None and self.invalid_files == 0:
            self.invalid_files = self.invalid_alias
        if self.duplicate_alias is not None and self.duplicates == 0:
            self.duplicates = self.duplicate_alias
        return self

    @property
    def valid_rules(self) -> int:
        return self.successfully_parsed + self.parsed_with_warnings

    @property
    def rules_with_warnings(self) -> int:
        return self.parsed_with_warnings

    @property
    def invalid_rules(self) -> int:
        return self.invalid_files


class IngestionJob(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.QUEUED
    summary: Optional[IngestionSummary] = None
    progress_stage: str = ""
    progress_pct: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Snapshots
# ---------------------------------------------------------------------------

class CorpusSnapshot(BaseModel):
    snapshot_id: str
    corpus_id: str
    label: str = ""
    attack_version: str = "unknown"
    rule_count: int = 0
    technique_coverage_count: int = 0
    mean_coverage_score: float = 0.0
    content_hash: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_demo: bool = False


class SnapshotDiff(BaseModel):
    snapshot_a_id: str
    snapshot_b_id: str
    added_rule_ids: list[str] = Field(default_factory=list)
    removed_rule_ids: list[str] = Field(default_factory=list)
    modified_rule_ids: list[str] = Field(default_factory=list)
    new_technique_mappings: list[str] = Field(default_factory=list)
    removed_technique_mappings: list[str] = Field(default_factory=list)
    newly_covered_techniques: list[str] = Field(default_factory=list)
    newly_gapped_techniques: list[str] = Field(default_factory=list)
    coverage_delta: float = 0.0
    attack_version_compatible: bool = True


# ---------------------------------------------------------------------------
# Priority
# ---------------------------------------------------------------------------

class PriorityConfig(BaseModel):
    coverage_gap_weight: float = 1.0
    telemetry_readiness_weight: float = 0.8
    deployment_confidence_weight: float = 0.6
    validation_confidence_weight: float = 0.7
    business_criticality_weight: float = 0.5
    threat_relevance_weight: float = 0.4

    @property
    def weights(self) -> dict[str, float]:
        return {
            "coverage_gap": self.coverage_gap_weight,
            "telemetry_readiness": self.telemetry_readiness_weight,
            "deployment_confidence": self.deployment_confidence_weight,
            "validation_confidence": self.validation_confidence_weight,
            "business_criticality": self.business_criticality_weight,
            "threat_relevance": self.threat_relevance_weight,
        }


# ---------------------------------------------------------------------------
# Rule validation result (alias kept for imports)
# ---------------------------------------------------------------------------

class RuleValidationResult(BaseModel):
    rule_id: str
    file_path: Optional[str] = None
    status: ParseStatus = ParseStatus.PARSED
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Export artefact
# ---------------------------------------------------------------------------

class ExportArtifact(BaseModel):
    artifact_id: str
    format: str  # "navigator" | "pdf" | "json" | "csv"
    corpus_id: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Demo dataset bundle
# ---------------------------------------------------------------------------

class DemoDataset(BaseModel):
    rules: list[SigmaRule] = Field(default_factory=list)
    attack_dataset: AttackDataset = Field(default_factory=AttackDataset)
    coverage: list[CoverageResult] = Field(default_factory=list)
    gaps: list[GapAssessment] = Field(default_factory=list)
    snapshot_a: Optional[CorpusSnapshot] = None
    snapshot_b: Optional[CorpusSnapshot] = None
