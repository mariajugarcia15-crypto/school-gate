"""Local CPU OCR. Models ship with the pinned RapidOCR wheel."""
import io
import logging
import os
import threading
import warnings
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException, Request
from PIL import Image, ImageOps, UnidentifiedImageError
import rapidocr_onnxruntime
from rapidocr_onnxruntime import RapidOCR
from starlette.concurrency import run_in_threadpool

from plates import select_plate

MAX_BYTES = 5 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 16_000_000
logger = logging.getLogger("school_gate.ocr")


def create_engine():
    models = Path(rapidocr_onnxruntime.__file__).parent / "models"
    names = {
        "det_model_path": "ch_PP-OCRv4_det_infer.onnx",
        "rec_model_path": "ch_PP-OCRv4_rec_infer.onnx",
        "cls_model_path": "ch_ppocr_mobile_v2.0_cls_infer.onnx",
    }
    paths = {key: str(models / name) for key, name in names.items()}
    for path in paths.values():
        if not Path(path).is_file():
            raise RuntimeError("Faltan modelos locales. Reinstala ocr-service/requirements.txt.")
    ort.disable_telemetry_events()
    return RapidOCR(
        **paths, intra_op_num_threads=4, inter_op_num_threads=1,
        det_use_cuda=False, cls_use_cuda=False, rec_use_cuda=False,
        det_use_dml=False, cls_use_dml=False, rec_use_dml=False,
        text_score=0.5,
    )


def decode_image(data):
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as source:
                if source.format not in {"JPEG", "PNG", "WEBP"}:
                    raise HTTPException(400, "Usa una imagen JPEG, PNG o WebP.")
                rgb = ImageOps.exif_transpose(source).convert("RGB")
                rgb.thumbnail((1920, 1920))
                return cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2BGR)
    except (Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(413, "La imagen supera los 16 megapíxeles.")
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, "La imagen no es válida o está dañada.")


def create_app(engine_factory=create_engine):
    lock = threading.Lock()

    @asynccontextmanager
    async def lifespan(app):
        threshold = float(os.environ.get("OCR_MIN_SCORE", "0.90"))
        if not 0.5 <= threshold <= 1:
            raise RuntimeError("OCR_MIN_SCORE debe estar entre 0.5 y 1.")
        app.state.min_score = threshold
        app.state.engine = engine_factory()
        yield

    app = FastAPI(title="School Gate OCR local", lifespan=lifespan)

    @app.get("/health")
    def health():
        return {"status": "ok", "engine": "paddleocr-onnx", "offline": True}

    def recognize(data):
        if not lock.acquire(blocking=False):
            raise HTTPException(429, "El lector está ocupado. Intenta de nuevo.")
        try:
            frame = decode_image(data)
            result, _ = app.state.engine(frame)
            readings = [(str(row[1]), float(row[2])) for row in (result or [])]
            return select_plate(readings, app.state.min_score)
        except HTTPException:
            raise
        except Exception:
            logger.exception("Error procesando imagen con el motor local")
            raise HTTPException(500, "No se pudo procesar la imagen.")
        finally:
            lock.release()

    @app.post("/recognize")
    async def recognize_request(request: Request):
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > MAX_BYTES:
                raise HTTPException(413, "La imagen supera los 5 MB.")
        if not data:
            raise HTTPException(400, "Imagen requerida.")
        return await run_in_threadpool(recognize, bytes(data))

    return app


app = create_app()
