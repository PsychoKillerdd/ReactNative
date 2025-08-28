import { createClient } from '@supabase/supabase-js';

// Supabase configuration - credenciales de tu proyecto real
const SUPABASE_URL = 'https://kgzqliseokkckbcjvdyx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnenFsaXNlb2trY2tiY2p2ZHl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY4OTksImV4cCI6MjA3MTE5MzI4OTkifQ.g_p_iwd_IjB5W0JLeWH-ztpNIhXQCITc1j0ZUDdaLBc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  // 🔥 MÉTODO SIMPLE PARA INSERTAR DATOS DIRECTAMENTE
  static async insertHealthData(data: {
    userId: string;
    deviceId: string;
    metricType: string;
    value: string;
    timestamp: string;
    metadata?: any;
  }) {
    try {
      const { data: result, error } = await supabase
        .from('health_data')
        .insert({
          user_id: data.userId,
          device_id: data.deviceId,
          metric_type: data.metricType,
          value: data.value,
          recorded_at: data.timestamp,
          metadata: data.metadata || {}
        })
        .select();

      if (error) {
        console.error('Supabase Error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: any) {
      console.error('Insert Error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  // 📊 OBTENER DATOS DE SALUD RECIENTES
  static async getRecentHealthData(userId: string, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('health_data')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) {
        console.error('Get Data Error:', error);
        return { success: false, error: error.message, data: [] };
      }

      return { success: true, data: data || [] };
    } catch (error: any) {
      console.error('Fetch Error:', error);
      return { success: false, error: error.message || 'Unknown error', data: [] };
    }
  }

  // 💓 INSERTAR HEART RATE
  static async insertHeartRate(userId: string, deviceId: string, heartRate: number) {
    return this.insertHealthData({
      userId,
      deviceId,
      metricType: 'heart_rate',
      value: heartRate.toString(),
      timestamp: new Date().toISOString(),
      metadata: { source: 'samsung_health', accuracy: 95 }
    });
  }

  // 🚶 INSERTAR PASOS DIARIOS  
  static async insertDailySteps(userId: string, deviceId: string, steps: number) {
    return this.insertHealthData({
      userId,
      deviceId,
      metricType: 'daily_steps',
      value: steps.toString(),
      timestamp: new Date().toISOString(),
      metadata: { date: new Date().toISOString().split('T')[0] }
    });
  }

  // 😴 INSERTAR DATOS DE SUEÑO
  static async insertSleepData(userId: string, deviceId: string, sleepHours: number) {
    return this.insertHealthData({
      userId,
      deviceId,
      metricType: 'sleep_duration',
      value: sleepHours.toString(),
      timestamp: new Date().toISOString(),
      metadata: { unit: 'hours' }
    });
  }

  // 🔍 TEST DE CONEXIÓN
  static async testConnection() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error && error.message !== 'Auth session missing!') {
        return { success: false, error: error.message };
      }
      return { success: true, message: 'Conexión exitosa' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  // 📈 OBTENER RESUMEN DIARIO
  static async getDailySummary(userId: string, date?: string) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('health_data')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_at', targetDate + 'T00:00:00.000Z')
        .lte('recorded_at', targetDate + 'T23:59:59.999Z')
        .order('recorded_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message, data: null };
      }

      // Procesar datos para el resumen
      const heartRates = data.filter(item => item.metric_type === 'heart_rate');
      const steps = data.filter(item => item.metric_type === 'daily_steps');
      const sleep = data.filter(item => item.metric_type === 'sleep_duration');

      const summary = {
        date: targetDate,
        heartRate: {
          latest: heartRates.length > 0 ? parseInt(heartRates[0].value) : 0,
          average: heartRates.length > 0 ? Math.round(heartRates.reduce((sum, hr) => sum + parseInt(hr.value), 0) / heartRates.length) : 0,
          count: heartRates.length
        },
        steps: {
          total: steps.length > 0 ? parseInt(steps[0].value) : 0,
          recorded: steps.length > 0
        },
        sleep: {
          hours: sleep.length > 0 ? parseFloat(sleep[0].value) : 0,
          recorded: sleep.length > 0
        },
        totalRecords: data.length
      };

      return { success: true, data: summary };
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error', data: null };
    }
  }

  // 👤 Métodos de autenticación básicos (si los necesitas)
  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  static async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  static async signUp(email: string, password: string) {
    return await supabase.auth.signUp({ email, password });
  }

  static async signOut() {
    return await supabase.auth.signOut();
  }
}
