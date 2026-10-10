"""BLIND CLI — Detection Coverage Intelligence Platform command-line interface.

Usage:
    blind [COMMAND] [OPTIONS] [ARGS]

Install via:
    pip install -e .   (makes the ``blind`` entry-point available)
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

app = typer.Typer(
    name="blind",
    help="BLIND — Detection Coverage Intelligence Platform",
    add_completion=False,
    no_args_is_help=True,
)

console = Console()
err_console = Console(stderr=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_db(db_path: Optional[str]) -> str:
    """Return the effective database path, falling back to the default."""
    if db_path:
        return db_path
    default = Path.home() / ".blind" / "blind.db"
    default.parent.mkdir(parents=True, exist_ok=True)
    return str(default)


def _run(coro):
    """Run an async coroutine from a sync CLI command."""
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# demo  — load and display the built-in synthetic dataset
# ---------------------------------------------------------------------------

@app.command("demo")
def cmd_demo(
    export_json: bool = typer.Option(False, "--json", help="Dump the demo dataset as JSON"),
    corpus_id: str = typer.Option("demo-corpus", "--corpus-id", help="Corpus ID to use"),
):
    """Load and display the built-in synthetic demo dataset."""
    from blind_engine.ingestion.demo import load_demo_data

    console.print(Panel("[bold cyan]Loading BLIND demo dataset…[/bold cyan]", expand=False))
    demo = load_demo_data(corpus_id=corpus_id)

    if export_json:
        # Serialize the dict to JSON
        def _serialise(obj):
            from datetime import datetime
            from pydantic import BaseModel
            if isinstance(obj, BaseModel):
                return obj.model_dump(mode="json")
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(type(obj))

        console.print_json(json.dumps(demo, default=_serialise, indent=2))
        return

    # Summary table
    summary = demo.get("summary") if isinstance(demo, dict) else getattr(demo, "summary", None)
    rules = demo.get("rules") if isinstance(demo, dict) else getattr(demo, "rules", [])
    gaps = demo.get("gaps") if isinstance(demo, dict) else getattr(demo, "gaps", [])
    coverage = demo.get("coverage") if isinstance(demo, dict) else getattr(demo, "coverage", [])

    table = Table(title="Demo Dataset Summary", box=box.ROUNDED)
    table.add_column("Metric", style="bold")
    table.add_column("Value", style="green")
    table.add_row("Corpus ID", corpus_id)
    table.add_row("Total Rules", str(len(rules)))
    table.add_row("Coverage Results", str(len(coverage)))
    table.add_row("Gap Assessments", str(len(gaps)))
    console.print(table)

    if gaps:
        gap_table = Table(title="Top 5 Gaps", box=box.SIMPLE)
        gap_table.add_column("#", style="dim")
        gap_table.add_column("Technique")
        gap_table.add_column("Score", justify="right")
        gap_table.add_column("Level")
        for i, g in enumerate(gaps[:5], 1):
            gap = g if not hasattr(g, "technique_id") else g
            if isinstance(g, dict):
                gap_table.add_row(
                    str(i), g["technique_id"], f"{g['priority_score']:.2f}", g["coverage_level"]
                )
            else:
                gap_table.add_row(
                    str(i), g.technique_id, f"{g.priority_score:.2f}", g.coverage_level.value
                )
        console.print(gap_table)

    console.print("[green]Demo dataset loaded successfully.[/green]")


# ---------------------------------------------------------------------------
# ingest  — run the Sigma ingestion pipeline
# ---------------------------------------------------------------------------

@app.command("ingest")
def cmd_ingest(
    rules_dir: str = typer.Argument(..., help="Directory containing Sigma YAML rule files"),
    attack_bundle: str = typer.Option(..., "--attack", "-a", help="Path to the ATT&CK STIX bundle JSON"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
    corpus_id: str = typer.Option("default", "--corpus-id", "-c", help="Corpus identifier"),
    recursive: bool = typer.Option(True, "--recursive/--no-recursive", help="Recurse into subdirectories"),
):
    """Parse Sigma rules and ingest them into the BLIND database."""
    from blind_engine.sigma.parser import parse_directory
    from blind_engine.attack.parser import load_attack_dataset
    from blind_engine.db.dal import BlindDAL

    db = _resolve_db(db_path)
    console.print(f"[bold]Ingesting rules from:[/bold] {rules_dir}")
    console.print(f"[bold]ATT&CK bundle:[/bold] {attack_bundle}")
    console.print(f"[bold]Database:[/bold] {db}")

    console.print("[cyan]Loading ATT&CK dataset…[/cyan]")
    try:
        dataset = load_attack_dataset(attack_bundle)
        console.print(f"[green]Loaded {len(dataset.techniques)} techniques, {len(dataset.tactics)} tactics[/green]")
    except Exception as e:
        err_console.print(f"[red]Failed to load ATT&CK bundle:[/red] {e}")
        raise typer.Exit(1)

    console.print("[cyan]Parsing Sigma rules…[/cyan]")
    try:
        summary, rules = parse_directory(rules_dir, corpus_id=corpus_id, recursive=recursive)
    except Exception as e:
        err_console.print(f"[red]Failed to parse Sigma rules:[/red] {e}")
        raise typer.Exit(1)

    table = Table(title="Ingestion Summary", box=box.ROUNDED)
    table.add_column("Metric")
    table.add_column("Count", justify="right", style="green")
    table.add_row("Files Discovered", str(summary.files_discovered))
    table.add_row("Successfully Parsed", str(summary.successfully_parsed))
    table.add_row("Parsed with Warnings", str(summary.parsed_with_warnings))
    table.add_row("Invalid", str(summary.invalid_files))
    table.add_row("Duplicates", str(summary.duplicates))
    console.print(table)

    console.print("[cyan]Storing results in database…[/cyan]")
    try:
        dal = BlindDAL(db)
        _run(dal.initialize())
        _run(dal.store_attack_dataset(dataset))
        _run(dal.store_rules(rules, corpus_id=corpus_id))
        _run(dal.store_ingestion_summary(summary))
    except Exception as e:
        err_console.print(f"[red]Database error:[/red] {e}")
        raise typer.Exit(1)

    console.print("[green]Ingestion complete.[/green]")


# ---------------------------------------------------------------------------
# score  — run the coverage scoring engine
# ---------------------------------------------------------------------------

@app.command("score")
def cmd_score(
    corpus_id: str = typer.Argument(..., help="Corpus ID to score"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
    lambda_factor: float = typer.Option(0.3, "--lambda", help="Coverage saturation factor λ"),
    output_json: bool = typer.Option(False, "--json", help="Output results as JSON"),
):
    """Calculate ATT&CK technique coverage scores for a corpus."""
    from blind_engine.db.dal import BlindDAL
    from blind_engine.mapping.mapper import map_rules_to_techniques
    from blind_engine.coverage.scorer import calculate_coverage
    from blind_engine.models import CoverageConfig

    db = _resolve_db(db_path)

    async def _score():
        dal = BlindDAL(db)
        await dal.initialize()
        dataset = await dal.get_attack_dataset()
        rules = await dal.get_rules(corpus_id=corpus_id)
        if not rules:
            err_console.print(f"[yellow]No rules found for corpus '{corpus_id}'[/yellow]")
            return None, None
        rules_by_id = {r.id: r for r in rules}
        mappings = map_rules_to_techniques(rules, dataset)
        cfg = CoverageConfig(lambda_factor=lambda_factor)
        coverage = calculate_coverage(mappings, rules_by_id, dataset, config=cfg)
        await dal.store_coverage(coverage, corpus_id=corpus_id)
        return coverage, dataset

    coverage, dataset = _run(_score())
    if coverage is None:
        raise typer.Exit(1)

    if output_json:
        out = [c.model_dump(mode="json") for c in coverage]
        console.print_json(json.dumps(out, indent=2, default=str))
        return

    covered = [c for c in coverage if c.coverage_score > 0]
    mean = sum(c.coverage_score for c in coverage) / len(coverage) if coverage else 0.0
    console.print(f"[green]Coverage computed:[/green] {len(covered)}/{len(coverage)} techniques covered")
    console.print(f"Mean score: [bold]{mean:.1f}[/bold]")


# ---------------------------------------------------------------------------
# gaps  — run the gap prioritization engine
# ---------------------------------------------------------------------------

@app.command("gaps")
def cmd_gaps(
    corpus_id: str = typer.Argument(..., help="Corpus ID to analyse"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
    top: int = typer.Option(20, "--top", "-n", help="Number of top gaps to display"),
    output_json: bool = typer.Option(False, "--json", help="Output as JSON"),
):
    """Identify and prioritize coverage gaps for a corpus."""
    from blind_engine.db.dal import BlindDAL
    from blind_engine.prioritization.engine import prioritize_gaps

    db = _resolve_db(db_path)

    async def _gaps():
        dal = BlindDAL(db)
        await dal.initialize()
        dataset = await dal.get_attack_dataset()
        coverage = await dal.get_coverage(corpus_id=corpus_id)
        if not coverage:
            err_console.print(f"[yellow]No coverage results for corpus '{corpus_id}'. Run 'blind score' first.[/yellow]")
            return None
        gaps = prioritize_gaps(coverage, dataset)
        await dal.store_gaps(gaps, corpus_id=corpus_id)
        return gaps

    gaps = _run(_gaps())
    if gaps is None:
        raise typer.Exit(1)

    if output_json:
        console.print_json(json.dumps([g.model_dump(mode="json") for g in gaps], indent=2, default=str))
        return

    table = Table(title=f"Top {top} Coverage Gaps", box=box.ROUNDED)
    table.add_column("#", style="dim", width=4)
    table.add_column("Technique", width=12)
    table.add_column("Name", width=35)
    table.add_column("Priority", justify="right", width=8)
    table.add_column("Coverage", justify="right", width=9)
    table.add_column("Level", width=20)

    for g in gaps[:top]:
        table.add_row(
            str(g.priority_rank),
            g.technique_id,
            g.technique_name[:34],
            f"{g.priority_score:.2f}",
            f"{g.coverage_score:.1f}",
            g.coverage_level.value,
        )
    console.print(table)


# ---------------------------------------------------------------------------
# export  — export analysis results
# ---------------------------------------------------------------------------

@app.command("export")
def cmd_export(
    corpus_id: str = typer.Argument(..., help="Corpus ID to export"),
    format: str = typer.Option("json", "--format", "-f", help="Output format: json, csv, navigator"),
    output: Optional[str] = typer.Option(None, "--output", "-o", help="Output file path (stdout if omitted)"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
):
    """Export coverage or gap data to JSON, CSV, or ATT&CK Navigator layer."""
    from blind_engine.db.dal import BlindDAL
    from blind_engine.export.json_exporter import export_analysis_json
    from blind_engine.export.csv_exporter import export_gaps_csv
    from blind_engine.export.navigator import export_navigator_layer

    db = _resolve_db(db_path)

    async def _fetch():
        dal = BlindDAL(db)
        await dal.initialize()
        dataset = await dal.get_attack_dataset()
        coverage = await dal.get_coverage(corpus_id=corpus_id)
        gaps = await dal.get_gaps(corpus_id=corpus_id)
        summary = await dal.get_ingestion_summary(corpus_id=corpus_id)
        return dataset, coverage, gaps, summary

    dataset, coverage, gaps, summary = _run(_fetch())

    fmt = format.lower()
    if fmt == "json":
        result = json.dumps(export_analysis_json(coverage, gaps, summary, dataset), indent=2, default=str)
    elif fmt == "csv":
        result = export_gaps_csv(gaps)
    elif fmt in ("navigator", "nav"):
        nav = export_navigator_layer(coverage, dataset)
        result = json.dumps(nav, indent=2, default=str)
    else:
        err_console.print(f"[red]Unknown format '{format}'. Use json, csv, or navigator.[/red]")
        raise typer.Exit(1)

    if output:
        Path(output).write_text(result, encoding="utf-8")
        console.print(f"[green]Exported to {output}[/green]")
    else:
        print(result)


# ---------------------------------------------------------------------------
# list-rules  — list ingested Sigma rules
# ---------------------------------------------------------------------------

@app.command("list-rules")
def cmd_list_rules(
    corpus_id: str = typer.Argument(..., help="Corpus ID"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
    limit: int = typer.Option(25, "--limit", "-n"),
    status: Optional[str] = typer.Option(None, "--status", help="Filter by rule status"),
):
    """List Sigma rules stored in the database for a corpus."""
    from blind_engine.db.dal import BlindDAL

    db = _resolve_db(db_path)

    async def _list():
        dal = BlindDAL(db)
        await dal.initialize()
        return await dal.get_rules(corpus_id=corpus_id, limit=limit, status=status)

    rules = _run(_list())
    if not rules:
        console.print(f"[yellow]No rules found for corpus '{corpus_id}'[/yellow]")
        return

    table = Table(title=f"Rules — {corpus_id}", box=box.SIMPLE)
    table.add_column("ID", width=38)
    table.add_column("Title", width=40)
    table.add_column("Status", width=12)
    table.add_column("Techniques", width=20)
    for r in rules:
        techs = ", ".join(r.attack_technique_ids[:3])
        if len(r.attack_technique_ids) > 3:
            techs += f" +{len(r.attack_technique_ids) - 3}"
        table.add_row(r.id[:36], (r.title or "")[:39], r.status or "", techs)
    console.print(table)
    console.print(f"[dim]Showing {len(rules)} rules[/dim]")


# ---------------------------------------------------------------------------
# show-coverage  — display coverage results for a corpus
# ---------------------------------------------------------------------------

@app.command("show-coverage")
def cmd_show_coverage(
    corpus_id: str = typer.Argument(..., help="Corpus ID"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
    tactic: Optional[str] = typer.Option(None, "--tactic", "-t", help="Filter by tactic short name"),
    min_score: float = typer.Option(0.0, "--min-score", help="Minimum coverage score"),
):
    """Show coverage results stored in the database."""
    from blind_engine.db.dal import BlindDAL

    db = _resolve_db(db_path)

    async def _fetch():
        dal = BlindDAL(db)
        await dal.initialize()
        return await dal.get_coverage(corpus_id=corpus_id)

    coverage = _run(_fetch())
    if not coverage:
        console.print(f"[yellow]No coverage results for corpus '{corpus_id}'. Run 'blind score' first.[/yellow]")
        return

    if tactic:
        coverage = [c for c in coverage if tactic in c.tactics or tactic in c.tactic_ids]
    if min_score > 0:
        coverage = [c for c in coverage if c.coverage_score >= min_score]

    table = Table(title=f"Coverage — {corpus_id}", box=box.SIMPLE)
    table.add_column("Technique", width=12)
    table.add_column("Name", width=35)
    table.add_column("Score", justify="right", width=7)
    table.add_column("Level", width=20)
    table.add_column("Rules", justify="right", width=6)
    for c in sorted(coverage, key=lambda x: x.coverage_score, reverse=True):
        score_str = f"{c.coverage_score:.1f}"
        level_color = {
            "STRONG": "green",
            "PARTIAL": "yellow",
            "LIMITED": "orange3",
            "NO_MAPPED_COVERAGE": "red",
            "UNKNOWN": "dim",
        }.get(c.coverage_level.value, "white")
        table.add_row(
            c.technique_id,
            c.technique_name[:34],
            score_str,
            f"[{level_color}]{c.coverage_level.value}[/{level_color}]",
            str(c.mapped_rule_count),
        )
    console.print(table)


# ---------------------------------------------------------------------------
# snapshot  — create a corpus snapshot
# ---------------------------------------------------------------------------

@app.command("snapshot")
def cmd_snapshot(
    corpus_id: str = typer.Argument(..., help="Corpus ID to snapshot"),
    label: str = typer.Option("", "--label", "-l", help="Human-readable snapshot label"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
):
    """Create an immutable point-in-time snapshot of a corpus' coverage state."""
    from blind_engine.db.dal import BlindDAL
    from blind_engine.ingestion.snapshotter import create_snapshot

    db = _resolve_db(db_path)

    async def _snap():
        dal = BlindDAL(db)
        await dal.initialize()
        rules = await dal.get_rules(corpus_id=corpus_id)
        coverage = await dal.get_coverage(corpus_id=corpus_id)
        dataset = await dal.get_attack_dataset()
        snap = create_snapshot(
            corpus_id=corpus_id,
            rules=rules,
            coverage=coverage,
            label=label or f"Snapshot of {corpus_id}",
            attack_version=dataset.version if dataset else "unknown",
        )
        await dal.store_snapshot(snap)
        return snap

    snap = _run(_snap())
    console.print(f"[green]Snapshot created:[/green] {snap.snapshot_id}")
    console.print(f"  Label: {snap.label}")
    console.print(f"  Rules: {snap.rule_count}")
    console.print(f"  Techniques covered: {snap.technique_coverage_count}")
    console.print(f"  Mean score: {snap.mean_coverage_score:.2f}")


