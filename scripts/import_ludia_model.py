"""
import_ludia_model.py — ludia-health AI 엔진에서 학습된 LUDIA LAB 병소 모델을 가져와 models/ludia_lab/ 에 설치한다.

전제: ludia-health 쪽에서 AI 엔진이 실행 중이어야 한다 (비밀번호는 그 터미널에만 있음)
    cd ~/ludia-health/ai-engine && ./start_lab.sh

사용:
    python3 scripts/import_ludia_model.py --run 12                      # run #12 내보내기 + 설치
    python3 scripts/import_ludia_model.py --run 12 --engine http://localhost:8765
    python3 scripts/import_ludia_model.py --zip ~/ludia-health/ai-engine/data/lab_exports/run_91234_export.zip

설치 결과(models/ludia_lab/):
    model.onnx, model_card.json, organ_map.json(눈별 장기지도, 압축 형태), README.txt
원본 홍채 사진은 가져오지 않는다 — 모델 가중치와 장기지도만 옮긴다.
"""

from __future__ import annotations

import argparse
import io
import json
import shutil
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "models" / "ludia_lab"
RINGS, SECTORS = 30, 120   # ludia-health lab.html MAP_RINGS / MAP_SECTORS 와 동일


def _get(url: str, data: dict | None = None, timeout: int = 600) -> bytes:
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None,
                                 headers={"Content-Type": "application/json"} if data is not None else {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{url} → HTTP {e.code}: {e.read().decode(errors='replace')[:300]}")
    except urllib.error.URLError as e:
        raise SystemExit(f"AI 엔진에 연결할 수 없습니다({url}): {e.reason}\n  → ~/ludia-health/ai-engine/start_lab.sh 를 먼저 실행하세요.")


def compact_organ_maps(maps: list) -> dict:
    """api.php get_iris_organ_map 응답 → {eye: {rings, sectors, names, idx}} (lab.html ensureOrganMaps 와 같은 환산)."""
    out = {}
    for m in maps:
        eye = m.get("eye")
        if eye not in ("left", "right"):
            continue
        rs = RINGS / (m.get("grid_rings") or RINGS)
        ss = SECTORS / (m.get("grid_sectors") or SECTORS)
        idx = [-1] * (RINGS * SECTORS)
        names: list[str] = []
        for c in m.get("cells") or []:
            organ = c.get("organ")
            if not organ:
                continue
            ri = min(RINGS - 1, int(c["ring"] * rs))
            si = min(SECTORS - 1, int(c["sector"] * ss))
            if organ not in names:
                names.append(organ)
            idx[ri * SECTORS + si] = names.index(organ)
        out[eye] = {"rings": RINGS, "sectors": SECTORS, "names": names, "idx": idx}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", type=int, help="LUDIA LAB 학습 run 번호 (AI 엔진에서 내보내기)")
    ap.add_argument("--zip", type=Path, help="이미 만든 내보내기 묶음 run_<id>_export.zip (엔진 불필요)")
    ap.add_argument("--organ-map", type=Path, help="get_iris_organ_map 응답 JSON 파일 (엔진 없이 장기지도 설치)")
    ap.add_argument("--engine", default="http://localhost:8765")
    a = ap.parse_args()
    if not a.run and not a.zip:
        ap.error("--run 또는 --zip 중 하나가 필요합니다")
    eng = a.engine.rstrip("/")

    if a.zip:
        print(f"① 내보내기 묶음 읽기: {a.zip}")
        z = zipfile.ZipFile(a.zip.expanduser())
    else:
        print(f"① run #{a.run} ONNX 내보내기 (PyTorch↔ONNX 수치 검증 포함)…")
        r = json.loads(_get(f"{eng}/lab/export", {"run_id": a.run}))
        print(f"   클래스 {len(r['classes'])}개, 입력 {r['img_size']}px, 검증 오차 {r['max_abs_diff']:.1e}")
        print("② 묶음 다운로드…")
        z = zipfile.ZipFile(io.BytesIO(_get(f"{eng}{r['download']}")))
    prefix = next(n for n in z.namelist() if n.endswith("/model.onnx"))[: -len("model.onnx")]

    maps = {}
    if a.organ_map:
        raw = json.loads(a.organ_map.expanduser().read_text(encoding="utf-8"))
        maps = compact_organ_maps(raw.get("maps", raw) if isinstance(raw, dict) else raw)
    elif not a.zip:
        print("③ 장기지도 받기…")
        maps = compact_organ_maps(json.loads(_get(f"{eng}/lab/organ_map")).get("maps", []))
    elif (DEST / "organ_map.json").exists():
        maps = json.loads((DEST / "organ_map.json").read_text(encoding="utf-8"))   # 기존 설치본 유지
    desc = ", ".join("%s(%d개 장기)" % (k, len(v["names"])) for k, v in maps.items())
    print(f"   장기지도: {desc or '없음 — 장기 구역 매핑 없이 동작'}")

    tmp = DEST.with_name("ludia_lab.tmp")
    shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)
    for f in ("model.onnx", "model_card.json", "README.txt"):
        (tmp / f).write_bytes(z.read(prefix + f))
    (tmp / "organ_map.json").write_text(json.dumps(maps, ensure_ascii=False))

    # 설치 전 로드 확인
    sys.path.insert(0, str(ROOT / "iris_processing"))
    from ludia_lesion import LesionDetector
    import numpy as np
    d = LesionDetector(str(tmp))
    d.predict(np.zeros((480, 640, 3), np.uint8))

    shutil.rmtree(DEST, ignore_errors=True)
    tmp.rename(DEST)
    print(f"✅ 설치 완료: {DEST.relative_to(ROOT)} (run #{d.card.get('run_id')}, 클래스 {len(d.classes)}개) — iris_service.py 를 재시작하세요.")


if __name__ == "__main__":
    main()
