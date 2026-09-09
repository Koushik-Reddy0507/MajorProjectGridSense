from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
import logging
from typing import Optional

from app.schemas import (
    DatasetSchema, DataQualityReportSchema, APIResponse, PaginatedResponse
)
from app.services.dataset_service import DatasetService
from app.database import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# Dependency to get dataset service
async def get_dataset_service() -> DatasetService:
    supabase = get_supabase()
    return DatasetService(supabase)


@router.post("/upload", response_model=APIResponse)
async def upload_dataset(
    file: UploadFile = File(...),
    description: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    service: DatasetService = Depends(get_dataset_service),
):
    """Upload a dataset (CSV or XLSX)"""
    try:
        dataset = await service.upload_dataset(file, description, background_tasks)
        return APIResponse(
            success=True,
            data=dataset,
            message="Dataset uploaded successfully. Processing has started."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error uploading dataset: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload dataset")


@router.get("/", response_model=PaginatedResponse)
async def list_datasets(
    page: int = 1,
    page_size: int = 10,
    service: DatasetService = Depends(get_dataset_service),
):
    """List user's datasets"""
    try:
        datasets, total = await service.list_datasets(page, page_size)
        return PaginatedResponse(
            items=datasets,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=(total + page_size - 1) // page_size,
        )
    except Exception as e:
        logger.error(f"Error listing datasets: {e}")
        raise HTTPException(status_code=500, detail="Failed to list datasets")


@router.get("/{dataset_id}", response_model=APIResponse)
async def get_dataset(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service),
):
    """Get dataset details"""
    try:
        dataset = await service.get_dataset(dataset_id)
        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")
        return APIResponse(success=True, data=dataset)
    except Exception as e:
        logger.error(f"Error getting dataset: {e}")
        raise HTTPException(status_code=500, detail="Failed to get dataset")


@router.post("/{dataset_id}/analyze", response_model=APIResponse)
async def analyze_dataset(
    dataset_id: str,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    service: DatasetService = Depends(get_dataset_service),
):
    """Trigger dataset analysis"""
    try:
        result = await service.analyze_dataset(dataset_id, background_tasks)
        return APIResponse(success=True, data=result, message="Analysis started")
    except Exception as e:
        logger.error(f"Error analyzing dataset: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze dataset")


@router.get("/{dataset_id}/quality", response_model=APIResponse)
async def get_quality_report(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service),
):
    """Get data quality report"""
    try:
        report = await service.get_quality_report(dataset_id)
        if not report:
            raise HTTPException(status_code=404, detail="Quality report not found")
        return APIResponse(success=True, data=report)
    except Exception as e:
        logger.error(f"Error getting quality report: {e}")
        raise HTTPException(status_code=500, detail="Failed to get quality report")


@router.get("/{dataset_id}/schema", response_model=APIResponse)
async def get_dataset_schema(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service),
):
    """Get detected dataset schema and column mappings"""
    try:
        schema = await service.get_detected_schema(dataset_id)
        if not schema:
            raise HTTPException(status_code=404, detail="Schema not found")
        return APIResponse(success=True, data=schema)
    except Exception as e:
        logger.error(f"Error getting schema: {e}")
        raise HTTPException(status_code=500, detail="Failed to get schema")


@router.delete("/{dataset_id}", response_model=APIResponse)
async def delete_dataset(
    dataset_id: str,
    service: DatasetService = Depends(get_dataset_service),
):
    """Delete a dataset"""
    try:
        await service.delete_dataset(dataset_id)
        return APIResponse(success=True, message="Dataset deleted successfully")
    except Exception as e:
        logger.error(f"Error deleting dataset: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete dataset")


@router.get("/{dataset_id}/preview", response_model=APIResponse)
async def get_dataset_preview(
    dataset_id: str,
    limit: int = 100,
    service: DatasetService = Depends(get_dataset_service),
):
    """Get preview of dataset records"""
    try:
        preview = await service.get_preview(dataset_id, limit)
        return APIResponse(success=True, data=preview)
    except Exception as e:
        logger.error(f"Error getting preview: {e}")
        raise HTTPException(status_code=500, detail="Failed to get preview")
