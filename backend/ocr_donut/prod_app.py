"""
Production-ready Donut OCR FastAPI service (example)

Notes:
- This is an example of loading a vision->seq2seq model like Donut from Hugging Face.
- Set environment variables:
  - DONUT_MODEL: HF model id (e.g. 'naver-clova/ix-donut-base' or the official Donut model you intend to use)
  - USE_CUDA=true to prefer GPU when available

GPU notes:
- For GPU inference use a machine with an NVIDIA GPU + CUDA drivers installed.
- In Docker, use the NVIDIA Container Toolkit and base image like `nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04`.
- Increase container memory and consider fp16/accelerate for performance.

This service provides `/extract` which accepts `multipart/form-data` file upload and returns extracted text.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import io
from PIL import Image
import os
import torch

app = FastAPI(title="Donut OCR Production")

DONUT_MODEL = os.environ.get('DONUT_MODEL', 'naver-clova/ix-donut-base')
USE_CUDA = os.environ.get('USE_CUDA', 'false').lower() in ('1','true','yes')
DEVICE = 'cuda' if USE_CUDA and torch.cuda.is_available() else 'cpu'

# Lazily import heavy HF objects
processor = None
model = None

class OCRResponse(BaseModel):
    text: str

@app.on_event('startup')
async def load_model():
    global processor, model
    try:
        # Import here to avoid importing heavy libs if not used
        from transformers import DonutProcessor, VisionEncoderDecoderModel
        # Some Donut forks provide a processor class; change to the specific processor if different
        processor = DonutProcessor.from_pretrained(DONUT_MODEL)
        model = VisionEncoderDecoderModel.from_pretrained(DONUT_MODEL)
        model.to(DEVICE)
        # Optionally enable half precision if using CUDA and model supports it
        if DEVICE == 'cuda':
            try:
                model.half()
            except Exception:
                pass
    except Exception as e:
        # If model load fails, we keep processor/model None to allow fallback
        processor = None
        model = None
        app.logger = getattr(app, 'logger', None)
        print('Warning: Donut model failed to load at startup:', str(e))


@app.get('/health')
async def health():
    return {
        'status': 'ok',
        'device': DEVICE,
        'model_loaded': bool(model is not None)
    }


@app.post('/warmup')
async def warmup():
    """Run a small dummy inference to warm GPU and model caches."""
    if not model:
        return {'ok': False, 'reason': 'model not loaded'}
    try:
        import torch
        # create a small dummy input tensor matching expected dimensions
        dummy = torch.zeros((1, 3, 224, 224), device=DEVICE)
        with torch.no_grad():
            _ = model.generate(dummy, max_length=10)
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


@app.post('/extract', response_model=OCRResponse)
async def extract(file: UploadFile = File(...)):
    content = await file.read()
    # Try to run inference with Donut if loaded
    if processor and model:
        try:
            image = Image.open(io.BytesIO(content)).convert('RGB')
            pixel_values = processor(image, return_tensors='pt').pixel_values.to(DEVICE)
            generated_ids = model.generate(pixel_values, max_length=512)
            # The processor's decode or tokenizer will vary by implementation
            if hasattr(processor, 'decode'):
                text = processor.decode(generated_ids[0], skip_special_tokens=True)
            else:
                from transformers import AutoTokenizer
                tokenizer = AutoTokenizer.from_pretrained(DONUT_MODEL)
                text = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
            return OCRResponse(text=text)
        except Exception as e:
            # Fall through to fallback
            print('Donut inference failed:', str(e))

    # Fallback simple OCR: use pytesseract if installed in the environment
    try:
        import pytesseract
        image = Image.open(io.BytesIO(content)).convert('RGB')
        text = pytesseract.image_to_string(image)
        return OCRResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'OCR failed: {str(e)}')
