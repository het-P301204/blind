"""Export gap assessments to CSV."""
import csv
import io

from blind_engine.models import GapAssessment

_FIELDNAMES = [
    "priority_rank",
    "technique_id",
    "technique_name",
    "tactics",
    "priority_score",
    "coverage_score",
    "coverage_level",
    "mapped_rule_count",
    "telemetry_status",
    "deployment_status",
    "validation_status",
    "recommended_action",
    "telemetry_dependencies",
]


def export_gaps_csv(gaps: list[GapAssessment]) -> str:
    """Serialise gap assessments to a CSV string (UTF-8)."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_FIELDNAMES, lineterminator="\r\n")
    writer.writeheader()
    for gap in gaps:
        writer.writerow(
            {
                "priority_rank": gap.priority_rank,
                "technique_id": gap.technique_id,
                "technique_name": gap.technique_name,
                "tactics": "; ".join(gap.tactics),
                "priority_score": f"{gap.priority_score:.2f}",
                "coverage_score": f"{gap.coverage_score:.2f}",
                "coverage_level": gap.coverage_level.value,
                "mapped_rule_count": gap.mapped_rule_count,
                "telemetry_status": gap.telemetry_status.value,
                "deployment_status": gap.deployment_status.value,
                "validation_status": gap.validation_status.value,
                "recommended_action": gap.recommended_action,
                "telemetry_dependencies": "; ".join(gap.telemetry_dependencies),
            }
        )
    return buf.getvalue()
