"""File upload endpoints"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from typing import List, Text
import io
import logging
import pandas as pd

from app.routers import status
from app.services.csv_service import CSVService
from app.services.pdf_service import PDFService
from app.services.job_service import JobManager, JobProcessor
from app.services.data_storage_service import DataStorageService
from app.models.request_models import CategoryField
from app.config import settings
from app.utils.text import TextProcessor

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/csv")
async def upload_csv(
    file: UploadFile = File(...),
    categories_json: str = Form(...),
    provider: str = Form(...),
    model: str = Form(...),
    api_key: str = Form(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload CSV file and start extraction job
    Each CSV row = 1 to process
    In rows expecting "title" and "abstract" or "text" columns.
    """
    import json

    try: 
        categories = [CategoryField(**c) for c in json.loads(categories_json)]
        csv_bytes = await file.read()
        csv_text = csv_bytes.decode('utf-8')
        df = CSVService.load_csv(csv_text)
        
        id_col = 'id' if 'id' in df.columns else df.columns[0]
        text_col = 'abstract' if 'abstract' in df.columns else 'text' if 'text' in df.columns else df.columns[1]
        
        rows = CSVService.extract_rows(df, id_col, text_col)

        enriched_rows = []
        for row in rows:
            text = row.get("text", "")
            sentences = TextProcessor.split_sentences(text)
            sentence_offsets = TextProcessor.get_sentence_offsets(text, sentences)

            enriched_rows.append({
                **row,
                "sentences": sentences,
                "sentence_offsets": sentence_offsets
            })

        job_id = JobManager.create_job(
            categories=categories,
            provider=provider,
            model=model,
            rows=len(rows)
        )

        DataStorageService.store_job_rows(job_id, enriched_rows)

        DataStorageService.store_file_metadata(
            file_id=job_id,
            file_type="csv",
            filename=file.filename,
            columns=df.columns.tolist()
        )

        background_tasks.add_task(
            JobProcessor.process_job,
            job_id=job_id,
            categories=categories,
            provider=provider,
            model=model,
            api_key=api_key
        )
    
        return {
            "job_id": job_id,
            "status": "submitted",
            "total_rows": len(rows),
            "message": f"Processing {len(rows)} CSV rows"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pdf")
async def upload_pdf(
    files: List[UploadFile] = File(...),
    categories_json: str = Form(...),
    provider: str = Form(...),
    model: str = Form(...),
    api_key: str = Form(...),
    background_tasks: BackgroundTasks = None
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
            pdf_content = await file.read()
            is_valid, error = PDFService.validate_pdf(pdf_content)
            if not is_valid:
                raise HTTPException(status_code=400, detail=f"{file.filename}: {error}")

            text = PDFService.extract_text(pdf_content)

            sentences = TextProcessor.split_sentences(text)
            sentence_offsets = TextProcessor.get_sentence_offsets(text, sentences)

            rows.append({
                "id": f"pdf_{idx}_{file.filename}",
                "text": text,
                "source": file.filename,
                "sentences": sentences,
                "sentence_offsets": sentence_offsets
            })

        job_id = JobManager.create_job(
            categories=categories,
            provider=provider,
            model=model,
            rows=len(rows)
        )

        DataStorageService.store_job_rows(job_id, rows)

        filenames = [file.filename for file in files]
        DataStorageService.store_file_metadata(
            file_id=job_id,
            file_type="pdf",
            filename=",".join(filenames),
            columns=["id","text","source"]
        )
        
        background_tasks.add_task(
            JobProcessor.process_job,
            job_id=job_id,
            categories=categories,
            provider=provider,
            model=model,
            api_key=api_key
        )

        return {
            "job_id": job_id,
            "status": "submitted",
            "total_pdfs": len(rows),
            "message": f"Processing {len(rows)} PDF files"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@router.get("/validate")
async def validate_file(file_id: str):
    """
    Check if uploaded file is valid
    
    Input: file_id from upload response
    Output: validation result
    """
    if not DataStorageService.file_exists(file_id):
        raise HTTPException(
            status_code=404,
            detail=f"File {file_id} not found. Did you upload it?"
        )
    
    file_data = DataStorageService.get_file_metadata(file_id)
    
    return {
        "file_id": file_id,
        "is_valid": True,
        "type": file_data.get("type", "unknown"),
        "filename": file_data.get("filename"),
        "columns": file_data.get("columns", [])
    }