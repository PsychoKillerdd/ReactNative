-- =========================================
-- ESQUEMA DE BASE DE DATOS - HEALTH TRACKER
-- =========================================

-- 1. TABLA DE USUARIOS (ya manejada por Supabase Auth)
-- Esta tabla es automática con Supabase Auth, pero podemos extenderla
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    height_cm INTEGER CHECK (height_cm > 0 AND height_cm <= 300),
    weight_kg DECIMAL(5,2) CHECK (weight_kg > 0 AND weight_kg <= 500),
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DISPOSITIVOS CONECTADOS
CREATE TABLE devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('wear_os', 'android_phone', 'iphone', 'fitness_tracker')),
    device_model TEXT,
    manufacturer TEXT,
    os_version TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    device_identifier TEXT UNIQUE, -- MAC address, IMEI, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TIPOS DE MÉTRICAS DE SALUD
CREATE TABLE health_metric_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- 'heart_rate', 'sleep', 'steps', 'screen_time', etc.
    display_name TEXT NOT NULL, -- 'Heart Rate', 'Sleep Duration', etc.
    unit TEXT NOT NULL, -- 'bpm', 'hours', 'steps', 'minutes'
    category TEXT NOT NULL CHECK (category IN ('cardiovascular', 'activity', 'sleep', 'mental_health', 'other')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. DATOS DE SALUD (tabla principal normalizada)
CREATE TABLE health_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    metric_type_id INTEGER REFERENCES health_metric_types(id),
    value DECIMAL(10,3) NOT NULL, -- Valor numérico principal
    value_text TEXT, -- Para valores no numéricos si es necesario
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Cuando se registró el dato
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Cuando se sincronizó
    metadata JSONB, -- Datos adicionales específicos del tipo de métrica
    quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100), -- Calidad del dato
    is_validated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. DATOS DE SUEÑO (tabla específica para análisis detallado)
CREATE TABLE sleep_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    sleep_start TIMESTAMP WITH TIME ZONE NOT NULL,
    sleep_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (sleep_end - sleep_start)) / 60
    ) STORED,
    deep_sleep_minutes INTEGER DEFAULT 0,
    light_sleep_minutes INTEGER DEFAULT 0,
    rem_sleep_minutes INTEGER DEFAULT 0,
    awake_minutes INTEGER DEFAULT 0,
    sleep_efficiency DECIMAL(5,2), -- Porcentaje (tiempo dormido / tiempo en cama)
    sleep_quality_score INTEGER CHECK (sleep_quality_score >= 0 AND sleep_quality_score <= 100),
    interruptions_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ACTIVIDAD FÍSICA DIARIA
CREATE TABLE daily_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    activity_date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    distance_meters DECIMAL(10,2) DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    sedentary_minutes INTEGER DEFAULT 0,
    floors_climbed INTEGER DEFAULT 0,
    screen_time_minutes INTEGER DEFAULT 0, -- Tiempo de pantalla móvil
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date) -- Un registro por día por usuario
);

-- 7. OBJETIVOS DE SALUD
CREATE TABLE health_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    metric_type_id INTEGER REFERENCES health_metric_types(id),
    target_value DECIMAL(10,3) NOT NULL,
    target_period TEXT CHECK (target_period IN ('daily', 'weekly', 'monthly')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. ALERTAS Y NOTIFICACIONES
CREATE TABLE health_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('high_heart_rate', 'low_activity', 'sleep_deficit', 'goal_achieved', 'anomaly_detected')),
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    metadata JSONB,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =========================================
-- ÍNDICES PARA RENDIMIENTO
-- =========================================

-- Índices para consultas frecuentes
CREATE INDEX idx_health_data_user_recorded_at ON health_data(user_id, recorded_at DESC);
CREATE INDEX idx_health_data_metric_type ON health_data(metric_type_id);
CREATE INDEX idx_health_data_device ON health_data(device_id);
CREATE INDEX idx_health_data_date ON health_data(user_id, DATE(recorded_at));

CREATE INDEX idx_sleep_sessions_user_date ON sleep_sessions(user_id, DATE(sleep_start));
CREATE INDEX idx_daily_activity_user_date ON daily_activity(user_id, activity_date DESC);

CREATE INDEX idx_devices_user_active ON devices(user_id, is_active);
CREATE INDEX idx_health_alerts_user_unread ON health_alerts(user_id, is_read, triggered_at DESC);

-- Índices para JSONB metadata
CREATE INDEX idx_health_data_metadata_gin ON health_data USING GIN (metadata);

-- =========================================
-- FUNCIONES Y TRIGGERS
-- =========================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para validar datos de sueño
CREATE OR REPLACE FUNCTION validate_sleep_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar que la duración total coincida con la suma de las fases
    IF (COALESCE(NEW.deep_sleep_minutes, 0) + 
        COALESCE(NEW.light_sleep_minutes, 0) + 
        COALESCE(NEW.rem_sleep_minutes, 0) + 
        COALESCE(NEW.awake_minutes, 0)) > 
       (EXTRACT(EPOCH FROM (NEW.sleep_end - NEW.sleep_start)) / 60 + 30) -- +30 min de tolerancia
    THEN
        RAISE EXCEPTION 'Sleep phase durations exceed total sleep duration';
    END IF;
    
    -- Validar que sleep_end sea posterior a sleep_start
    IF NEW.sleep_end <= NEW.sleep_start THEN
        RAISE EXCEPTION 'Sleep end time must be after sleep start time';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_sleep_session_trigger BEFORE INSERT OR UPDATE ON sleep_sessions
    FOR EACH ROW EXECUTE FUNCTION validate_sleep_session();

