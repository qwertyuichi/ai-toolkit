import os

from toolkit.warnings import warn


def _is_windows_rocm() -> bool:
    if os.name != "nt":
        return False
    try:
        import torch

        return getattr(torch.version, "hip", None) is not None
    except Exception:
        return False


def is_bitsandbytes_available() -> bool:
    # bitsandbytes is not supported on Windows+ROCm; treat it as unavailable
    # to avoid presenting unusable optimizer/quantization options.
    if _is_windows_rocm():
        return False
    try:
        import bitsandbytes  # noqa: F401
        from bitsandbytes import cextension

        # Ensure the native extension can actually be loaded.
        return getattr(cextension, "lib", None) is not None
    except Exception:
        return False


def require_bitsandbytes(context: str) -> bool:
    if is_bitsandbytes_available():
        return True
    warn(f"bitsandbytes is not available. {context}")
    return False
