"""Shared pytest fixtures for BLIND test suite."""
import pytest
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / "fixtures"
SIGMA_FIXTURES = FIXTURES_DIR / "sigma"


@pytest.fixture
def valid_sigma_rule_path() -> str:
    return str(SIGMA_FIXTURES / "valid-rule.yml")


@pytest.fixture
def sigma_fixtures_dir() -> str:
    return str(SIGMA_FIXTURES)