-- =========================================
-- DATOS INICIALES
-- =========================================

-- Insertar tipos de métricas básicas
INSERT INTO health_metric_types (name, display_name, unit, category, description) VALUES
    ('heart_rate', 'Heart Rate', 'bpm', 'cardiovascular', 'Heart rate in beats per minute'),
    ('resting_heart_rate', 'Resting Heart Rate', 'bpm', 'cardiovascular', 'Resting heart rate'),
    ('blood_pressure_systolic', 'Blood Pressure (Systolic)', 'mmHg', 'cardiovascular', 'Systolic blood pressure'),
    ('blood_pressure_diastolic', 'Blood Pressure (Diastolic)', 'mmHg', 'cardiovascular', 'Diastolic blood pressure'),
    ('steps', 'Steps', 'steps', 'activity', 'Daily step count'),
    ('distance', 'Distance', 'meters', 'activity', 'Distance traveled'),
    ('calories_burned', 'Calories Burned', 'kcal', 'activity', 'Calories burned'),
    ('sleep_duration', 'Sleep Duration', 'hours', 'sleep', 'Total sleep duration'),
    ('deep_sleep', 'Deep Sleep', 'hours', 'sleep', 'Deep sleep duration'),
    ('light_sleep', 'Light Sleep', 'hours', 'sleep', 'Light sleep duration'),
    ('rem_sleep', 'REM Sleep', 'hours', 'sleep', 'REM sleep duration'),
    ('screen_time', 'Screen Time', 'minutes', 'mental_health', 'Daily screen time'),
    ('weight', 'Weight', 'kg', 'other', 'Body weight'),
    ('body_fat_percentage', 'Body Fat %', 'percentage', 'other', 'Body fat percentage'),
    ('stress_level', 'Stress Level', 'score', 'mental_health', 'Stress level score (1-10)');

-- =========================================
-- VISTAS ÚTILES
-- =========================================

-- Vista para dashboard diario
CREATE VIEW daily_health_summary AS
SELECT 
    da.user_id,
    da.activity_date,
    da.steps,
    da.distance_meters,
    da.calories_burned,
    da.screen_time_minutes,
    ss.total_duration_minutes as sleep_minutes,
    ss.sleep_quality_score,
    hr.avg_heart_rate,
    hr.max_heart_rate,
    hr.min_heart_rate
FROM daily_activity da
LEFT JOIN sleep_sessions ss ON da.user_id = ss.user_id 
    AND DATE(ss.sleep_start) = da.activity_date
LEFT JOIN (
    SELECT 
        user_id,
        DATE(recorded_at) as date,
        ROUND(AVG(value)) as avg_heart_rate,
        MAX(value) as max_heart_rate,
        MIN(value) as min_heart_rate
    FROM health_data hd
    JOIN health_metric_types hmt ON hd.metric_type_id = hmt.id
    WHERE hmt.name = 'heart_rate'
    GROUP BY user_id, DATE(recorded_at)
) hr ON da.user_id = hr.user_id AND da.activity_date = hr.date;

-- Vista para tendencias semanales
CREATE VIEW weekly_health_trends AS
SELECT 
    user_id,
    DATE_TRUNC('week', activity_date) as week_start,
    AVG(steps) as avg_steps,
    AVG(distance_meters) as avg_distance,
    AVG(calories_burned) as avg_calories,
    AVG(screen_time_minutes) as avg_screen_time,
    COUNT(*) as days_recorded
FROM daily_activity
WHERE activity_date >= CURRENT_DATE - INTERVAL '8 weeks'
GROUP BY user_id, DATE_TRUNC('week', activity_date)
ORDER BY user_id, week_start DESC;

-- =========================================
-- POLÍTICAS RLS (Row Level Security)
-- =========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para devices
CREATE POLICY "Users can view their own devices" ON devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own devices" ON devices
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para health_data
CREATE POLICY "Users can view their own health data" ON health_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own health data" ON health_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health data" ON health_data
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para sleep_sessions
CREATE POLICY "Users can view their own sleep data" ON sleep_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sleep data" ON sleep_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para daily_activity
CREATE POLICY "Users can view their own activity data" ON daily_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own activity data" ON daily_activity
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para health_goals
CREATE POLICY "Users can view their own goals" ON health_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own goals" ON health_goals
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para health_alerts
CREATE POLICY "Users can view their own alerts" ON health_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON health_alerts
    FOR UPDATE USING (auth.uid() = user_id);

-- Permitir lectura pública de tipos de métricas
CREATE POLICY "Anyone can read metric types" ON health_metric_types
    FOR SELECT USING (true);