# ---------------------------------------------------------------------------
# diff  — compare two snapshots
# ---------------------------------------------------------------------------

@app.command("diff")
def cmd_diff(
    snapshot_a: str = typer.Argument(..., help="First snapshot ID"),
    snapshot_b: str = typer.Argument(..., help="Second snapshot ID"),
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
):
    """Show the difference between two corpus snapshots."""
    from blind_engine.db.dal import BlindDAL
    from blind_engine.ingestion.snapshotter import compare_snapshots

    db = _resolve_db(db_path)

    async def _diff():
        dal = BlindDAL(db)
        await dal.initialize()
        snap_a = await dal.get_snapshot(snapshot_a)
        snap_b = await dal.get_snapshot(snapshot_b)
        if not snap_a:
            err_console.print(f"[red]Snapshot not found: {snapshot_a}[/red]")
            return None
        if not snap_b:
            err_console.print(f"[red]Snapshot not found: {snapshot_b}[/red]")
            return None
        rules_a = await dal.get_rules(corpus_id=snap_a.corpus_id)
        rules_b = await dal.get_rules(corpus_id=snap_b.corpus_id)
        cov_a = await dal.get_coverage(corpus_id=snap_a.corpus_id)
        cov_b = await dal.get_coverage(corpus_id=snap_b.corpus_id)
        return compare_snapshots(snap_a, snap_b, rules_a, rules_b, cov_a, cov_b)

    diff = _run(_diff())
    if diff is None:
        raise typer.Exit(1)

    console.print(Panel(f"[bold]Snapshot Diff:[/bold] {snapshot_a[:12]}… → {snapshot_b[:12]}…", expand=False))
    console.print(f"  Rules added:      [green]{len(diff.added_rule_ids)}[/green]")
    console.print(f"  Rules removed:    [red]{len(diff.removed_rule_ids)}[/red]")
    console.print(f"  New techniques:   [green]{len(diff.new_technique_mappings)}[/green]")
    console.print(f"  Newly covered:    [green]{len(diff.newly_covered_techniques)}[/green]")
    console.print(f"  Newly gapped:     [red]{len(diff.newly_gapped_techniques)}[/red]")
    console.print(f"  Coverage delta:   [bold]{diff.coverage_delta:+.2f}[/bold]")


