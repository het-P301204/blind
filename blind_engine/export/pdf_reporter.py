"""Generate a PDF coverage report using ReportLab."""
import io
from datetime import datetime
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from blind_engine.models import CoverageLevel, CoverageResult, GapAssessment, IngestionSummary

_BRAND_DARK = colors.HexColor("#1a1a2e")
_BRAND_MID = colors.HexColor("#16213e")
_BRAND_ACCENT = colors.HexColor("#0f3460")
_LIGHT_BG = colors.HexColor("#f5f5f5")
_BORDER = colors.HexColor("#cccccc")


def _header_table_style() -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), _BRAND_MID),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, _LIGHT_BG]),
            ("GRID", (0, 0), (-1, -1), 0.25, _BORDER),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]
    )


def export_pdf_report(
    coverage: list[CoverageResult],
    gaps: list[GapAssessment],
    summary: Optional[IngestionSummary],
    dataset_version: str = "unknown",
) -> bytes:
    """Render a multi-page PDF coverage report and return the raw bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="BLIND Detection Coverage Report",
        author="BLIND Platform",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "BLINDTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=_BRAND_DARK,
        spaceAfter=6,
        leading=26,
    )
    h2_style = ParagraphStyle(
        "BLINDH2",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=_BRAND_MID,
        spaceAfter=4,
        spaceBefore=12,
    )
    normal = styles["Normal"]
    small = ParagraphStyle("BLINDSmall", parent=normal, fontSize=8)

    covered = [c for c in coverage if c.coverage_score > 0]
    mean_score = sum(c.coverage_score for c in coverage) / len(coverage) if coverage else 0.0

    story = []

    # ── Title block ───────────────────────────────────────────────────────────
    story.append(Paragraph("BLIND Detection Coverage Report", title_style))
    story.append(
        Paragraph(
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} "
            f"&nbsp;|&nbsp; ATT&amp;CK Version: {dataset_version}",
            small,
        )
    )
    story.append(Spacer(1, 0.1 * inch))
    story.append(HRFlowable(width="100%", thickness=1, color=_BORDER))
    story.append(Spacer(1, 0.1 * inch))

    # ── Executive Summary ─────────────────────────────────────────────────────
    story.append(Paragraph("Executive Summary", h2_style))
    if summary:
        story.append(Paragraph(f"<b>Corpus ID:</b> {summary.corpus_id}", normal))
        story.append(Paragraph(f"<b>Total Rules Ingested:</b> {summary.total_rules}", normal))
        story.append(
            Paragraph(f"<b>Rules with ATT&amp;CK Tags:</b> {summary.rules_with_attack_tags}", normal)
        )
        if summary.invalid_files:
            story.append(
                Paragraph(f"<b>Failed to Parse:</b> {summary.invalid_files}", normal)
            )
    story.append(Paragraph(f"<b>Techniques Analysed:</b> {len(coverage)}", normal))
    story.append(
        Paragraph(f"<b>Techniques with Coverage:</b> {len(covered)}", normal)
    )
    story.append(
        Paragraph(f"<b>Mean Coverage Score:</b> {mean_score:.1f} / 100", normal)
    )
    story.append(Spacer(1, 0.15 * inch))

    # ── Coverage Level Distribution ───────────────────────────────────────────
    story.append(Paragraph("Coverage Level Distribution", h2_style))
    level_counts: dict[str, int] = {lv.value: 0 for lv in CoverageLevel}
    for cov in coverage:
        level_counts[cov.coverage_level.value] += 1

    level_table_data = [["Coverage Level", "Technique Count", "Percentage"]]
    for level, count in level_counts.items():
        pct = (count / len(coverage) * 100) if coverage else 0.0
        level_table_data.append([level, str(count), f"{pct:.1f}%"])

    lt = Table(level_table_data, colWidths=[2.5 * inch, 1.5 * inch, 1.5 * inch])
    lt.setStyle(_header_table_style())
    story.append(lt)
    story.append(Spacer(1, 0.15 * inch))

    # ── Top Priority Gaps ─────────────────────────────────────────────────────
    story.append(Paragraph("Top Priority Gaps (up to 25)", h2_style))
    top_gaps = gaps[:25]
    if top_gaps:
        gap_data = [["Rank", "ID", "Technique Name", "Tactics", "Priority", "Coverage"]]
        for gap in top_gaps:
            name = gap.technique_name
            if len(name) > 38:
                name = name[:35] + "..."
            gap_data.append(
                [
                    str(gap.priority_rank),
                    gap.technique_id,
                    name,
                    ", ".join(gap.tactics[:2]),
                    f"{gap.priority_score:.1f}",
                    f"{gap.coverage_score:.1f}%",
                ]
            )
        gap_table = Table(
            gap_data,
            colWidths=[0.45 * inch, 0.9 * inch, 2.3 * inch, 1.5 * inch, 0.7 * inch, 0.9 * inch],
        )
        gap_table.setStyle(_header_table_style())
        story.append(gap_table)
    else:
        story.append(Paragraph("No gap data available.", normal))

    story.append(Spacer(1, 0.15 * inch))

    # ── Coverage Detail (top 50 covered) ──────────────────────────────────────
    story.append(Paragraph("Coverage Detail (top 50 scored techniques)", h2_style))
    top_covered = sorted(coverage, key=lambda c: -c.coverage_score)[:50]
    if top_covered:
        cov_data = [["ID", "Technique Name", "Tactics", "Rules", "Score", "Level"]]
        for cov in top_covered:
            name = cov.technique_name
            if len(name) > 38:
                name = name[:35] + "..."
            cov_data.append(
                [
                    cov.technique_id,
                    name,
                    ", ".join(cov.tactics[:2]),
                    str(cov.mapped_rule_count),
                    f"{cov.coverage_score:.1f}",
                    cov.coverage_level.value,
                ]
            )
        cov_table = Table(
            cov_data,
            colWidths=[0.9 * inch, 2.3 * inch, 1.5 * inch, 0.5 * inch, 0.6 * inch, 1.5 * inch],
        )
        cov_table.setStyle(_header_table_style())
        story.append(cov_table)
    else:
        story.append(Paragraph("No coverage data available.", normal))

    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER))
    story.append(
        Paragraph(
            "Generated by BLIND — Detection Coverage Intelligence Platform v0.1.0",
            small,
        )
    )

    doc.build(story)
    return buf.getvalue()
