-- ============================================
-- GridSense Database Schema
-- Supabase PostgreSQL schema with RLS policies
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DATASETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx')),
    description TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_status TEXT NOT NULL DEFAULT 'uploading'
        CHECK (processing_status IN ('uploading', 'validating', 'processing', 'completed', 'failed')),
    quality_score FLOAT,
    rows_count INTEGER,
    columns_count INTEGER,
    timestamp_column TEXT,
    error_message TEXT,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(processing_status);
CREATE INDEX IF NOT EXISTS idx_datasets_uploaded_at ON datasets(uploaded_at DESC);

-- ============================================
-- DATASET COLUMNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS dataset_columns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    column_name TEXT NOT NULL,
    data_type TEXT NOT NULL,
    detected_role TEXT NOT NULL DEFAULT 'other',
    missing_percentage FLOAT NOT NULL DEFAULT 0,
    unique_values INTEGER,
    sample_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dataset_id, column_name)
);

CREATE INDEX IF NOT EXISTS idx_dataset_columns_dataset ON dataset_columns(dataset_id);

-- ============================================
-- DATASET RECORDS TABLE (time-series storage)
-- ============================================
CREATE TABLE IF NOT EXISTS dataset_records (
    id BIGSERIAL PRIMARY KEY,
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dataset_records_dataset_time ON dataset_records(dataset_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dataset_records_dataset ON dataset_records(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_records_timestamp ON dataset_records(timestamp);

-- ============================================
-- DATA QUALITY REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS data_quality_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    total_rows INTEGER NOT NULL,
    total_columns INTEGER NOT NULL,
    missing_values_count INTEGER NOT NULL DEFAULT 0,
    duplicate_rows INTEGER NOT NULL DEFAULT 0,
    missing_values_percentage FLOAT NOT NULL DEFAULT 0,
    duplicate_percentage FLOAT NOT NULL DEFAULT 0,
    numerical_columns INTEGER NOT NULL DEFAULT 0,
    categorical_columns INTEGER NOT NULL DEFAULT 0,
    datetime_columns INTEGER NOT NULL DEFAULT 0,
    quality_score FLOAT NOT NULL DEFAULT 0,
    issues JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_dataset ON data_quality_reports(dataset_id);

-- ============================================
-- MODEL REGISTRY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS model_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    target_column TEXT NOT NULL,
    model_type TEXT NOT NULL,
    training_records INTEGER,
    features JSONB,
    evaluation_metrics JSONB,
    model_version TEXT NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_models_dataset ON model_registry(dataset_id);

-- ============================================
-- DEMAND FORECASTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    forecasted_demand FLOAT NOT NULL,
    confidence_lower FLOAT,
    confidence_upper FLOAT,
    model_type TEXT,
    model_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_dataset_time ON demand_forecasts(dataset_id, timestamp);

-- ============================================
-- RENEWABLE FORECASTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS renewable_forecasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    solar_generation FLOAT,
    wind_generation FLOAT,
    confidence_lower FLOAT,
    confidence_upper FLOAT,
    model_type TEXT,
    model_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewable_forecast_dataset_time ON renewable_forecasts(dataset_id, timestamp);

-- ============================================
-- ELECTRICITY PRICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS electricity_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ,
    actual_price FLOAT,
    forecasted_price FLOAT,
    confidence_lower FLOAT,
    confidence_upper FLOAT,
    statistics JSONB,
    forecast JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prices_dataset ON electricity_prices(dataset_id);

-- ============================================
-- BATTERY ANALYSIS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS battery_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    analysis JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battery_dataset ON battery_analysis(dataset_id);

-- ============================================
-- MAINTENANCE PREDICTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS maintenance_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    analysis JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_dataset ON maintenance_predictions(dataset_id);

-- ============================================
-- AI AGENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    status TEXT NOT NULL,
    input_data JSONB,
    output_data JSONB,
    confidence_score FLOAT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_dataset ON ai_agents(dataset_id);
CREATE INDEX IF NOT EXISTS idx_agents_created ON ai_agents(created_at DESC);

-- ============================================
-- OPTIMIZATION PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS optimization_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    execution_status TEXT NOT NULL DEFAULT 'planned'
        CHECK (execution_status IN ('planned', 'executing', 'completed', 'failed')),
    kpis JSONB,
    intervals JSONB,
    objectives JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_optimization_dataset ON optimization_plans(dataset_id);
CREATE INDEX IF NOT EXISTS idx_optimization_created ON optimization_plans(created_at DESC);

-- ============================================
-- DIGITAL TWIN SCENARIOS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS digital_twin_scenarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    scenario_name TEXT NOT NULL,
    scenario_type TEXT NOT NULL DEFAULT 'what-if'
        CHECK (scenario_type IN ('baseline', 'what-if', 'optimization')),
    parameters JSONB NOT NULL,
    results JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_twin_dataset ON digital_twin_scenarios(dataset_id);

-- ============================================
-- XAI EXPLANATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS xai_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    prediction_id TEXT,
    prediction_type TEXT NOT NULL,
    model_name TEXT NOT NULL,
    feature_importance JSONB,
    local_explanation TEXT,
    global_explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xai_dataset ON xai_explanations(dataset_id);

-- ============================================
-- ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(user_id, read);

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    status TEXT NOT NULL DEFAULT 'generating'
        CHECK (status IN ('generating', 'ready', 'failed')),
    file_url TEXT,
    report_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_dataset ON reports(dataset_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewable_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE electricity_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE battery_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_twin_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE xai_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Datasets: users only access their own datasets
CREATE POLICY "Users can view own datasets"
    ON datasets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own datasets"
    ON datasets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own datasets"
    ON datasets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own datasets"
    ON datasets FOR DELETE USING (auth.uid() = user_id);

-- Dataset columns: via dataset ownership
CREATE POLICY "Users can view own dataset columns"
    ON dataset_columns FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert dataset columns"
    ON dataset_columns FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = dataset_columns.dataset_id AND d.user_id = auth.uid())
    );

-- Dataset records: via dataset ownership
CREATE POLICY "Users can view own dataset records"
    ON dataset_records FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = dataset_records.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert dataset records"
    ON dataset_records FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = dataset_records.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can delete own dataset records"
    ON dataset_records FOR DELETE USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = dataset_records.dataset_id AND d.user_id = auth.uid())
    );

