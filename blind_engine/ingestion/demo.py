"""Built-in demo data for the BLIND platform.

Provides a self-contained corpus of synthetic Sigma rules and a matching ATT&CK
dataset so users can explore the UI without needing a real rule repository or
STIX bundle.

All data in this module is clearly synthetic and for demonstration purposes only.
"""
from __future__ import annotations

from datetime import datetime

from blind_engine.models import (
    AttackDataset,
    AttackDataSource,
    AttackTactic,
    AttackTechnique,
    DemoDataset,
    DeploymentRecord,
    DeploymentStatus,
    IngestionSummary,
    ParseStatus,
    SigmaLogSource,
    SigmaRule,
    TelemetrySource,
    TelemetryStatus,
    ValidationRecord,
    ValidationStatus,
)

# ── Technique catalogue ────────────────────────────────────────────────────────
# (id, name, tactics, platforms)
_TECHNIQUES: list[tuple[str, str, list[str], list[str]]] = [
    ("T1059", "Command and Scripting Interpreter", ["execution"], ["Windows", "Linux", "macOS"]),
    ("T1059.001", "PowerShell", ["execution"], ["Windows"]),
    ("T1059.003", "Windows Command Shell", ["execution"], ["Windows"]),
    ("T1059.007", "JavaScript", ["execution"], ["Windows", "Linux", "macOS"]),
    ("T1078", "Valid Accounts", ["defense-evasion", "persistence", "privilege-escalation", "initial-access"], ["Windows", "Linux", "macOS"]),
    ("T1055", "Process Injection", ["defense-evasion", "privilege-escalation"], ["Windows", "Linux"]),
    ("T1003", "OS Credential Dumping", ["credential-access"], ["Windows", "Linux", "macOS"]),
    ("T1003.001", "LSASS Memory", ["credential-access"], ["Windows"]),
    ("T1021", "Remote Services", ["lateral-movement"], ["Windows", "Linux", "macOS"]),
    ("T1021.001", "Remote Desktop Protocol", ["lateral-movement"], ["Windows"]),
    ("T1053", "Scheduled Task/Job", ["execution", "persistence", "privilege-escalation"], ["Windows", "Linux", "macOS"]),
    ("T1053.005", "Scheduled Task", ["execution", "persistence", "privilege-escalation"], ["Windows"]),
    ("T1070", "Indicator Removal", ["defense-evasion"], ["Windows", "Linux", "macOS"]),
    ("T1070.001", "Clear Windows Event Logs", ["defense-evasion"], ["Windows"]),
    ("T1082", "System Information Discovery", ["discovery"], ["Windows", "Linux", "macOS"]),
    ("T1083", "File and Directory Discovery", ["discovery"], ["Windows", "Linux", "macOS"]),
    ("T1087", "Account Discovery", ["discovery"], ["Windows", "Linux", "macOS"]),
    ("T1105", "Ingress Tool Transfer", ["command-and-control"], ["Windows", "Linux", "macOS"]),
    ("T1110", "Brute Force", ["credential-access"], ["Windows", "Linux", "macOS"]),
    ("T1190", "Exploit Public-Facing Application", ["initial-access"], ["Windows", "Linux", "macOS"]),
    ("T1218", "System Binary Proxy Execution", ["defense-evasion"], ["Windows"]),
    ("T1218.011", "Rundll32", ["defense-evasion"], ["Windows"]),
    ("T1543", "Create or Modify System Process", ["persistence", "privilege-escalation"], ["Windows", "Linux", "macOS"]),
    ("T1562", "Impair Defenses", ["defense-evasion"], ["Windows", "Linux", "macOS"]),
    ("T1566", "Phishing", ["initial-access"], ["Windows", "Linux", "macOS"]),
    ("T1569", "System Services", ["execution"], ["Windows", "Linux"]),
    ("T1569.002", "Service Execution", ["execution"], ["Windows"]),
    ("T1574", "Hijack Execution Flow", ["persistence", "privilege-escalation", "defense-evasion"], ["Windows", "Linux", "macOS"]),
    ("T1588", "Obtain Capabilities", ["resource-development"], ["PRE"]),
    ("T1595", "Active Scanning", ["reconnaissance"], ["PRE"]),
]

_TACTICS: list[tuple[str, str, str]] = [
    ("TA0001", "Initial Access", "initial-access"),
    ("TA0002", "Execution", "execution"),
    ("TA0003", "Persistence", "persistence"),
    ("TA0004", "Privilege Escalation", "privilege-escalation"),
    ("TA0005", "Defense Evasion", "defense-evasion"),
    ("TA0006", "Credential Access", "credential-access"),
    ("TA0007", "Discovery", "discovery"),
    ("TA0008", "Lateral Movement", "lateral-movement"),
    ("TA0009", "Collection", "collection"),
    ("TA0010", "Exfiltration", "exfiltration"),
    ("TA0011", "Command and Control", "command-and-control"),
    ("TA0040", "Impact", "impact"),
    ("TA0042", "Resource Development", "resource-development"),
    ("TA0043", "Reconnaissance", "reconnaissance"),
]

