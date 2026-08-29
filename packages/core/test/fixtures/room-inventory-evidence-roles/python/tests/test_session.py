from session import open_session


def test_open_session_preserves_legacy_payloads() -> None:
    assert open_session(" Account ") == "legacy:account"
