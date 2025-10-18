"""File upload endpoints"""
from fastapi import APIRouter

router = APIRouter()

@router.post("/csv")
def upload_csv():
    """Upload CSV file"""
    return {"message": "CSV upload endpoint - coming soon"}


@router.post("/pdf")
def upload_pdf():
    """Upload PDF files"""
    return {"message": "PDF upload endpoint - coming soon"}