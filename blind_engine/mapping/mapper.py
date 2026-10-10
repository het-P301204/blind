"""Map Sigma rules to MITRE ATT&CK techniques."""
from blind_engine.models import AttackDataset, SigmaRule, TechniqueMapping


def map_rules_to_techniques(
    rules: list[SigmaRule],
    dataset: AttackDataset,
) -> list[TechniqueMapping]:
    """Build one TechniqueMapping per technique that has at least one rule referencing it.

    Rules that reference techniques absent from the dataset are still mapped so
    we can surface the unknown-technique warning to the caller.
    """
    tech_to_rules: dict[str, list[str]] = {}
    tech_warnings: dict[str, list[str]] = {}

    for rule in rules:
        for raw_tid in rule.attack_technique_ids:
            tid = raw_tid.upper()
            tech_to_rules.setdefault(tid, [])
            if rule.id not in tech_to_rules[tid]:
                tech_to_rules[tid].append(rule.id)

            if tid not in dataset.techniques:
                tech_warnings.setdefault(tid, [])
                tech_warnings[tid].append(
                    f"Rule '{rule.id}' references technique {tid} which is not in the loaded dataset"
                )
            else:
                tech = dataset.techniques[tid]
                if tech.is_deprecated:
                    tech_warnings.setdefault(tid, [])
                    tech_warnings[tid].append(f"Technique {tid} is deprecated")
                if tech.is_revoked:
                    tech_warnings.setdefault(tid, [])
                    tech_warnings[tid].append(f"Technique {tid} is revoked")

    return [
        TechniqueMapping(
            technique_id=tid,
            rule_ids=rule_ids,
            is_explicit=True,
            mapping_warnings=tech_warnings.get(tid, []),
        )
        for tid, rule_ids in tech_to_rules.items()
    ]
