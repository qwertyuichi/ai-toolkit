import os
from typing import Optional

ROCM_REQUIRED_VERSION = "7.2"
ROCM_REQUIRED_MESSAGE = "ROCm 7.2 not detected. This build requires ROCm on Windows."


class RocmNotDetectedError(RuntimeError):
    pass


def _normalize_version(version: Optional[str]) -> str:
    if version is None:
        return ""
    return str(version).strip()


def get_rocm_version() -> str:
    try:
        import torch
    except Exception:
        return ""
    return _normalize_version(getattr(torch.version, "hip", None))


def is_rocm_available() -> bool:
    try:
        import torch
    except Exception:
        return False
    return torch.cuda.is_available() and get_rocm_version() != ""


def assert_rocm_available() -> None:
    version = get_rocm_version()
    if not is_rocm_available():
        raise RocmNotDetectedError(ROCM_REQUIRED_MESSAGE)
    if not version.startswith(ROCM_REQUIRED_VERSION):
        raise RocmNotDetectedError(ROCM_REQUIRED_MESSAGE)
