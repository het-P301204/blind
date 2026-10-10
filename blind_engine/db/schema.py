"""SQLite schema definitions for the BLIND platform."""
import sqlite3


def create_tables(conn: sqlite3.Connection) -> None:
    """Create all BLIND platform tables if they do not already exist."""
    conn.executescript("""
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS sigma_rules (
            id                   TEXT PRIMARY KEY,
            file_path            TEXT NOT NULL,
            content_hash         TEXT NOT NULL,
            parse_status         TEXT NOT NULL,
            parse_warnings       TEXT NOT NULL DEFAULT '[]',
            title                TEXT,
            description          TEXT,
            author               TEXT,
            status               TEXT,
            date                 TEXT,
            modified             TEXT,
            tags                 TEXT NOT NULL DEFAULT '[]',
            attack_technique_ids TEXT NOT NULL DEFAULT '[]',
            attack_tactic_tags   TEXT NOT NULL DEFAULT '[]',
            logsource            TEXT,
            detection_condition  TEXT,
            falsepositives       TEXT NOT NULL DEFAULT '[]',
            rule_references      TEXT NOT NULL DEFAULT '[]',
            related              TEXT NOT NULL DEFAULT '[]',
            is_demo              INTEGER NOT NULL DEFAULT 0,
            corpus_id            TEXT,
            ingested_at          TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_sigma_rules_corpus
            ON sigma_rules (corpus_id);

        CREATE INDEX IF NOT EXISTS idx_sigma_rules_parse_status
            ON sigma_rules (parse_status);

        CREATE INDEX IF NOT EXISTS idx_sigma_rules_status
            ON sigma_rules (status);

        CREATE TABLE IF NOT EXISTS attack_techniques (
            id                  TEXT PRIMARY KEY,
            name                TEXT NOT NULL,
            description         TEXT,
            tactics             TEXT NOT NULL DEFAULT '[]',
            platforms           TEXT NOT NULL DEFAULT '[]',
            data_sources        TEXT NOT NULL DEFAULT '[]',
            is_subtechnique     INTEGER NOT NULL DEFAULT 0,
            parent_id           TEXT,
            subtechnique_ids    TEXT NOT NULL DEFAULT '[]',
            is_deprecated       INTEGER NOT NULL DEFAULT 0,
            is_revoked          INTEGER NOT NULL DEFAULT 0,
            external_references TEXT NOT NULL DEFAULT '[]',
            dataset_version     TEXT NOT NULL DEFAULT 'unknown',
            detection_guidance  TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_attack_techniques_parent
            ON attack_techniques (parent_id);

        CREATE TABLE IF NOT EXISTS attack_tactics (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            short_name  TEXT NOT NULL,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS technique_mappings (
            technique_id     TEXT PRIMARY KEY,
            rule_ids         TEXT NOT NULL DEFAULT '[]',
            is_explicit      INTEGER NOT NULL DEFAULT 1,
            mapping_warnings TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS coverage_results (
            technique_id         TEXT NOT NULL,
            corpus_id            TEXT NOT NULL,
            technique_name       TEXT NOT NULL,
            tactics              TEXT NOT NULL DEFAULT '[]',
            mapped_rule_count    INTEGER NOT NULL DEFAULT 0,
            mapped_rule_ids      TEXT NOT NULL DEFAULT '[]',
            coverage_score       REAL NOT NULL DEFAULT 0.0,
            coverage_level       TEXT NOT NULL DEFAULT 'UNKNOWN',
            telemetry_status     TEXT NOT NULL DEFAULT 'UNKNOWN',
            validation_status    TEXT NOT NULL DEFAULT 'NOT_TESTED',
            deployment_status    TEXT NOT NULL DEFAULT 'UNKNOWN',
            maturity_distribution TEXT NOT NULL DEFAULT '{}',
            scoring_formula      TEXT NOT NULL DEFAULT '',
            computed_at          TEXT NOT NULL,
            PRIMARY KEY (technique_id, corpus_id)
        );

        CREATE INDEX IF NOT EXISTS idx_coverage_corpus
            ON coverage_results (corpus_id);

        CREATE TABLE IF NOT EXISTS gap_assessments (
            technique_id          TEXT NOT NULL,
            corpus_id             TEXT NOT NULL,
            technique_name        TEXT NOT NULL,
            tactics               TEXT NOT NULL DEFAULT '[]',
            priority_score        REAL NOT NULL DEFAULT 0.0,
            priority_rank         INTEGER NOT NULL DEFAULT 0,
            priority_factors      TEXT NOT NULL DEFAULT '[]',
            mapped_rule_count     INTEGER NOT NULL DEFAULT 0,
            coverage_score        REAL NOT NULL DEFAULT 0.0,
            coverage_level        TEXT NOT NULL DEFAULT 'UNKNOWN',
            telemetry_status      TEXT NOT NULL DEFAULT 'UNKNOWN',
            deployment_status     TEXT NOT NULL DEFAULT 'UNKNOWN',
            validation_status     TEXT NOT NULL DEFAULT 'NOT_TESTED',
            recommended_action    TEXT NOT NULL DEFAULT '',
            telemetry_dependencies TEXT NOT NULL DEFAULT '[]',
            PRIMARY KEY (technique_id, corpus_id)
        );

        CREATE INDEX IF NOT EXISTS idx_gap_corpus
            ON gap_assessments (corpus_id);

        CREATE TABLE IF NOT EXISTS telemetry_sources (
            id                TEXT PRIMARY KEY,
            name              TEXT NOT NULL,
            platform          TEXT NOT NULL,
            collection_status TEXT NOT NULL DEFAULT 'UNKNOWN',
            coverage_scope    TEXT,
            last_verified     TEXT,
            owner             TEXT,
            notes             TEXT,
            is_demo           INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS deployment_records (
            id                TEXT PRIMARY KEY,
            rule_id           TEXT NOT NULL,
            siem_target       TEXT,
            deployment_status TEXT NOT NULL DEFAULT 'UNKNOWN',
            enabled           INTEGER NOT NULL DEFAULT 0,
            last_verified     TEXT,
            validation_status TEXT NOT NULL DEFAULT 'NOT_TESTED',
            last_tested       TEXT,
            test_result       TEXT,
            owner             TEXT,
            notes             TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_deployment_rule
            ON deployment_records (rule_id);

        CREATE TABLE IF NOT EXISTS validation_records (
            id                  TEXT PRIMARY KEY,
            technique_id        TEXT NOT NULL,
            rule_id             TEXT,
            objective           TEXT NOT NULL,
            required_telemetry  TEXT NOT NULL DEFAULT '[]',
            prerequisites       TEXT NOT NULL DEFAULT '[]',
            expected_evidence   TEXT NOT NULL DEFAULT '',
            expected_detection  TEXT NOT NULL DEFAULT '',
            observed_result     TEXT,
            analyst_notes       TEXT,
            remediation         TEXT,
            status              TEXT NOT NULL DEFAULT 'NOT_TESTED',
            tested_at           TEXT,
            is_synthetic        INTEGER NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_validation_technique
            ON validation_records (technique_id);

        CREATE TABLE IF NOT EXISTS corpus_snapshots (
            snapshot_id              TEXT PRIMARY KEY,
            corpus_id                TEXT NOT NULL,
            label                    TEXT NOT NULL,
            attack_version           TEXT NOT NULL,
            rule_count               INTEGER NOT NULL DEFAULT 0,
            technique_coverage_count INTEGER NOT NULL DEFAULT 0,
            mean_coverage_score      REAL NOT NULL DEFAULT 0.0,
            content_hash             TEXT NOT NULL,
            created_at               TEXT NOT NULL,
            is_demo                  INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_snapshots_corpus
            ON corpus_snapshots (corpus_id);

        CREATE TABLE IF NOT EXISTS ingestion_jobs (
            job_id         TEXT PRIMARY KEY,
            status         TEXT NOT NULL,
            summary        TEXT,
            progress_stage TEXT NOT NULL DEFAULT '',
            progress_pct   INTEGER NOT NULL DEFAULT 0,
            created_at     TEXT NOT NULL
        );
    """)
    conn.commit()
