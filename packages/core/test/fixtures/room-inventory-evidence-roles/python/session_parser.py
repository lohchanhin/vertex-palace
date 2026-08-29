def parse_session_payload(payload: str) -> str:
    if not payload.strip():
        raise ValueError("empty session payload")
    return payload.strip().lower()
