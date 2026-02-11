"""Integration test fixtures for deploying contracts to GenLayer Studio.

Prerequisites:
    - GenLayer Studio running locally (genlayer up) OR using studionet
    - gltest.config.yaml configured with network and accounts
    - Python venv with genlayer-test installed

Usage:
    # Run integration tests against local GenLayer Studio:
    cd /path/to/internetcourt
    gltest contracts/tests/integration/ -m integration --network localnet -v

    # Run against studionet (shared hosted environment):
    gltest contracts/tests/integration/ -m integration --network studionet -v
"""

import json
import pytest
from gltest import get_contract_factory, create_account
from gltest.accounts import get_default_account, create_accounts


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "integration: marks tests that deploy to a real GenLayer network (deselect with '-m \"not integration\"')",
    )


@pytest.fixture(scope="session")
def deployer_account():
    """The default account used for deploying contracts."""
    return get_default_account()


@pytest.fixture(scope="session")
def test_accounts():
    """Create a set of test accounts for multi-party interactions.

    Returns a dict with named accounts:
        - alice: contract creator / party A
        - bob: party B / counterparty
        - charlie: third party (should be rejected)
        - factory_owner: factory contract deployer
    """
    accounts = create_accounts(4)
    return {
        "alice": accounts[0],
        "bob": accounts[1],
        "charlie": accounts[2],
        "factory_owner": accounts[3],
    }


@pytest.fixture(scope="session")
def internetcourt_factory():
    """Get a ContractFactory for InternetCourt.py."""
    return get_contract_factory(contract_file_path="contracts/InternetCourt.py")


@pytest.fixture(scope="session")
def factory_contract_factory():
    """Get a ContractFactory for InternetCourtFactory.py."""
    return get_contract_factory(contract_file_path="contracts/InternetCourtFactory.py")