_DEMO_RULES_SPEC: list[tuple[str, str, list[str], list[str], str]] = [
    # (rule_id, title, tech_ids, tactic_tags, status)
    ("demo-rule-001", "PowerShell Encoded Command Execution", ["T1059.001"], ["execution"], "stable"),
    ("demo-rule-002", "PowerShell Download Cradle", ["T1059.001", "T1105"], ["execution", "command-and-control"], "stable"),
    ("demo-rule-003", "Mimikatz LSASS Memory Access", ["T1003.001", "T1003"], ["credential-access"], "stable"),
    ("demo-rule-004", "Suspicious Scheduled Task Creation", ["T1053.005", "T1053"], ["execution", "persistence"], "stable"),
    ("demo-rule-005", "Lateral Movement via RDP", ["T1021.001", "T1021"], ["lateral-movement"], "test"),
    ("demo-rule-006", "Windows Event Log Cleared", ["T1070.001", "T1070"], ["defense-evasion"], "stable"),
    ("demo-rule-007", "Suspicious Rundll32 Execution", ["T1218.011", "T1218"], ["defense-evasion"], "experimental"),
    ("demo-rule-008", "WMI Remote Command Execution", ["T1059"], ["execution"], "test"),
    ("demo-rule-009", "System Information Discovery via Systeminfo", ["T1082"], ["discovery"], "stable"),
    ("demo-rule-010", "Process Injection via CreateRemoteThread", ["T1055"], ["defense-evasion", "privilege-escalation"], "stable"),
    ("demo-rule-011", "Multiple Failed Logon Attempts (Brute Force)", ["T1110"], ["credential-access"], "test"),
    ("demo-rule-012", "Malicious Service Installation", ["T1569.002", "T1569"], ["execution"], "stable"),
    ("demo-rule-013", "Valid Account Abuse Detected", ["T1078"], ["defense-evasion", "persistence"], "experimental"),
    ("demo-rule-014", "Windows Command Shell Suspicious Usage", ["T1059.003"], ["execution"], "stable"),
    ("demo-rule-015", "File and Directory Enumeration", ["T1083"], ["discovery"], "test"),
]


def _make_rule(
    rule_id: str,
    title: str,
    tech_ids: list[str],
    tactic_tags: list[str],
    status: str,
    corpus_id: str,
) -> SigmaRule:
    tags = [f"attack.{tid.lower()}" for tid in tech_ids] + [f"attack.{t}" for t in tactic_tags]
    return SigmaRule(
        id=rule_id,
        file_path=f"demo/{title.lower().replace(' ', '_')[:40]}.yml",
        content_hash=rule_id.replace("-", "")[:16],
        parse_status=ParseStatus.PARSED,
        title=f"[DEMO] {title}",
        description=f"[DEMO] Detects suspicious activity related to: {title}. Synthetic data only.",
        author="BLIND Demo",
        status=status,
        date="2024-01-01",
        modified="2024-06-01",
        tags=tags,
        attack_technique_ids=tech_ids,
        attack_tactic_tags=tactic_tags,
        logsource=SigmaLogSource(category="process_creation", product="windows"),
        detection_condition="selection",
        falsepositives=["Legitimate administrative activity"],
        references=["https://attack.mitre.org/"],
        is_demo=True,
        corpus_id=corpus_id,
    )


def _build_dataset() -> AttackDataset:
    techniques: dict[str, AttackTechnique] = {}
    for tid, name, tactic_list, platforms in _TECHNIQUES:
        is_sub = "." in tid
        parent = tid.split(".")[0] if is_sub else None
        techniques[tid] = AttackTechnique(
            id=tid,
            name=name,
            description=f"[DEMO] MITRE ATT&CK technique {tid}: {name}.",
            tactics=tactic_list,
            platforms=platforms,
            data_sources=[
                AttackDataSource(name="Process", component="Process Creation"),
                AttackDataSource(name="Windows Registry", component="Windows Registry Key Modification"),
                AttackDataSource(name="Network Traffic", component="Network Traffic Flow"),
            ],
            is_subtechnique=is_sub,
            parent_id=parent,
            subtechnique_ids=[],
            dataset_version="demo-14.1",
        )

    # Wire subtechnique_ids
    for tid, tech in techniques.items():
        if tech.parent_id and tech.parent_id in techniques:
            parent_tech = techniques[tech.parent_id]
            if tid not in parent_tech.subtechnique_ids:
                parent_tech.subtechnique_ids.append(tid)

    tactic_map: dict[str, AttackTactic] = {
        tactic_id: AttackTactic(id=tactic_id, name=name, short_name=short)
        for tactic_id, name, short in _TACTICS
    }

    return AttackDataset(
        version="demo-14.1",
        techniques=techniques,
        tactics=tactic_map,
    )


