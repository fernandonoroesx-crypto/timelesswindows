from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import pymupdf
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "PDF Converter API is running"}

@app.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        pdf_document = pymupdf.open(stream=contents, filetype="pdf")
        
        # Example: convert first page to image
        pix = pdf_document[0].get_pixmap()
        img_data = pix.tobytes("png")
        
        return FileResponse(
            io.BytesIO(img_data),
            media_type="image/png",
            filename="converted.png"
        )
    except Exception as e:
        return {"error": str(e)}
