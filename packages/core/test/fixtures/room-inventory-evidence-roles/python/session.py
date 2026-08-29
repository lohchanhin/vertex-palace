from session_parser import parse_session_payload
from session_compatibility import preserve_legacy_session


def open_session(payload: str) -> str:
    parsed = parse_session_payload(payload)
    return preserve_legacy_session(parsed)
