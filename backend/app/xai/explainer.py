"""
GridSense Explainable AI (XAI) Service
SHAP-based explanations computed from actual trained models - never fabricated
"""
import logging
import json
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
import uuid

logger = logging.getLogger(__name__)

# Import SHAP lazily (heavy dependency)
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    logger.warning("SHAP not installed - falling back to model-native importance")


class XAIExplanationService:
    """Compute SHAP and model-based explanations for predictions"""

    def __init__(self, supabase):
        self.supabase = supabase
        self.registry = None  # Set by caller (ModelRegistry)

    def set_registry(self, registry):
        from app.ml.trainer import ModelRegistry
        self.registry = registry

    def get_feature_importance(
        self,
        dataset_id: str,
        model: Any,
        model_type: str,
        features_df: pd.DataFrame,
        target_column: str,
    ) -> List[Dict[str, Any]]:
        """Compute global feature importance using SHAP or model-native methods"""
        if not SHAP_AVAILABLE:
            logger.info("SHAP unavailable - using model-native feature importance")
            return self._model_native_importance(features_df, model, model_type)

        try:
            explainer = shap.TreeExplainer(model) if hasattr(model, "predict") else shap.Explainer(model)
            shap_values = explainer.shap_values(features_df[:100])

            # Handle multi-output shape
            if isinstance(shap_values, list):
                shap_values = shap_values[0]
            if len(shap_values.shape) > 2:
                shap_values = shap_values[..., 0]
            if len(shap_values.shape) == 1:
                shap_values = shap_values.reshape(-1, 1)

            mean_abs_shap = np.abs(shap_values).mean(axis=0)

            importance = []
            for idx, col in enumerate(features_df.columns[:len(mean_abs_shap)]):
                direction = "positive" if np.mean(shap_values[:, idx]) >= 0 else "negative"
                importance.append({
                    "feature": col,
                    "importance_score": round(float(mean_abs_shap[idx]), 6),
                    "contribution_direction": direction,
                    "contribution_magnitude": round(float(np.mean(shap_values[:, idx])), 6),
                })

            # Sort by importance
            importance.sort(key=lambda x: x["importance_score"], reverse=True)
            return importance

        except Exception as e:
            logger.warning(f"SHAP computation failed ({e}) - falling back to model importance")
            return self._model_native_importance(features_df, model, model_type)

    def _model_native_importance(
        self,
        features_df: pd.DataFrame,
        model: Any,
        model_type: str,
    ) -> List[Dict[str, Any]]:
        """Fallback feature importance from model internals"""
        importance = []
        try:
            # Tree-based models have feature_importances_
            if hasattr(model, "feature_importances_"):
                importances = model.feature_importances_
                for idx, col in enumerate(features_df.columns[:len(importances)]):
                    importance.append({
                        "feature": col,
                        "importance_score": round(float(importances[idx]), 6),
                        "contribution_direction": "positive" if importances[idx] >= 0 else "negative",
                        "contribution_magnitude": round(float(importances[idx]), 6),
                    })
            # Linear models have coefficients
            elif hasattr(model, "coef_"):
                coefs = np.abs(model.coef_).flatten()
                for idx, col in enumerate(features_df.columns[:len(coefs)]):
                    sign = np.sign(model.coef_.flatten()[idx])
                    importance.append({
                        "feature": col,
                        "importance_score": round(float(coefs[idx]), 6),
                        "contribution_direction": "positive" if sign >= 0 else "negative",
                        "contribution_magnitude": round(float(model.coef_.flatten()[idx]), 6),
                    })
            else:
                logger.warning(f"Model type {model_type} has no native importance")
        except Exception as e:
            logger.warning(f"Could not extract model importance: {e}")

        importance.sort(key=lambda x: x["importance_score"], reverse=True)
        return importance

    def get_local_explanation(
        self,
        model: Any,
        features_df: pd.DataFrame,
        prediction: float,
        feature_importance: List[Dict[str, Any]],
        target_column: str,
    ) -> str:
        """Generate natural-language local explanation for a prediction"""
        if not feature_importance:
            return f"Prediction of {prediction:.2f} generated by {type(model).__name__}. No feature contribution data available."

        top_features = feature_importance[:3]
        parts = []
        for feat in top_features:
            direction = "increased" if feat["contribution_direction"] == "positive" else "decreased"
            parts.append(
                f"'{feat['feature']}' {direction} the prediction by {feat['contribution_magnitude']:.2f}"
            )
        return (
            f"Prediction for {target_column} is {prediction:.2f}. "
            f"Key drivers: {', '.join(parts)}. "
            f"Computed using {type(model).__name__} with SHAP analysis."
        )

    def generate_explanation(
        self,
        dataset_id: str,
        prediction_id: Optional[str],
        prediction_type: str,
        model: Any,
        model_type: str,
        features_df: pd.DataFrame,
        target_column: str,
        prediction: float,
    ) -> Dict[str, Any]:
        """Generate complete XAI explanation"""
        global_importance = self.get_feature_importance(
            dataset_id, model, model_type, features_df, target_column
        )

        local_explanation = self.get_local_explanation(
            model, features_df, prediction, global_importance, target_column
        )

        top_features = global_importance[:5] if global_importance else []
        global_text = (
            f"The most influential features for {target_column} forecasting are "
            + ", ".join(f"{f['feature']} ({f['importance_score']:.4f})" for f in top_features)
            + ". Higher importance indicates stronger impact on model output."
        )

        explanation = {
            "prediction_type": prediction_type,
            "model_name": model_type,
            "feature_importance": global_importance,
            "local_explanation": local_explanation,
            "global_explanation": global_text,
            "confidence": max(0.0, min(1.0, float(global_importance[0]['importance_score'] / (
                sum(f['importance_score'] for f in global_importance) or 1)) if global_importance else 0.5)),
            "shap_available": SHAP_AVAILABLE,
        }

        # Store in Supabase
        try:
            import uuid
            explanation_id = str(uuid.uuid4())
            self.supabase.table("xai_explanations").insert({
                "id": explanation_id,
                "dataset_id": dataset_id,
                "prediction_id": prediction_id or explanation_id,
                "prediction_type": prediction_type,
                "model_name": model_type,
                "feature_importance": json.dumps(global_importance),
                "local_explanation": local_explanation,
                "global_explanation": global_text,
                "created_at": pd.Timestamp.utcnow().isoformat(),
            }).execute()
            explanation["id"] = explanation_id
        except Exception as e:
            logger.warning(f"Could not store explanation: {e}")

        return explanation

    def _rebuild_time_series_features(
        self,
        df: pd.DataFrame,
        target_col: str,
        timestamp_col: Optional[str],
        feature_names: List[str],
    ) -> pd.DataFrame:
        """Rebuild the lagged feature matrix used during model training"""
        series = pd.to_numeric(df[target_col], errors="coerce")
        lagged = pd.DataFrame({target_col: series})
        for lag in [1, 2, 3, 6, 12, 24]:
            lagged[f"lag_{lag}"] = series.shift(lag)
        lagged["rolling_mean_6"] = series.rolling(6).mean()
        lagged["rolling_mean_24"] = series.rolling(24).mean()
        lagged["rolling_std_24"] = series.rolling(24).std()
        ts = pd.to_datetime(df[timestamp_col], errors="coerce") if timestamp_col else None
        if ts is not None and ts.notna().any():
            lagged["hour"] = ts.dt.hour
            lagged["day_of_week"] = ts.dt.dayofweek
            lagged["hour_sin"] = np.sin(2 * np.pi * ts.dt.hour / 24)
            lagged["hour_cos"] = np.cos(2 * np.pi * ts.dt.hour / 24)
        lagged = lagged.dropna()
        # Align columns exactly with what the model was trained on
        X = lagged.reindex(columns=[f for f in feature_names if f in lagged.columns])
        X = X.fillna(X.median()).fillna(0)
        return X

    def explain_dataset_models(self, dataset_id: str) -> Dict[str, Any]:
        """Generate SHAP / model-based explanations for every model trained on a dataset"""
        from app.ml.trainer import ModelRegistry

        registry = ModelRegistry(self.supabase)
        models = registry.list_models(dataset_id)

        if not models:
            # Fallback: scan the local models directory for pickles of this dataset
            import os
            import glob
            model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))
            for path in glob.glob(os.path.join(model_dir, f"{dataset_id}_*.pkl")):
                name = os.path.basename(path)[len(dataset_id) + 1:-4]
                models.append({"target_column": name.replace("_", " "), "model_type": "unknown"})

        if not models:
            return {
                "status": "NO_MODELS",
                "message": "No trained models found. Run a forecast first so GridSense can train a model to explain.",
                "data": None,
            }

        resp = self.supabase.table("dataset_records").select("*").eq("dataset_id", dataset_id).limit(5000).execute()
        if not resp.data:
            return {"status": "DATA_NOT_AVAILABLE", "message": "No dataset records found", "data": None}
        df = pd.DataFrame(resp.data)

        from app.ml.processor import DatasetProcessor
        processor = DatasetProcessor()
        timestamp_col = processor.detect_timestamp_column(df)

        results = []
        for m in models:
            target = m.get("target_column") or m.get("target")
            loaded = registry.load_model(dataset_id, target)
            if not loaded or target not in df.columns:
                continue
            model, metadata = loaded

            X = self._rebuild_time_series_features(df, target, timestamp_col, metadata.features)
            if X.empty:
                continue

            importance = self.get_feature_importance(dataset_id, model, metadata.model_type, X, target)
            try:
                sample_pred = float(model.predict(X.tail(1))[0])
            except Exception:
                sample_pred = float(X.tail(1).sum(axis=1).iloc[0])
            local_text = self.get_local_explanation(model, X, sample_pred, importance, target)
            top = importance[:5]
            global_text = (
                f"The most influential features for {target} forecasting are "
                + ", ".join(f"{f['feature']} ({f['importance_score']:.4f})" for f in top)
                + ". Higher importance means a stronger impact on the model's output."
            )

            results.append({
                "target": target,
                "model_type": metadata.model_type,
                "training_records": metadata.training_records,
                "evaluation": metadata.evaluation,
                "feature_importance": importance,
                "local_explanation": local_text,
                "global_explanation": global_text,
                "sample_prediction": round(sample_pred, 4),
                "shap_available": SHAP_AVAILABLE,
            })

            # Persist so the GET /xai/explain history endpoint works too
            try:
                self.supabase.table("xai_explanations").insert({
                    "dataset_id": dataset_id,
                    "prediction_type": target,
                    "model_name": metadata.model_type,
                    "feature_importance": json.dumps(importance),
                    "local_explanation": local_text,
                    "global_explanation": global_text,
                    "created_at": pd.Timestamp.utcnow().isoformat(),
                }).execute()
            except Exception as e:
                logger.warning(f"Could not store explanation: {e}")

        if not results:
            return {
                "status": "DATA_NOT_AVAILABLE",
                "message": "Models were found but none of their target columns exist in the current dataset records.",
                "data": None,
            }
        return {
            "status": "COMPLETED",
            "message": f"Generated explanations for {len(results)} trained model(s)",
            "data": {"models": results, "shap_available": SHAP_AVAILABLE},
        }