# ---------------------------------------------------------------------------
# validate  — validate Sigma rules
# ---------------------------------------------------------------------------

@app.command("validate")
def cmd_validate(
    rules_dir: str = typer.Argument(..., help="Directory containing Sigma rules"),
    recursive: bool = typer.Option(True, "--recursive/--no-recursive"),
    strict: bool = typer.Option(False, "--strict", help="Exit 1 if any warnings found"),
):
    """Validate Sigma rules for structural correctness without ingesting them."""
    from blind_engine.sigma.parser import parse_directory
    from blind_engine.sigma.validator import validate_rule

    console.print(f"[cyan]Validating rules in:[/cyan] {rules_dir}")
    summary, rules = parse_directory(rules_dir, corpus_id="validate", recursive=recursive)

    results = [validate_rule(r) for r in rules]
    errors = [r for r in results if r.errors]
    warnings_only = [r for r in results if r.warnings and not r.errors]

    console.print(f"Total rules: [bold]{len(rules)}[/bold]")
    console.print(f"Errors:      [red]{len(errors)}[/red]")
    console.print(f"Warnings:    [yellow]{len(warnings_only)}[/yellow]")
    console.print(f"Clean:       [green]{len(results) - len(errors) - len(warnings_only)}[/green]")

    for r in errors[:10]:
        console.print(f"  [red]ERROR[/red] {r.rule_id}: {'; '.join(r.errors)}")

    exit_code = 0
    if errors:
        exit_code = 1
    elif strict and warnings_only:
        exit_code = 1
    if exit_code:
        raise typer.Exit(exit_code)


