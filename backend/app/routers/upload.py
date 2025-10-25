"""File upload endpoints"""
from backend.app.routers import status
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import List
import io
import pandas as pd
from app.services.pdf_service import PDFService
from app.services.job_service import JobManager
from app.services.data_storage_service import DataStorageService
from app.models.request_models import CategoryField

router = APIRouter()

@router.post("/csv")
def upload_csv(
    file: UploadFile = File(...),
    categories_json: str = Form(...),
    provider: str = Form(...),
    model: str = Form(...)
):
    """
    Upload CSV file and start extraction job
    Each CSV row = 1 to process
    In rows expecting "title" and "abstract" or "text" columns.
    """
    import json

    try: 
        categories = [CategoryField(**c) for c in json.loads(categories_json)]
        csv_content = file.read()
        df = pd.read_csv(io.BytesIO(csv_content))
        rows = []
        for idx, row in df.iterrows():
            abstract = row.get("abstract", "") or row.get("text")
            title = row.get("title", "")
            text = f"{title}\n{abstract}" if title else abstract
            rows.append({
                "id": str(idx),
                "text": text
            })

        job_id = JobManager.create_job(
            categories=categories,
            provider=provider,
            model=model,
            rows=len(rows)
        )

        DataStorageService.store_job_rows(job_id, rows)
    
        return {
            "job_id": job_id,
            "status": "submitted",
            "total_rows": len(rows),
            "message": f"Processing {len(rows)} CSV rows"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf")
def upload_pdf(
    files: List[UploadFile] = File(...),
    categories_json: str = Form(...),
    provider: str = Form(...),
    model: str = Form(...)
):
    """
    Upload multiple PDF files and start extraction job
    Each PDF = 1 row to process
    
    """
    import json

    try:
        categories = [CategoryField(**c) for c in json.loads(categories_json)]

        rows = []
        for idx, file in enumerate(files):
            pdf_content = file.read()

            is_valid, error = PDFService.validate_pdf(pdf_content)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"{file.filename}: {error}")

            text = PDFService.extract_text(pdf_content)

            rows.append({
                "id": f"pdf_{idx}_{file.filename}",
                "text": text,
                "source": file.filename
            })

        job_id = JobManager.create_job(
            categories=categories,
            provider=provider,
            model=model,
            rows=len(rows)
        )

        DataStorageService.store_job_rows(job_id, rows)
        
        return {
            "job_id": job_id,
            "status": "submitted",
            "total_pdfs": len(rows),
            "message": f"Processing {len(rows)} PDF files"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))