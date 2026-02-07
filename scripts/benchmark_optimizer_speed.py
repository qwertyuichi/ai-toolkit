import argparse
import copy
import os
import re
import subprocess
import sys
import time
from pathlib import Path

import yaml


TRAIN_LOOP_RE = re.compile(r"^\s*-\s*([0-9.]+)s\s+avg\s+-\s+train_loop\b")


def _load_yaml(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def _dump_yaml(data: dict, path: Path) -> None:
    with path.open("w", encoding="utf-8") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)


def _set_nested(d: dict, keys: list[str], value) -> None:
    cur = d
    for k in keys[:-1]:
        if k not in cur or cur[k] is None:
            cur[k] = {}
        cur = cur[k]
    cur[keys[-1]] = value


def _get_process0(cfg: dict) -> dict:
    try:
        return cfg["config"]["process"][0]
    except Exception as e:
        raise ValueError("Config must have config.process[0]") from e


def _prepare_bench_config(
    base_cfg: dict,
    *,
    optimizer: str,
    steps: int,
    perf_every: int,
    run_dir: Path,
) -> dict:
    cfg = copy.deepcopy(base_cfg)
    p0 = _get_process0(cfg)

    # Isolate artifacts per optimizer so we don't resume from a previous run.
    run_dir.mkdir(parents=True, exist_ok=True)
    p0["training_folder"] = run_dir.as_posix()
    p0["sqlite_db_path"] = (run_dir / "bench.db").as_posix()

    # Make the job name unique to avoid collisions in logs/UI.
    if isinstance(cfg.get("config"), dict):
        base_name = str(cfg["config"].get("name") or "bench")
        cfg["config"]["name"] = f"{base_name}_{optimizer}"

    # Make sure perf logs appear.
    p0["performance_log_every"] = int(perf_every)

    train = p0.setdefault("train", {})
    train["optimizer"] = optimizer
    train["steps"] = int(steps)
    train["disable_sampling"] = True

    # Avoid save overhead during benchmark.
    save = p0.setdefault("save", {})
    # If save_every is unset/0, do nothing; otherwise push it out.
    save["save_every"] = int(steps) + 1
    save["max_step_saves_to_keep"] = 1

    # Keep sampling completely off even if user has sample config.
    sample = p0.get("sample")
    if isinstance(sample, dict):
        sample["sample_every"] = int(steps) + 1

    return cfg


def _run_job(repo_root: Path, *, config_path: Path, log_path: Path) -> int:
    cmd = [sys.executable, str(repo_root / "run.py"), str(config_path), "-l", str(log_path)]
    print("\n=== Running ===")
    print(" ", " ".join(cmd))
    start = time.time()
    proc = subprocess.run(cmd, cwd=str(repo_root))
    elapsed = time.time() - start
    print(f"=== Done (exit={proc.returncode}) in {elapsed:.1f}s ===")
    return proc.returncode


def _extract_train_loop_avgs(log_path: Path) -> list[float]:
    values: list[float] = []
    with log_path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            m = TRAIN_LOOP_RE.match(line)
            if m:
                values.append(float(m.group(1)))
    return values


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark optimizer speed (adafactor vs adamw8) using AI Toolkit timer logs")
    parser.add_argument("--config", required=True, help="Path to a training config YAML (job config)")
    parser.add_argument("--optimizers", nargs="+", default=["adamw8", "adafactor"], help="Optimizers to benchmark")
    parser.add_argument("--steps", type=int, default=3, help="Total steps to run for each optimizer")
    parser.add_argument("--perf-every", type=int, default=1, help="performance_log_every interval")
    parser.add_argument("--take-last", type=int, default=3, help="Use last N printed train_loop averages for summary")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    base_config_path = Path(args.config).resolve()

    if not base_config_path.exists():
        raise FileNotFoundError(str(base_config_path))

    base_cfg = _load_yaml(base_config_path)

    out_dir = repo_root / "output" / "bench_optimizer" / time.strftime("%Y%m%d_%H%M%S")
    out_dir.mkdir(parents=True, exist_ok=True)

    results: dict[str, dict] = {}

    for opt in args.optimizers:
        run_dir = out_dir / opt
        bench_cfg = _prepare_bench_config(
            base_cfg,
            optimizer=opt,
            steps=args.steps,
            perf_every=args.perf_every,
            run_dir=run_dir,
        )

        cfg_path = out_dir / f"bench_{opt}.yaml"
        log_path = out_dir / f"bench_{opt}.log"
        _dump_yaml(bench_cfg, cfg_path)

        code = _run_job(repo_root, config_path=cfg_path, log_path=log_path)
        if code != 0:
            results[opt] = {"exit": code, "log": str(log_path)}
            continue

        avgs = _extract_train_loop_avgs(log_path)
        tail = avgs[-args.take_last :] if avgs else []
        mean_tail = sum(tail) / len(tail) if tail else None

        results[opt] = {
            "exit": code,
            "log": str(log_path),
            "train_loop_avgs": avgs,
            "tail": tail,
            "mean_tail": mean_tail,
        }

    print("\n=== Summary (train_loop sec/iter; lower is faster) ===")
    for opt, r in results.items():
        if r.get("exit") != 0:
            print(f"- {opt}: FAILED (exit={r.get('exit')}) log={r.get('log')}")
            continue
        mean_tail = r.get("mean_tail")
        tail = r.get("tail")
        if mean_tail is None:
            print(f"- {opt}: no train_loop timings found in log. log={r.get('log')}")
        else:
            print(f"- {opt}: {mean_tail:.4f} sec/iter (from last {len(tail)} prints: {', '.join(f'{x:.4f}' for x in tail)})")

    print(f"\nArtifacts saved to: {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
