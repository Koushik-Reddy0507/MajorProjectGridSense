"""
GridSense SQLAlchemy Models
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, LargeBinary, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime

Base = declarative_base()


class UserProfile(Base):
    """User profile"""
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DatasetRecord(Base):
    """Dataset metadata"""
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("profiles.id"), nullable=False)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    format = Column(String(10), nullable=False)  # csv, xlsx
    description = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String(20), default="uploading")  # uploading, validating, processing, completed, failed
    quality_score = Column(Float, nullable=True)
    rows_count = Column(Integer, nullable=True)
    columns_count = Column(Integer, nullable=True)
    timestamp_column = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    storage_path = Column(Text, nullable=True)

    user = relationship("UserProfile", backref="datasets")


class DataQualityReportModel(Base):
    """Data quality report"""
    __tablename__ = "data_quality_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    total_rows = Column(Integer, nullable=False)
    total_columns = Column(Integer, nullable=False)
    missing_values_count = Column(Integer, default=0)
    duplicate_rows = Column(Integer, default=0)
    missing_values_percentage = Column(Float, default=0)
    duplicate_percentage = Column(Float, default=0)
    quality_score = Column(Float, default=0)
    report_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModelRegistryEntry(Base):
    """Trained model registry"""
    __tablename__ = "model_registry"

    id = Column(String(36), primary_key=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    target_column = Column(String(255), nullable=False)
    model_type = Column(String(100), nullable=False)
    training_records = Column(Integer)
    features = Column(JSON)
    evaluation_metrics = Column(JSON)
    model_version = Column(String(20), default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)