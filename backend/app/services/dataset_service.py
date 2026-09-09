import json
import logging
import io
import uuid
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any
from fastapi import UploadFile, BackgroundTasks
import pandas as pd
from supabase import Client

logger = logging.getLogger(__name__)


class DatasetService:
    """Service for handling dataset operations"""
    
    ALLOWED_FORMATS = {'.csv', '.xlsx', '.xls'}
    MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
    
    async def upload_dataset(
        self,
        file: UploadFile,
        description: Optional[str],
        background_tasks: BackgroundTasks,
    ) -> Dict[str, Any]:
        """Upload dataset file and initiate processing"""
        
        try:
            # Validate file
            self._validate_file(file)
            
            # Generate dataset ID
            dataset_id = str(uuid.uuid4())
            
            # Read file content
            content = await file.read()
            
            # Parse dataset info
            file_size = len(content)
            file_ext = self._get_file_extension(file.filename)
            
            # Detect format
            file_format = 'csv' if file_ext == '.csv' else 'xlsx'
            
            # Create dataset record in Supabase
            dataset_record = {
                'id': dataset_id,
                'filename': file.filename,
                'file_size': file_size,
                'format': file_format,
                'uploaded_at': datetime.utcnow().isoformat(),
                'processing_status': 'validating',
                'quality_score': 0,
            }
            
            # Insert into datasets table
            response = self.supabase.table('datasets').insert(dataset_record).execute()
            
            # Store file in Supabase Storage
            storage_path = f"datasets/{dataset_id}/{file.filename}"
            self.supabase.storage.from_('datasets').upload(storage_path, content)
            
            # Schedule background processing
            background_tasks.add_task(
                self._process_dataset,
                dataset_id,
                content,
                file_format
            )
            
            logger.info(f"Dataset {dataset_id} uploaded successfully")
            
            return {
                'id': dataset_id,
                'filename': file.filename,
                'processing_status': 'validating',
                'message': 'Dataset uploaded. Processing started.',
            }
        
        except Exception as e:
            logger.error(f"Error uploading dataset: {e}")
            raise
    
    async def _process_dataset(
        self,
        dataset_id: str,
        content: bytes,
        file_format: str,
    ):
        """Background task to process dataset"""
        try:
            logger.info(f"Starting processing for dataset {dataset_id}")
            
            # Update status to processing
            self.supabase.table('datasets').update({
                'processing_status': 'processing',
            }).eq('id', dataset_id).execute()
            
            # Parse data
            if file_format == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            else:  # xlsx
                df = pd.read_excel(io.BytesIO(content))
            
            # Data quality analysis
            quality_report = self._analyze_data_quality(df, dataset_id)
            
            # Detect schema
            schema = self._detect_schema(df)
            
            # Store records in database
            await self._store_records(dataset_id, df)
            
            # Store quality report
            self.supabase.table('data_quality_reports').insert(quality_report).execute()
            
            # Persist detected schema so feature pages can verify column availability
            self.supabase.table('dataset_schemas').insert({
                'dataset_id': dataset_id,
                'timestamp_column': schema.get('timestamp_column'),
                'columns': json.dumps(schema.get('columns', [])),
                'detected_variables': json.dumps(schema.get('detected_variables', {})),
                'created_at': datetime.utcnow().isoformat(),
            }).execute()
            
            # Update dataset with analysis results
            self.supabase.table('datasets').update({
                'processing_status': 'completed',
                'rows_count': len(df),
                'columns_count': len(df.columns),
                'quality_score': quality_report['quality_score'],
                'timestamp_column': schema.get('timestamp_column'),
            }).eq('id', dataset_id).execute()
            
            logger.info(f"Dataset {dataset_id} processing completed")
        
        except Exception as e:
            logger.error(f"Error processing dataset {dataset_id}: {e}")
            self.supabase.table('datasets').update({
                'processing_status': 'failed',
                'error_message': str(e),
            }).eq('id', dataset_id).execute()
    
    def _analyze_data_quality(self, df: pd.DataFrame, dataset_id: str) -> Dict[str, Any]:
        """Analyze data quality"""
        total_rows = len(df)
        total_cols = len(df.columns)
        
        missing_values = df.isnull().sum().sum()
        duplicate_rows = df.duplicated().sum()
        
        missing_pct = (missing_values / (total_rows * total_cols)) * 100 if total_rows * total_cols > 0 else 0
        duplicate_pct = (duplicate_rows / total_rows) * 100 if total_rows > 0 else 0
        
        # Calculate quality score (0-100)
        quality_score = 100 - (missing_pct * 0.5 + duplicate_pct * 0.3)
        quality_score = max(0, min(100, quality_score))
        
        return {
            'dataset_id': dataset_id,
            'total_rows': total_rows,
            'total_columns': total_cols,
            'missing_values_count': int(missing_values),
            'duplicate_rows': int(duplicate_rows),
            'missing_values_percentage': float(missing_pct),
            'duplicate_percentage': float(duplicate_pct),
            'numerical_columns': len(df.select_dtypes(include=['number']).columns),
            'categorical_columns': len(df.select_dtypes(include=['object']).columns),
            'datetime_columns': len(df.select_dtypes(include=['datetime64']).columns),
            'quality_score': float(quality_score),
            'issues': [],
            'recommendations': [],
        }
    
    def _detect_schema(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect dataset schema and column mappings"""
        schema = {
            'columns': [
                {'name': col, 'dtype': str(df[col].dtype)}
                for col in df.columns
            ],
            'timestamp_column': None,
            'detected_variables': {
                'solar_generation': [],
                'wind_generation': [],
                'renewable_generation': [],
                'electricity_demand': [],
                'battery_soc': [],
                'battery_soh': [],
                'electricity_price': [],
                'temperature': [],
                'weather': [],
                'other': [],
            }
        }
        
        # Common column name variations for different variables
        variations = {
            'solar_generation': ['solar', 'pv', 'solar_power', 'solar_gen'],
            'wind_generation': ['wind', 'wind_power', 'wind_gen'],
            'renewable_generation': ['renewable', 'total_renewable'],
            'electricity_demand': ['demand', 'consumption', 'load', 'electricity_consumption'],
            'battery_soc': ['soc', 'battery_soc', 'charge_state'],
            'battery_soh': ['soh', 'battery_soh', 'health'],
            'electricity_price': ['price', 'electricity_price', 'market_price'],
            'temperature': ['temp', 'temperature', 'celsius'],
        }
        
        # Detect columns
        for col in df.columns:
            col_lower = col.lower().strip()
            
            # Check if it's a timestamp
            if df[col].dtype == 'datetime64' or any(x in col_lower for x in ['time', 'date', 'timestamp']):
                schema['timestamp_column'] = col
                continue
            
            # Match against variations
            found = False
            for var_type, var_names in variations.items():
                if any(var_name in col_lower for var_name in var_names):
                    schema['detected_variables'][var_type].append(col)
                    found = True
                    break
            
            if not found:
                schema['detected_variables']['other'].append(col)
        
        return schema
    
    async def _store_records(self, dataset_id: str, df: pd.DataFrame):
        """Store dataset records in database"""
        # Convert DataFrame to records
        records = []
        for idx, row in df.iterrows():
            record = {'dataset_id': dataset_id}
            for col, val in row.items():
                # Handle various data types
                if pd.isna(val):
                    record[col] = None
                elif isinstance(val, (pd.Timestamp, datetime)):
                    record[col] = val.isoformat()
                else:
                    try:
                        # Handles int, float and numpy numeric scalars uniformly
                        record[col] = float(val)
                    except (TypeError, ValueError):
                        record[col] = str(val)
            records.append(record)
        
        # Batch insert records (for large datasets)
        batch_size = 1000
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                self.supabase.table('dataset_records').insert(batch).execute()
            except Exception as e:
                logger.error(f"Error storing records batch {i//batch_size}: {e}")
    
    async def list_datasets(
        self,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[Dict], int]:
        """List user's datasets"""
        try:
            # Get total count
            count_response = self.supabase.table('datasets').select('id').execute()
            total = len(count_response.data)
            
            # Get paginated datasets
            offset = (page - 1) * page_size
            response = self.supabase.table('datasets').select('*').range(offset, offset + page_size - 1).execute()
            
            return response.data, total
        except Exception as e:
            logger.error(f"Error listing datasets: {e}")
            return [], 0
    
    async def get_dataset(self, dataset_id: str) -> Optional[Dict]:
        """Get dataset details"""
        try:
            response = self.supabase.table('datasets').select('*').eq('id', dataset_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting dataset: {e}")
            return None
    
    async def get_quality_report(self, dataset_id: str) -> Optional[Dict]:
        """Get data quality report"""
        try:
            response = self.supabase.table('data_quality_reports').select('*').eq('dataset_id', dataset_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting quality report: {e}")
            return None
    
    async def get_detected_schema(self, dataset_id: str) -> Optional[Dict]:
        """Get detected schema and column mappings"""
        try:
            response = self.supabase.table('dataset_schemas').select('*').eq('dataset_id', dataset_id).execute()
            if not response.data:
                return None
            schema = response.data[0]
            # Deserialize JSON fields stored as strings
            for key in ('columns', 'detected_variables'):
                value = schema.get(key)
                if isinstance(value, str):
                    try:
                        schema[key] = json.loads(value)
                    except (TypeError, ValueError):
                        pass
            return schema
        except Exception as e:
            logger.error(f"Error getting schema: {e}")
            return None
    
    async def get_preview(self, dataset_id: str, limit: int = 100) -> Optional[Dict]:
        """Get dataset preview"""
        try:
            response = self.supabase.table('dataset_records').select('*').eq('dataset_id', dataset_id).limit(limit).execute()
            return {
                'records': response.data,
                'count': len(response.data),
                'limited': len(response.data) == limit,
            }
        except Exception as e:
            logger.error(f"Error getting preview: {e}")
            return None
    
    async def delete_dataset(self, dataset_id: str):
        """Delete dataset and associated records"""
        try:
            # Delete records
            self.supabase.table('dataset_records').delete().eq('dataset_id', dataset_id).execute()
            
            # Delete quality report
            self.supabase.table('data_quality_reports').delete().eq('dataset_id', dataset_id).execute()
            
            # Delete dataset
            self.supabase.table('datasets').delete().eq('id', dataset_id).execute()
            
            logger.info(f"Dataset {dataset_id} deleted successfully")
        except Exception as e:
            logger.error(f"Error deleting dataset: {e}")
            raise
    
    async def analyze_dataset(self, dataset_id: str, background_tasks: BackgroundTasks) -> Dict:
        """Trigger analysis for dataset"""
        # This would schedule various ML/analysis tasks
        return {'status': 'analysis_started', 'dataset_id': dataset_id}
    
    def _validate_file(self, file: UploadFile):
        """Validate uploaded file"""
        if not file.filename:
            raise ValueError("Filename is required")
        
        file_ext = self._get_file_extension(file.filename)
        if file_ext not in self.ALLOWED_FORMATS:
            raise ValueError(f"File format {file_ext} not allowed. Use CSV or XLSX.")
        
        if file.size and file.size > self.MAX_FILE_SIZE:
            raise ValueError(f"File size exceeds {self.MAX_FILE_SIZE / 1024 / 1024}MB limit")
    
    @staticmethod
    def _get_file_extension(filename: str) -> str:
        """Get file extension"""
        return '.' + filename.split('.')[-1].lower() if '.' in filename else ''
