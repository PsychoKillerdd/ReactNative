-- =========================================
-- FUNCIONES AUXILIARES Y CONSULTAS ÚTILES
-- =========================================

-- Función para obtener el resumen de salud de un usuario por fecha
CREATE OR REPLACE FUNCTION get_user_health_summary(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    date DATE,
    steps INTEGER,
    distance_meters DECIMAL,
    calories_burned INTEGER,
    screen_time_minutes INTEGER,
    sleep_duration_hours DECIMAL,
    sleep_quality INTEGER,
    avg_heart_rate INTEGER,
    max_heart_rate INTEGER,
    resting_heart_rate INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_date,
        da.steps,
        da.distance_meters,
        da.calories_burned,
        da.screen_time_minutes,
        ROUND(COALESCE(ss.total_duration_minutes, 0) / 60.0, 2) as sleep_duration_hours,
        ss.sleep_quality_score,
        hr.avg_heart_rate::INTEGER,
        hr.max_heart_rate::INTEGER,
        rhr.resting_heart_rate::INTEGER
    FROM (SELECT p_date as activity_date) dates
    LEFT JOIN daily_activity da ON da.user_id = p_user_id AND da.activity_date = p_date
    LEFT JOIN sleep_sessions ss ON ss.user_id = p_user_id AND DATE(ss.sleep_start) = p_date
    LEFT JOIN (
        SELECT 
            ROUND(AVG(value)) as avg_heart_rate,
            MAX(value) as max_heart_rate
        FROM health_data hd
        JOIN health_metric_types hmt ON hd.metric_type_id = hmt.id
        WHERE hd.user_id = p_user_id 
        AND hmt.name = 'heart_rate'
        AND DATE(hd.recorded_at) = p_date
    ) hr ON true
    LEFT JOIN (
        SELECT value as resting_heart_rate
        FROM health_data hd
        JOIN health_metric_types hmt ON hd.metric_type_id = hmt.id
        WHERE hd.user_id = p_user_id 
        AND hmt.name = 'resting_heart_rate'
        AND DATE(hd.recorded_at) = p_date
        ORDER BY hd.recorded_at DESC
        LIMIT 1
    ) rhr ON true;
END;
$$ LANGUAGE plpgsql;

-- Función para insertar datos de actividad diaria (UPSERT)
CREATE OR REPLACE FUNCTION upsert_daily_activity(
    p_user_id UUID,
    p_device_id UUID,
    p_activity_date DATE,
    p_steps INTEGER DEFAULT NULL,
    p_distance_meters DECIMAL DEFAULT NULL,
    p_calories_burned INTEGER DEFAULT NULL,
    p_active_minutes INTEGER DEFAULT NULL,
    p_screen_time_minutes INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO daily_activity (
        user_id, device_id, activity_date, steps, distance_meters, 
        calories_burned, active_minutes, screen_time_minutes
    )
    VALUES (
        p_user_id, p_device_id, p_activity_date, 
        COALESCE(p_steps, 0), COALESCE(p_distance_meters, 0),
        COALESCE(p_calories_burned, 0), COALESCE(p_active_minutes, 0),
        COALESCE(p_screen_time_minutes, 0)
    )
    ON CONFLICT (user_id, activity_date)
    DO UPDATE SET
        steps = COALESCE(p_steps, daily_activity.steps),
        distance_meters = COALESCE(p_distance_meters, daily_activity.distance_meters),
        calories_burned = COALESCE(p_calories_burned, daily_activity.calories_burned),
        active_minutes = COALESCE(p_active_minutes, daily_activity.active_minutes),
        screen_time_minutes = COALESCE(p_screen_time_minutes, daily_activity.screen_time_minutes),
        device_id = COALESCE(p_device_id, daily_activity.device_id)
    RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Función para insertar múltiples datos de salud
CREATE OR REPLACE FUNCTION insert_health_data_batch(
    p_user_id UUID,
    p_device_id UUID,
    p_metric_name TEXT,
    p_values DECIMAL[],
    p_timestamps TIMESTAMP WITH TIME ZONE[]
)
RETURNS INTEGER AS $$
DECLARE
    metric_id INTEGER;
    inserted_count INTEGER := 0;
    i INTEGER;
BEGIN
    -- Obtener el ID del tipo de métrica
    SELECT id INTO metric_id 
    FROM health_metric_types 
    WHERE name = p_metric_name;
    
    IF metric_id IS NULL THEN
        RAISE EXCEPTION 'Metric type % not found', p_metric_name;
    END IF;
    
    -- Insertar todos los valores
    FOR i IN 1..array_length(p_values, 1)
    LOOP
        INSERT INTO health_data (user_id, device_id, metric_type_id, value, recorded_at)
        VALUES (p_user_id, p_device_id, metric_id, p_values[i], p_timestamps[i]);
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para detectar anomalías en ritmo cardíaco
CREATE OR REPLACE FUNCTION detect_heart_rate_anomalies(
    p_user_id UUID,
    p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
    recorded_at TIMESTAMP WITH TIME ZONE,
    heart_rate DECIMAL,
    anomaly_type TEXT,
    severity TEXT
) AS $$
DECLARE
    user_avg DECIMAL;
    user_stddev DECIMAL;
    threshold_high DECIMAL;
    threshold_low DECIMAL;
BEGIN
    -- Calcular estadísticas del usuario
    SELECT AVG(hd.value), STDDEV(hd.value)
    INTO user_avg, user_stddev
    FROM health_data hd
    JOIN health_metric_types hmt ON hd.metric_type_id = hmt.id
    WHERE hd.user_id = p_user_id 
    AND hmt.name = 'heart_rate'
    AND hd.recorded_at >= CURRENT_DATE - INTERVAL '%d days' % p_days_back;
    
    -- Definir umbrales (2 desviaciones estándar)
    threshold_high := user_avg + (2 * user_stddev);
    threshold_low := user_avg - (2 * user_stddev);
    
    RETURN QUERY
    SELECT 
        hd.recorded_at,
        hd.value,
        CASE 
            WHEN hd.value > threshold_high THEN 'high_heart_rate'
            WHEN hd.value < threshold_low THEN 'low_heart_rate'
        END as anomaly_type,
        CASE 
            WHEN hd.value > user_avg + (3 * user_stddev) OR hd.value < user_avg - (3 * user_stddev) THEN 'critical'
            ELSE 'warning'
        END as severity
    FROM health_data hd
    JOIN health_metric_types hmt ON hd.metric_type_id = hmt.id
    WHERE hd.user_id = p_user_id 
    AND hmt.name = 'heart_rate'
    AND hd.recorded_at >= CURRENT_DATE - INTERVAL '1 day'
    AND (hd.value > threshold_high OR hd.value < threshold_low)
    ORDER BY hd.recorded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- EJEMPLOS DE CONSULTAS ÚTILES
-- =========================================

-- 1. Obtener datos de los últimos 7 días para un usuario
/*
SELECT * FROM get_user_health_summary('user-uuid-here', CURRENT_DATE);
SELECT * FROM get_user_health_summary('user-uuid-here', CURRENT_DATE - INTERVAL '1 day');
*/

-- 2. Tendencia de pasos en las últimas 4 semanas
/*
SELECT 
    DATE_TRUNC('week', activity_date) as week,
    AVG(steps) as avg_steps,
    MAX(steps) as max_steps,
    MIN(steps) as min_steps
FROM daily_activity 
WHERE user_id = 'user-uuid-here'
AND activity_date >= CURRENT_DATE - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', activity_date)
ORDER BY week DESC;
*/

-- 3. Calidad del sueño promedio por mes
/*
SELECT 
    DATE_TRUNC('month', sleep_start) as month,
    AVG(sleep_quality_score) as avg_quality,
    AVG(total_duration_minutes / 60.0) as avg_hours,
    COUNT(*) as nights_recorded
FROM sleep_sessions 
WHERE user_id = 'user-uuid-here'
AND sleep_start >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', sleep_start)
ORDER BY month DESC;
*/

-- 4. Ritmo cardíaco promedio por hora del día
/*
SELECT 
    EXTRACT(hour FROM recorded_at) as hour_of_day,
    AVG(value) as avg_heart_rate,
    COUNT(*) as measurements
FROM health_data hd
JOIN health_metric_types hmt ON hd.metric_type_id = hmt.id
WHERE hd.user_id = 'user-uuid-here'
AND hmt.name = 'heart_rate'
AND hd.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY EXTRACT(hour FROM recorded_at)
ORDER BY hour_of_day;
*/

-- 5. Progreso hacia objetivos
/*
SELECT 
    hg.description,
    hmt.display_name,
    hg.target_value,
    hmt.unit,
    AVG(hd.value) as current_avg,
    (AVG(hd.value) / hg.target_value * 100) as progress_percentage
FROM health_goals hg
JOIN health_metric_types hmt ON hg.metric_type_id = hmt.id
LEFT JOIN health_data hd ON hd.metric_type_id = hg.metric_type_id 
    AND hd.user_id = hg.user_id
    AND hd.recorded_at >= hg.start_date
WHERE hg.user_id = 'user-uuid-here'
AND hg.is_active = true
GROUP BY hg.id, hg.description, hmt.display_name, hg.target_value, hmt.unit;
*/
