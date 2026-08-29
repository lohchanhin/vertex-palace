from session import py_build_session


def test_py_build_session():
    assert py_build_session(" ok ") == "ok"