-- Data quality reports: via dataset ownership
CREATE POLICY "Users can view own quality reports"
    ON data_quality_reports FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = data_quality_reports.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert quality reports"
    ON data_quality_reports FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = data_quality_reports.dataset_id AND d.user_id = auth.uid())
    );

-- Model registry
CREATE POLICY "Users can view own models"
    ON model_registry FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = model_registry.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert models"
    ON model_registry FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = model_registry.dataset_id AND d.user_id = auth.uid())
    );

-- Demand forecasts
CREATE POLICY "Users can view own demand forecasts"
    ON demand_forecasts FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = demand_forecasts.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert demand forecasts"
    ON demand_forecasts FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = demand_forecasts.dataset_id AND d.user_id = auth.uid())
    );

-- Renewable forecasts
CREATE POLICY "Users can view own renewable forecasts"
    ON renewable_forecasts FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = renewable_forecasts.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert renewable forecasts"
    ON renewable_forecasts FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = renewable_forecasts.dataset_id AND d.user_id = auth.uid())
    );

-- Electricity prices
CREATE POLICY "Users can view own prices"
    ON electricity_prices FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = electricity_prices.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert prices"
    ON electricity_prices FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = electricity_prices.dataset_id AND d.user_id = auth.uid())
    );

-- Battery analysis
CREATE POLICY "Users can view own battery analysis"
    ON battery_analysis FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = battery_analysis.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert battery analysis"
    ON battery_analysis FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = battery_analysis.dataset_id AND d.user_id = auth.uid())
    );

-- Maintenance predictions
CREATE POLICY "Users can view own maintenance predictions"
    ON maintenance_predictions FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = maintenance_predictions.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert maintenance predictions"
    ON maintenance_predictions FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = maintenance_predictions.dataset_id AND d.user_id = auth.uid())
    );

-- AI agents
CREATE POLICY "Users can view own agents"
    ON ai_agents FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = ai_agents.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert agents"
    ON ai_agents FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = ai_agents.dataset_id AND d.user_id = auth.uid())
    );

-- Optimization plans
CREATE POLICY "Users can view own optimization plans"
    ON optimization_plans FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = optimization_plans.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert optimization plans"
    ON optimization_plans FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = optimization_plans.dataset_id AND d.user_id = auth.uid())
    );

-- Digital twin scenarios
CREATE POLICY "Users can view own twin scenarios"
    ON digital_twin_scenarios FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = digital_twin_scenarios.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert twin scenarios"
    ON digital_twin_scenarios FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = digital_twin_scenarios.dataset_id AND d.user_id = auth.uid())
    );

-- XAI explanations
CREATE POLICY "Users can view own XAI explanations"
    ON xai_explanations FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = xai_explanations.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert XAI explanations"
    ON xai_explanations FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = xai_explanations.dataset_id AND d.user_id = auth.uid())
    );

-- Alerts: users own their alerts
CREATE POLICY "Users can view own alerts"
    ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own alerts"
    ON alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts"
    ON alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own alerts"
    ON alerts FOR DELETE USING (auth.uid() = user_id);

-- Reports: via dataset ownership
CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT USING (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = reports.dataset_id AND d.user_id = auth.uid())
    );
CREATE POLICY "Users can insert reports"
    ON reports FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM datasets d WHERE d.id = reports.dataset_id AND d.user_id = auth.uid())
    );

-- Notifications: users own their notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications"
    ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update profile on user creation (from auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets for datasets
INSERT INTO storage.buckets (id, name, public)
VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their datasets"
    ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their datasets"
    ON storage.objects FOR SELECT USING (
        bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their datasets"
    ON storage.objects FOR DELETE USING (
        bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE datasets;
ALTER PUBLICATION supabase_realtime ADD TABLE dataset_records;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE optimization_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE battery_analysis;
ALTER PUBLICATION supabase_realtime ADD TABLE demand_forecasts;
ALTER PUBLICATION supabase_realtime ADD TABLE renewable_forecasts;
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_predictions;