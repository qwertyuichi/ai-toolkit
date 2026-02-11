import collections
import os

import torch


def matches_known_auto8bit_formats(value: dict) -> bool:
    if value.get("_type") == "Auto8bitTensor" and "state" in value and isinstance(value["state"], dict):
        inner = value["state"]
        return {"quantized", "scale", "orig_dtype"}.issubset(inner.keys())

    return {"quantized", "scale", "orig_dtype"}.issubset(value.keys())


def main() -> None:
    path = os.environ.get("OPTIMIZER_PT") or r"D:\ai-toolkit\output\TEST_copy\optimizer.pt"
    print("path:", path)
    print("exists:", os.path.exists(path))

    d = torch.load(path, weights_only=True)
    print("top-level keys:", list(d.keys()))

    st = d.get("state", {})
    print("state entries:", len(st))

    keysets = collections.Counter()
    bad = 0
    sample_bad = None

    for pid, ps in st.items():
        v = ps.get("exp_avg")
        if isinstance(v, dict):
            ks = tuple(sorted(v.keys()))
            keysets[ks] += 1
            if not matches_known_auto8bit_formats(v):
                bad += 1
                if sample_bad is None:
                    sample_bad = {
                        "param_id": pid,
                        "keys": list(v.keys()),
                        "_type": v.get("_type"),
                        "state_type": type(v.get("state")).__name__,
                        "state_keys": list(v.get("state", {}).keys())[:20]
                        if isinstance(v.get("state"), dict)
                        else None,
                    }

    print("unique exp_avg keysets:", len(keysets))
    print("top 10 keysets:")
    for ks, count in keysets.most_common(10):
        print(" ", count, ks)

    print("bad formats:", bad)
    print("sample_bad:", sample_bad)


if __name__ == "__main__":
    main()
