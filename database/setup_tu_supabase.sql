-- Script para configurar las tablas en tu proyecto de Supabase
-- Proyecto: kgzqliseokkckbcjvdyx
-- URL: https://kgzqliseokkckbcjvdyx.supabase.co
-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de dispositivos
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(100) NOT NULL,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de datos de salud
CREATE TABLE IF NOT EXISTS health_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_id VARCHAR(255),
    metric_type VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de sesiones de sueño
CREATE TABLE IF NOT EXISTS sleep_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_id VARCHAR(255),
    sleep_start TIMESTAMP WITH TIME ZONE NOT NULL,
    sleep_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_duration_minutes INTEGER NOT NULL,
    sleep_quality_score INTEGER DEFAULT 0,
    deep_sleep_minutes INTEGER DEFAULT 0,
    light_sleep_minutes INTEGER DEFAULT 0,
    rem_sleep_minutes INTEGER DEFAULT 0,
    awake_duration_minutes INTEGER DEFAULT 0,
    heart_rate_variability NUMERIC,
    restlessness_score INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de actividad diaria
CREATE TABLE IF NOT EXISTS daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_id VARCHAR(255),
    activity_date DATE NOT NULL,
    steps INTEGER DEFAULT 0,
    distance_meters TEXT DEFAULT '0',
    calories_burned INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    floors_climbed INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, activity_date)
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_health_data_user_metric ON health_data(user_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_health_data_recorded_at ON health_data(recorded_at);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user ON sleep_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, activity_date);

-- ========================================
-- DATOS DE PRUEBA PARA TU PROYECTO
-- ========================================

-- Insertar usuario de prueba
INSERT INTO users (id, email, name) 
VALUES ('12345678-1234-1234-1234-123456789012', 'test@healthtracker.com', 'Usuario Prueba Samsung Health')
ON CONFLICT (id) DO NOTHING;

-- Insertar dispositivo Galaxy Watch
INSERT INTO devices (user_id, device_name, device_type, device_id) 
VALUES ('12345678-1234-1234-1234-123456789012', 'Galaxy Watch 6', 'smartwatch', 'galaxy-watch-6')
ON CONFLICT (device_id) DO NOTHING;

-- Insertar datos de frecuencia cardíaca de prueba (últimas 24 horas)
INSERT INTO health_data (user_id, device_id, metric_type, value, recorded_at, metadata) VALUES 
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '72', NOW() - INTERVAL '23 hours', JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 95)),
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '68', NOW() - INTERVAL '22 hours', JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 92)),
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '75', NOW() - INTERVAL '21 hours', JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 98)),
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '70', NOW() - INTERVAL '20 hours', JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 94)),
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '73', NOW() - INTERVAL '19 hours', JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 96)),
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '69', NOW() - INTERVAL '2 hours', JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 97)),
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '74', NOW() - INTERVAL '1 hour', JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 99)),
    ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 'heart_rate', '71', NOW(), JSON_BUILD_OBJECT('source', 'samsung_health', 'accuracy', 98));

-- Insertar actividad de hoy
INSERT INTO daily_activity (user_id, device_id, activity_date, steps, distance_meters, calories_burned, active_minutes, floors_climbed, metadata)
VALUES ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', CURRENT_DATE, 8542, '6420', 347, 45, 12, 
        JSON_BUILD_OBJECT('source', 'samsung_health', 'sync_time', NOW()))
ON CONFLICT (user_id, activity_date) DO UPDATE SET
    steps = EXCLUDED.steps,
    distance_meters = EXCLUDED.distance_meters,
    calories_burned = EXCLUDED.calories_burned,
    active_minutes = EXCLUDED.active_minutes,
    floors_climbed = EXCLUDED.floors_climbed,
    metadata = EXCLUDED.metadata;

-- Insertar actividad de ayer
INSERT INTO daily_activity (user_id, device_id, activity_date, steps, distance_meters, calories_burned, active_minutes, floors_climbed)
VALUES ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', CURRENT_DATE - INTERVAL '1 day', 7230, '5100', 298, 38, 8)
ON CONFLICT (user_id, activity_date) DO NOTHING;

-- Insertar sesión de sueño de anoche
INSERT INTO sleep_sessions (user_id, device_id, sleep_start, sleep_end, total_duration_minutes, sleep_quality_score, deep_sleep_minutes, light_sleep_minutes, rem_sleep_minutes, awake_duration_minutes, metadata)
VALUES ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 
        (CURRENT_DATE - INTERVAL '1 day') + TIME '23:30:00', 
        CURRENT_DATE + TIME '07:00:00', 
        450, 78, 105, 210, 95, 40,
        JSON_BUILD_OBJECT('source', 'samsung_health', 'environment', 'bedroom', 'temperature', 22));

-- Insertar sesión de sueño de hace 2 noches
INSERT INTO sleep_sessions (user_id, device_id, sleep_start, sleep_end, total_duration_minutes, sleep_quality_score, deep_sleep_minutes, light_sleep_minutes, rem_sleep_minutes, awake_duration_minutes)
VALUES ('12345678-1234-1234-1234-123456789012', 'galaxy-watch-6', 
        (CURRENT_DATE - INTERVAL '2 days') + TIME '23:45:00', 
        (CURRENT_DATE - INTERVAL '1 day') + TIME '06:45:00', 
        420, 82, 98, 195, 87, 40)
ON CONFLICT DO NOTHING;

-- ========================================
-- VERIFICACIÓN DE DATOS
-- ========================================

-- Ver todos los datos insertados
SELECT 'USUARIOS' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT 'DISPOSITIVOS', COUNT(*) FROM devices  
UNION ALL
SELECT 'DATOS_SALUD', COUNT(*) FROM health_data
UNION ALL
SELECT 'SESIONES_SUEÑO', COUNT(*) FROM sleep_sessions
UNION ALL
SELECT 'ACTIVIDAD_DIARIA', COUNT(*) FROM daily_activity;

-- Ver último heart rate
SELECT 'ULTIMO_HEART_RATE' as info, value || ' BPM' as valor, recorded_at 
FROM health_data 
WHERE metric_type = 'heart_rate' 
ORDER BY recorded_at DESC 
LIMIT 1;

-- Ver actividad de hoy
SELECT 'ACTIVIDAD_HOY' as info, steps || ' pasos, ' || calories_burned || ' cal' as valor
FROM daily_activity 
WHERE activity_date = CURRENT_DATE
LIMIT 1;
