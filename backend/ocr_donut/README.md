Donut OCR Production Service

Overview

This directory contains a production-oriented FastAPI service (`prod_app.py`) that demonstrates loading a Hugging Face vision->seq2seq model (Donut-style) and serving it with a simple `/extract` endpoint.

Environment

- `DONUT_MODEL` (optional): HF model id to load. Replace with the exact Donut model you plan to use (e.g. a vetted `naver-clova` or private model path).
- `USE_CUDA=true` (optional): prefer GPU when available.
- `DONUT_PORT` (optional): port to run the service on (default 8000).

Docker (GPU)

For GPU inference use the NVIDIA Container Toolkit and a CUDA base image. Example Dockerfile notes:

- Use `FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04` as base.
- Install system deps: libgl1-mesa-glx, libglib2.0-0, git, ffmpeg, python3-dev.
- Install Python deps from `requirements.txt` including `transformers`, `torch`, `accelerate`, and model-specific libs.
- Launch container with `--gpus all` and ensure host has compatible NVIDIA drivers.

Performance notes

- Use FP16 (`model.half()`) for faster inference and lower memory if supported.
- Use batching for multiple images.
- For high throughput, consider model sharding or inference server (TorchServe / Triton / vLLM for LLM-like workloads).

Security

- Protect the `/extract` endpoint behind the API gateway and require auth.
- Limit file sizes and validate file types before model inference.

Integration

- Set `DONUT_URL` to `http://host:PORT` and the existing upload route will call this service automatically (the upload flow already prefers Donut when `DONUT_URL` is set).

Integration

- Set `DONUT_URL` to `http://host:PORT` and the existing upload route will call this service automatically (the upload flow already prefers Donut when `DONUT_URL` is set).

Running GPU image (example)

1. Ensure host has NVIDIA drivers and the NVIDIA Container Toolkit installed.
2. From repo root run (bash):

```bash
./scripts/run_donut_gpu.sh
```

Or on Windows PowerShell:

```powershell
.\scripts\run_donut_gpu.ps1
```

Notes

- If your Docker Compose ignores the `deploy.resources` GPU reservation (Docker Desktop), run the container manually with `docker run --gpus all` or use a Compose implementation that supports GPU reservations.
- Warm-up: call the `/warmup` endpoint after the container becomes healthy to prime model caches and CUDA memory.

Further steps

- Swap `DONUT_MODEL` to a validated production model.
- Add warm-up requests on container start to preload caches (use `/warmup`).
- Monitor GPU memory and latency; add autoscaling policies.
