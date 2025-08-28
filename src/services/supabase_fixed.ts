import { createClient } from '@supabase/supabase-js';
import { HealthData } from '../types/health';

// Supabase configuration - usando las credenciales reales
const SUPABASE_URL = 'https://nnnjiepnpsedqjyokfmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubmppZXBucHNlZHFqeW9rZm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNTcyNDcsImV4cCI6MjA1MDkzMzI0N30.t2fmmgqLz6qYXyUpP9i0bGlBJUEhAEIq3TZHGgLs1gA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  // 📊 Obtener datos de salud recientes del usuario
  static async getRecentHealthData(userId: string, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Obtener datos de frecuencia cardíaca
      const { data: heartRateData, error: hrError } = await supabase
        .from('health_data')
        .select('*')
        .eq('user_id', userId)
        .eq('metric_type', 'heart_rate')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(50);

      // Obtener datos de sueño
      const { data: sleepData, error: sleepError } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('sleep_start', startDate.toISOString())
        .order('sleep_start', { ascending: false })
        .limit(10);

      // Obtener datos de actividad
      const { data: activityData, error: activityError } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', startDate.toISOString().split('T')[0])
        .order('activity_date', { ascending: false })
        .limit(7);

      if (hrError || sleepError || activityError) {
        console.error('Error fetching health data:', { hrError, sleepError, activityError });
      }

      return {
        heartRate: heartRateData || [],
        sleep: sleepData || [],
        activity: activityData || [],
        error: hrError || sleepError || activityError
      };

    } catch (error) {
      console.error('Error in getRecentHealthData:', error);
      return {
        heartRate: [],
        sleep: [],
        activity: [],
        error: error
      };
    }
  }

  // 💓 Obtener último dato de frecuencia cardíaca
  static async getLatestHeartRate(userId: string) {
    try {
      const { data, error } = await supabase
        .from('health_data')
        .select('value, recorded_at')
        .eq('user_id', userId)
        .eq('metric_type', 'heart_rate')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // 🚶 Obtener pasos de hoy
  static async getTodaySteps(userId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_activity')
        .select('steps, distance_meters, calories_burned')
        .eq('user_id', userId)
        .eq('activity_date', today)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // 😴 Obtener último sueño
  static async getLatestSleep(userId: string) {
    try {
      const { data, error } = await supabase
        .from('sleep_sessions')
        .select('total_duration_minutes, sleep_quality_score, sleep_start, sleep_end')
        .eq('user_id', userId)
        .order('sleep_start', { ascending: false })
        .limit(1)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error };
    }
  }

  // 🔄 Probar conexión a Supabase
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      return { connected: !error, error };
    } catch (error) {
      return { connected: false, error };
    }
  }

  // 📤 Insertar datos de prueba (para testing)
  static async insertSampleData(userId: string) {
    try {
      // Insertar heart rate de prueba
      const { data: hrData, error: hrError } = await supabase
        .from('health_data')
        .insert({
          user_id: userId,
          device_id: 'sample-device',
          metric_type: 'heart_rate',
          value: (Math.floor(Math.random() * 30) + 60).toString(), // 60-90 BPM
          recorded_at: new Date().toISOString(),
          metadata: {
            source: 'sample_data',
            accuracy: 95
          }
        });

      // Insertar actividad de hoy
      const today = new Date().toISOString().split('T')[0];
      const { data: activityData, error: activityError } = await supabase
        .from('daily_activity')
        .insert({
          user_id: userId,
          device_id: 'sample-device',
          activity_date: today,
          steps: Math.floor(Math.random() * 5000) + 5000, // 5000-10000 steps
          distance_meters: Math.floor(Math.random() * 3000 + 2000).toString(),
          calories_burned: Math.floor(Math.random() * 300) + 200,
          active_minutes: Math.floor(Math.random() * 60) + 30,
          metadata: {
            source: 'sample_data'
          }
        });

      return {
        success: !hrError && !activityError,
        errors: { hrError, activityError }
      };

    } catch (error) {
      return { success: false, error };
    }
  }
}