def _build_telemetry_sources(corpus_id: str) -> list[TelemetrySource]:
    """Generate synthetic telemetry source records."""
    sources = [
        TelemetrySource(
            id=f"demo-telem-001",
            name="Windows Security Event Log",
            platform="Windows",
            collection_status=TelemetryStatus.AVAILABLE,
            coverage_scope="endpoint",
            is_demo=True,
        ),
        TelemetrySource(
            id="demo-telem-002",
            name="Sysmon Process Creation",
            platform="Windows",
            collection_status=TelemetryStatus.AVAILABLE,
            coverage_scope="endpoint",
            is_demo=True,
        ),
        TelemetrySource(
            id="demo-telem-003",
            name="EDR Network Telemetry",
            platform="Windows",
            collection_status=TelemetryStatus.PARTIAL,
            coverage_scope="network",
            is_demo=True,
        ),
    ]
    return sources


def _build_validation_records() -> list[ValidationRecord]:
    """Generate synthetic validation records."""
    return [
        ValidationRecord(
            id="demo-val-001",
            technique_id="T1059.001",
            rule_id="demo-rule-001",
            objective="Validate PowerShell detection rule fires on encoded command execution",
            required_telemetry=["Sysmon Process Creation"],
            prerequisites=["Sysmon installed", "EventID 1 enabled"],
            expected_evidence="Process creation event for powershell.exe with -EncodedCommand",
            expected_detection="demo-rule-001 fires",
            status=ValidationStatus.PASSED,
            is_synthetic=True,
        ),
        ValidationRecord(
            id="demo-val-002",
            technique_id="T1003.001",
            rule_id="demo-rule-003",
            objective="Validate LSASS memory access detection",
            required_telemetry=["Windows Security Event Log"],
            prerequisites=["Audit Process Access enabled"],
            expected_evidence="EID 4663 with LSASS target",
            expected_detection="demo-rule-003 fires",
            status=ValidationStatus.NOT_TESTED,
            is_synthetic=True,
        ),
    ]


def load_demo_data(corpus_id: str = "demo-corpus") -> dict:
    """Build and return the BLIND synthetic demo dataset as a dict.

    Returns a dict with keys:
        rules, dataset, coverage, gaps, corpus_id, summary,
        snapshot_a, snapshot_b, telemetry_sources, validation_records

    All data is clearly labelled as synthetic in metadata fields.
    """
    from blind_engine.mapping.mapper import map_rules_to_techniques
    from blind_engine.coverage.scorer import calculate_coverage
    from blind_engine.prioritization.engine import prioritize_gaps
    from blind_engine.ingestion.snapshotter import create_snapshot

    attack_dataset = _build_dataset()
    rules = [
        _make_rule(rid, title, tech_ids, tactic_tags, status, corpus_id)
        for rid, title, tech_ids, tactic_tags, status in _DEMO_RULES_SPEC
    ]
    rules_by_id = {r.id: r for r in rules}

    mappings = map_rules_to_techniques(rules, attack_dataset)
    coverage = calculate_coverage(mappings, rules_by_id, attack_dataset)
    gaps = prioritize_gaps(coverage, attack_dataset)

    attack_mapped = sum(1 for r in rules if r.attack_technique_ids)
    techniques_covered = sum(1 for c in coverage if c.coverage_score > 0)

    summary = IngestionSummary(
        corpus_id=corpus_id,
        files_discovered=len(rules),
        successfully_parsed=len(rules),
        parsed_with_warnings=0,
        invalid_files=0,
        total_rules=len(rules),
        rules_with_attack_tags=len(rules),
        completed_at=datetime.utcnow(),
    )

    # Snapshot A: baseline (all demo rules)
    snap_a = create_snapshot(
        corpus_id=corpus_id,
        rules=rules,
        coverage=coverage,
        label="Demo Snapshot A — baseline",
        attack_version="demo-14.1",
    )
    snap_a.is_demo = True

    # Snapshot B: add one extra rule (simulated improvement)
    extra_rule = _make_rule(
        "demo-rule-016",
        "Suspicious Account Discovery (NEW)",
        ["T1087"],
        ["discovery"],
        "stable",
        corpus_id,
    )
    rules_b = rules + [extra_rule]
    rules_b_by_id = {r.id: r for r in rules_b}
    mappings_b = map_rules_to_techniques(rules_b, attack_dataset)
    coverage_b = calculate_coverage(mappings_b, rules_b_by_id, attack_dataset)

    snap_b = create_snapshot(
        corpus_id=corpus_id,
        rules=rules_b,
        coverage=coverage_b,
        label="Demo Snapshot B — T1087 coverage added",
        attack_version="demo-14.1",
    )
    snap_b.is_demo = True

    telemetry_sources = _build_telemetry_sources(corpus_id)
    validation_records = _build_validation_records()

    return {
        "corpus_id": corpus_id,
        "rules": rules,
        "dataset": attack_dataset,
        "coverage": coverage,
        "gaps": gaps,
        "summary": summary,
        "snapshot_a": snap_a,
        "snapshot_b": snap_b,
        "telemetry_sources": telemetry_sources,
        "validation_records": validation_records,
    }
