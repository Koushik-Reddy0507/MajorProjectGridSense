"""
GridSense ML Pipeline - Dataset Processing & Feature Engineering
No hardcoded values - all analysis derived from uploaded data
"""
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    """Base analysis result"""
    status: str
    data: Dict[str, Any]
    message: str
    errors: List[str]


class DatasetProcessor:
    """Process and analyze uploaded datasets"""
    
    # Column mapping patterns (not hardcoded values)
    COLUMN_PATTERNS = {
        'timestamp': ['time', 'date', 'timestamp', 'datetime', 'ts', 'dt', 'created_at'],
        'solar_generation': ['solar', 'pv', 'photovoltaic', 'solar_gen', 'solar_power', 'solar_output'],
        'wind_generation': ['wind', 'wind_gen', 'wind_power', 'wind_output', 'wind_speed_gen'],
        'renewable_generation': ['renewable', 'renewable_gen', 'renewable_power', 'green_energy'],
        'electricity_demand': ['demand', 'load', 'consumption', 'electricity_load', 'power_demand', 'energy_consumption'],
        'battery_soc': ['soc', 'state_of_charge', 'battery_soc', 'charge_level'],
        'battery_soh': ['soh', 'state_of_health', 'battery_soh', 'battery_health'],
        'voltage': ['voltage', 'v', 'volt', 'bus_voltage'],
        'current': ['current', 'amp', 'ampere', 'battery_current'],
        'temperature': ['temp', 'temperature', 'celsius', 'ambient_temp', 'cell_temp'],
        'electricity_price': ['price', 'electricity_price', 'market_price', 'tariff', 'rate'],
        'humidity': ['humidity', 'relative_humidity', 'rh', 'humid'],
        'cloud_cover': ['cloud', 'cloud_cover', 'cloudiness', 'sky_cover'],
        'wind_speed': ['wind_speed', 'windspeed', 'ws', 'wind_velocity'],
        'irradiance': ['irradiance', 'solar_irradiance', 'ghi', 'global_horizontal'],
        'cycle_count': ['cycle', 'cycle_count', 'charge_cycles', 'num_cycles'],
        'charge_rate': ['charge_rate', 'charging_rate', 'cr'],
        'discharge_rate': ['discharge_rate', 'discharging_rate', 'dr'],
    }
    
    @staticmethod
    def detect_columns(df: pd.DataFrame) -> Dict[str, List[str]]:
        """Detect which columns map to which energy variables"""
        detected = {}
        
        for var_type, patterns in DatasetProcessor.COLUMN_PATTERNS.items():
            matched_cols = []
            for col in df.columns:
                col_lower = col.lower().strip().replace(' ', '_')
                for pattern in patterns:
                    if pattern in col_lower:
                        matched_cols.append(col)
                        break
            if matched_cols:
                detected[var_type] = matched_cols
        
        return detected
    
    @staticmethod
    def detect_timestamp_column(df: pd.DataFrame) -> Optional[str]:
        """Detect the primary timestamp column"""
        # Check dtype first
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                return col
        
        # Check column names
        for col in df.columns:
            col_lower = col.lower().strip()
            for pattern in ['timestamp', 'datetime', 'time', 'date', 'ts']:
                if pattern in col_lower:
                    # Try to parse
                    try:
                        pd.to_datetime(df[col].head(10))
                        return col
                    except Exception:
                        continue
        
        return None
    
    @staticmethod
    def normalize_timestamps(df: pd.DataFrame, timestamp_col: str) -> pd.DataFrame:
        """Normalize timestamp column to datetime"""
        df = df.copy()
        try:
            df[timestamp_col] = pd.to_datetime(df[timestamp_col])
            # Sort by timestamp
            df = df.sort_values(timestamp_col).reset_index(drop=True)
        except Exception as e:
            logger.error(f"Error normalizing timestamps: {e}")
        return df
    
    @staticmethod
    def analyze_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
        """Comprehensive data quality analysis"""
        total_rows = len(df)
        total_cols = len(df.columns)
        
        # Missing values analysis
        missing = df.isnull()
        missing_per_col = missing.sum()
        total_missing = missing_per_col.sum()
        missing_pct = (total_missing / (total_rows * total_cols) * 100) if (total_rows * total_cols) > 0 else 0
        
        # Duplicate analysis
        duplicate_rows = df.duplicated().sum()
        duplicate_pct = (duplicate_rows / total_rows * 100) if total_rows > 0 else 0
        
        # Column type analysis
        numerical = df.select_dtypes(include=['number']).columns.tolist()
        categorical = df.select_dtypes(include=['object']).columns.tolist()
        datetime_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
        boolean = df.select_dtypes(include=['bool']).columns.tolist()
        
        # Outlier detection (IQR method)
        outlier_counts = {}
        for col in numerical:
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outliers = ((df[col] < lower) | (df[col] > upper)).sum()
            if outliers > 0:
                outlier_counts[col] = int(outliers)
        
        # Data quality issues
        issues = []
        if missing_pct > 0:
            severity = 'high' if missing_pct > 20 else ('medium' if missing_pct > 5 else 'low')
            issues.append({
                'type': 'missing_values',
                'severity': severity,
                'count': int(total_missing),
                'percentage': round(missing_pct, 2),
            })
        
        if duplicate_pct > 0:
            severity = 'high' if duplicate_pct > 10 else ('medium' if duplicate_pct > 2 else 'low')
            issues.append({
                'type': 'duplicates',
                'severity': severity,
                'count': int(duplicate_rows),
                'percentage': round(duplicate_pct, 2),
            })
        
        for col, count in outlier_counts.items():
            issues.append({
                'type': 'outliers',
                'column': col,
                'severity': 'medium',
                'count': count,
            })
        
        # Quality score (0-100)
        score = 100
        score -= min(30, missing_pct * 1.5)
        score -= min(15, duplicate_pct * 1.5)
        score -= min(10, len(outlier_counts) * 2)
        score = max(0, min(100, score))
        
        return {
            'total_rows': total_rows,
            'total_columns': total_cols,
            'missing_values_count': int(total_missing),
            'duplicate_rows': int(duplicate_rows),
            'missing_values_percentage': round(missing_pct, 2),
            'duplicate_percentage': round(duplicate_pct, 2),
            'numerical_columns': len(numerical),
            'categorical_columns': len(categorical),
            'datetime_columns': len(datetime_cols),
            'boolean_columns': len(boolean),
            'quality_score': round(score, 1),
            'issues': issues,
            'column_types': {
                col: str(df[col].dtype) for col in df.columns
            },
            'statistics': {
                col: {
                    'mean': float(df[col].mean()) if pd.api.types.is_numeric_dtype(df[col]) else None,
                    'std': float(df[col].std()) if pd.api.types.is_numeric_dtype(df[col]) else None,
                    'min': float(df[col].min()) if pd.api.types.is_numeric_dtype(df[col]) else None,
                    'max': float(df[col].max()) if pd.api.types.is_numeric_dtype(df[col]) else None,
                } for col in numerical
            },
        }
    
    @staticmethod
    def engineer_features(df: pd.DataFrame, timestamp_col: Optional[str] = None) -> pd.DataFrame:
        """Feature engineering - add time-based features"""
        df = df.copy()
        
        if timestamp_col and pd.api.types.is_datetime64_any_dtype(df[timestamp_col]):
            ts = df[timestamp_col]
            df['hour'] = ts.dt.hour
            df['day_of_week'] = ts.dt.dayofweek
            df['day_of_month'] = ts.dt.day
            df['month'] = ts.dt.month
            df['quarter'] = ts.dt.quarter
            df['is_weekend'] = ts.dt.dayofweek >= 5
            df['is_peak_hour'] = ts.dt.hour.isin(range(8, 20))
            
            # Cyclical encoding for time features
            df['hour_sin'] = np.sin(2 * np.pi * ts.dt.hour / 24)
            df['hour_cos'] = np.cos(2 * np.pi * ts.dt.hour / 24)
            df['day_sin'] = np.sin(2 * np.pi * ts.dt.dayofweek / 7)
            df['day_cos'] = np.cos(2 * np.pi * ts.dt.dayofweek / 7)
        
        return df
    
    @staticmethod
    def prepare_features_for_model(
        df: pd.DataFrame,
        target_col: str,
        feature_cols: Optional[List[str]] = None,
        drop_cols: Optional[List[str]] = None,
    ) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
        """Prepare features for ML model training"""
        # Drop non-numeric columns and specified columns
        numeric_df = df.select_dtypes(include=['number'])
        
        if drop_cols:
            cols_to_drop = [c for c in drop_cols if c in numeric_df.columns]
            numeric_df = numeric_df.drop(columns=cols_to_drop)
        
        if target_col not in numeric_df.columns:
            raise ValueError(f"Target column '{target_col}' not found in numeric columns")
        
        if feature_cols:
            available_features = [c for c in feature_cols if c in numeric_df.columns]
            features = numeric_df[available_features]
        else:
            features = numeric_df.drop(columns=[target_col], errors='ignore')
        
        target = numeric_df[target_col]
        
        # Drop rows with NaN in target
        mask = target.notna() & features.notna().all(axis=1)
        features = features[mask]
        target = target[mask]
        
        feature_names = features.columns.tolist()
        return features, target, feature_names