# ---------------------------------------------------------------------------
# db-init  — initialise the database schema
# ---------------------------------------------------------------------------

@app.command("db-init")
def cmd_db_init(
    db_path: Optional[str] = typer.Option(None, "--db", help="SQLite database path"),
    force: bool = typer.Option(False, "--force", "-f", help="Drop and recreate all tables"),
):
    """Initialise the BLIND SQLite database schema."""
    from blind_engine.db.dal import BlindDAL

    db = _resolve_db(db_path)
    console.print(f"[cyan]Initialising database:[/cyan] {db}")

    async def _init():
        dal = BlindDAL(db)
        if force:
            await dal.drop_all()
        await dal.initialize()

    _run(_init())
    console.print("[green]Database ready.[/green]")


# ---------------------------------------------------------------------------
# version  — show version information
# ---------------------------------------------------------------------------

@app.command("version")
def cmd_version():
    """Show BLIND version information."""
    try:
        from importlib.metadata import version as pkg_version
        ver = pkg_version("blind")
    except Exception:
        ver = "development"
    console.print(f"[bold cyan]BLIND[/bold cyan] — Detection Coverage Intelligence Platform")
    console.print(f"Version: [bold]{ver}[/bold]")
    console.print("Python:  " + sys.version.split()[0])


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    app()


if __name__ == "__main__":
    main()
