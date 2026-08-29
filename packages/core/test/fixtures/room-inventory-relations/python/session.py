def py_hash_session(value: str) -> str:
    return value.strip()


def py_build_session(value: str) -> str:
    return py_hash_session(value)


class PySession:
    def refresh(self, value: str) -> bool:
        return value != ""


class PyPrimary:
    def resolve(self) -> int:
        return 1


class PySecondary:
    def resolve(self) -> int:
        return 2


def py_use_resolver(resolve):
    return resolve()
