from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from PIL import Image
import io

app = FastAPI(title="Donut OCR Stub")

class OCRResponse(BaseModel):
    text: str

@app.post('/extract', response_model=OCRResponse)
async def extract(file: UploadFile = File(...)):
    # This is a lightweight stub. Replace with Donut/vision+seq2seq model integration.
    contents = await file.read()
    try:
        img = Image.open(io.BytesIO(contents))
        # Placeholder: real model inference goes here
        text = f"[donut_stub] processed image {file.filename}"
    except Exception:
        text = f"[donut_stub] processed binary file {file.filename}"
    return OCRResponse(text=text)
