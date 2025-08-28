import { createClient } from '@supabase/supabase-js';
import { HealthData } from '../types/health';

// TODO: Replace with your actual Supabase URL and anon key
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export class SupabaseService {
  // ===============================
  // HEALTH DATA METHODS
  // ===============================
  
  static async insertHealthData(data: HealthData): Promise<{ data: any; error: any }> {
    try {
      // Get metric type ID
      const { data: metricType, error: metricError } = await supabase
        .from('health_metric_types')
        .select('id')
        .eq('name', this.getMetricName(data))
        .single();

      if (metricError || !metricType) {
        return { data: null, error: metricError || 'Metric type not found' };
      }

      const healthRecord = {
        user_id: data.userId,
        device_id: data.deviceId || null,
        metric_type_id: metricType.id,
        value: this.getMetricValue(data),
        recorded_at: data.timestamp,
        metadata: this.buildMetadata(data),
      };

      const { data: result, error } = await supabase
        .from('health_data')
        .insert([healthRecord])
        .select();
      
      return { data: result, error };
    } catch (error) {
      console.error('Error inserting health data:', error);
      return { data: null, error };
    }
  }

  static async insertDailyActivity(
    userId: string,
    deviceId: string | null,
    date: string,
    activityData: {
      steps?: number;
      distance?: number;
      calories?: number;
      screenTime?: number;
    }
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.rpc('upsert_daily_activity', {
        p_user_id: userId,
        p_device_id: deviceId,
        p_activity_date: date,
        p_steps: activityData.steps || null,
        p_distance_meters: activityData.distance || null,
        p_calories_burned: activityData.calories || null,
        p_screen_time_minutes: activityData.screenTime || null,
      });

      return { data, error };
    } catch (error) {
      console.error('Error inserting daily activity:', error);
      return { data: null, error };
    }
  }

  static async insertSleepSession(
    userId: string,
    deviceId: string | null,
    sleepData: {
      sleepStart: string;
      sleepEnd: string;
      deepSleep?: number;
      lightSleep?: number;
      remSleep?: number;
      awakeMinutes?: number;
      qualityScore?: number;
    }
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('sleep_sessions')
        .insert([{
          user_id: userId,
          device_id: deviceId,
          sleep_start: sleepData.sleepStart,
          sleep_end: sleepData.sleepEnd,
          deep_sleep_minutes: sleepData.deepSleep || 0,
          light_sleep_minutes: sleepData.lightSleep || 0,
          rem_sleep_minutes: sleepData.remSleep || 0,
          awake_minutes: sleepData.awakeMinutes || 0,
          sleep_quality_score: sleepData.qualityScore,
        }])
        .select();
      
      return { data, error };
    } catch (error) {
      console.error('Error inserting sleep session:', error);
      return { data: null, error };
    }
  }

  static async insertHeartRateBatch(
    userId: string,
    deviceId: string | null,
    heartRateData: Array<{ value: number; timestamp: string }>
  ): Promise<{ data: any; error: any }> {
    try {
      const values = heartRateData.map(hr => hr.value);
      const timestamps = heartRateData.map(hr => hr.timestamp);

      const { data, error } = await supabase.rpc('insert_health_data_batch', {
        p_user_id: userId,
        p_device_id: deviceId,
        p_metric_name: 'heart_rate',
        p_values: values,
        p_timestamps: timestamps,
      });

      return { data, error };
    } catch (error) {
      console.error('Error inserting heart rate batch:', error);
      return { data: null, error };
    }
  }

  // ===============================
  // QUERY METHODS
  // ===============================

  static async getUserHealthSummary(
    userId: string,
    date?: string
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase.rpc('get_user_health_summary', {
        p_user_id: userId,
        p_date: date || new Date().toISOString().split('T')[0],
      });
      
      return { data: data?.[0] || null, error };
    } catch (error) {
      console.error('Error fetching health summary:', error);
      return { data: null, error };
    }
  }

  static async getHealthDataByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
    metricTypes?: string[]
  ): Promise<{ data: any; error: any }> {
    try {
      let query = supabase
        .from('health_data')
        .select(`
          *,
          health_metric_types (name, display_name, unit, category),
          devices (device_name, device_type)
        `)
        .eq('user_id', userId)
        .gte('recorded_at', startDate)
        .lte('recorded_at', endDate)
        .order('recorded_at', { ascending: false });

      if (metricTypes && metricTypes.length > 0) {
        query = query.in('health_metric_types.name', metricTypes);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (error) {
      console.error('Error fetching health data by date range:', error);
      return { data: null, error };
    }
  }

  static async getDailyActivityHistory(
    userId: string,
    days: number = 30
  ): Promise<{ data: any; error: any }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('daily_activity')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', startDate.toISOString().split('T')[0])
        .order('activity_date', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching daily activity history:', error);
      return { data: null, error };
    }
  }

  static async getSleepHistory(
    userId: string,
    days: number = 30
  ): Promise<{ data: any; error: any }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('sleep_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('sleep_start', startDate.toISOString())
        .order('sleep_start', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching sleep history:', error);
      return { data: null, error };
    }
  }

  // ===============================
  // DEVICE MANAGEMENT
  // ===============================

  static async registerDevice(
    userId: string,
    deviceData: {
      name: string;
      type: string;
      model?: string;
      manufacturer?: string;
      osVersion?: string;
      identifier?: string;
    }
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .insert([{
          user_id: userId,
          device_name: deviceData.name,
          device_type: deviceData.type,
          device_model: deviceData.model,
          manufacturer: deviceData.manufacturer,
          os_version: deviceData.osVersion,
          device_identifier: deviceData.identifier,
        }])
        .select();
      
      return { data, error };
    } catch (error) {
      console.error('Error registering device:', error);
      return { data: null, error };
    }
  }

  static async getUserDevices(userId: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching user devices:', error);
      return { data: null, error };
    }
  }

  static async updateDeviceLastSync(deviceId: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('devices')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', deviceId)
        .select();
      
      return { data, error };
    } catch (error) {
      console.error('Error updating device sync:', error);
      return { data: null, error };
    }
  }

  // ===============================
  // USER PROFILE METHODS
  // ===============================

  static async createUserProfile(
    userId: string,
    profileData: {
      email: string;
      fullName?: string;
      dateOfBirth?: string;
      gender?: string;
      height?: number;
      weight?: number;
      timezone?: string;
    }
  ): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
          id: userId,
          email: profileData.email,
          full_name: profileData.fullName,
          date_of_birth: profileData.dateOfBirth,
          gender: profileData.gender,
          height_cm: profileData.height,
          weight_kg: profileData.weight,
          timezone: profileData.timezone || 'UTC',
        }])
        .select();
      
      return { data, error };
    } catch (error) {
      console.error('Error creating user profile:', error);
      return { data: null, error };
    }
  }

  static async getUserProfile(userId: string): Promise<{ data: any; error: any }> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      return { data, error };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { data: null, error };
    }
  }

  // ===============================
  // HELPER METHODS
  // ===============================

  private static getMetricName(data: HealthData): string {
    if (data.heartRate !== undefined) return 'heart_rate';
    if (data.sleepHours !== undefined) return 'sleep_duration';
    if (data.steps !== undefined) return 'steps';
    if (data.screenTime !== undefined) return 'screen_time';
    throw new Error('Unknown metric type');
  }

  private static getMetricValue(data: HealthData): number {
    if (data.heartRate !== undefined) return data.heartRate;
    if (data.sleepHours !== undefined) return data.sleepHours;
    if (data.steps !== undefined) return data.steps;
    if (data.screenTime !== undefined) return data.screenTime;
    throw new Error('No metric value found');
  }

  private static buildMetadata(data: HealthData): any {
    const metadata: any = {
      dataSource: data.dataSource,
    };

    // Add additional context based on data type
    if (data.heartRate !== undefined) {
      metadata.type = 'heart_rate';
    } else if (data.sleepHours !== undefined) {
      metadata.type = 'sleep';
    } else if (data.steps !== undefined) {
      metadata.type = 'steps';
    } else if (data.screenTime !== undefined) {
      metadata.type = 'screen_time';
    }

    return metadata;
  }

  // ===============================
  // AUTHENTICATION METHODS
  // ===============================

  static async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  static async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
}
