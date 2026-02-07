from toolkit.warnings import warn


def is_bitsandbytes_available() -> bool:
    try:
        import bitsandbytes  # noqa: F401
    except Exception:
        return False
    return True


def require_bitsandbytes(context: str) -> bool:
    if is_bitsandbytes_available():
        return True
    warn(f"bitsandbytes is not available. {context}")
    return False
