import { GoogleFitService } from './googleFit';
import { SupabaseService } from './supabase';
import { ScreenTimeService } from './screenTime';
import { 
  WearOSConnection, 
  HeartRateData, 
  SleepData, 
  StepData, 
  ScreenTimeData,
  Device,
  HealthSummary,
  DailyActivity
} from '../types/health';

export class HealthService {
  private static isInitialized = false;
  private static userId: string | null = null;
  private static currentDevice: Device | null = null;

  static async initialize(userId: string): Promise<boolean> {
    try {
      this.userId = userId;
      
      // Initialize Google Fit
      const googleFitInitialized = await GoogleFitService.initializeGoogleFit();
      
      // Initialize Screen Time tracking
      await ScreenTimeService.initializeScreenTimeTracking();
      
      // Register or get current device
      await this.ensureDeviceRegistered();
      
      // Create user profile if it doesn't exist
      await this.ensureUserProfile();
      
      this.isInitialized = true;
      console.log('Health Service initialized successfully');
      return googleFitInitialized;
    } catch (error) {
      console.error('Error initializing Health Service:', error);
      return false;
    }
  }

  private static async ensureDeviceRegistered(): Promise<void> {
    if (!this.userId) return;

    try {
      // Try to get existing devices
      const { data: devices } = await SupabaseService.getUserDevices(this.userId);
      
      // Find current mobile device
      const mobileDevice = devices?.find((d: Device) => 
        d.deviceType === 'android_phone' || d.deviceType === 'iphone'
      );

      if (mobileDevice) {
        this.currentDevice = mobileDevice;
      } else {
        // Register new device
        const { data: newDevice } = await SupabaseService.registerDevice(this.userId, {
          name: 'Mobile Device',
          type: 'android_phone', // You might want to detect this
          model: 'Unknown',
          manufacturer: 'Unknown',
        });
        
        if (newDevice && newDevice[0]) {
          this.currentDevice = newDevice[0];
        }
      }
    } catch (error) {
      console.error('Error ensuring device registration:', error);
    }
  }

  private static async ensureUserProfile(): Promise<void> {
    if (!this.userId) return;

    try {
      const { error } = await SupabaseService.getUserProfile(this.userId);
      
      if (error && error.code === 'PGRST116') { // Row not found
        // Get user email from auth
        const user = await SupabaseService.getCurrentUser();
        if (user?.email) {
          await SupabaseService.createUserProfile(this.userId, {
            email: user.email,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  }

  static async syncAllHealthData(): Promise<void> {
    if (!this.isInitialized || !this.userId || !this.currentDevice) {
      throw new Error('Health Service not initialized');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Sync Wear OS data (Heart Rate and Sleep from Google Fit)
      const wearOSData = await GoogleFitService.syncWearOSData();
      
      // Get mobile data (Steps and Screen Time)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000));
      const stepData = await GoogleFitService.getStepData(startDate, endDate);
      const screenTimeData = await ScreenTimeService.getTodayScreenTime();

      // Store heart rate data in batch
      if (wearOSData.heartRate.length > 0) {
        const { error } = await SupabaseService.insertHeartRateBatch(
          this.userId,
          this.currentDevice.id,
          wearOSData.heartRate
        );
        if (error) {
          console.error('Error storing heart rate batch:', error);
        }
      }

      // Store sleep sessions
      for (const sleep of wearOSData.sleep) {
        const sleepEnd = new Date(new Date(sleep.timestamp).getTime() + (sleep.duration * 60 * 60 * 1000));
        
        const { error } = await SupabaseService.insertSleepSession(
          this.userId,
          this.currentDevice.id,
          {
            sleepStart: sleep.timestamp,
            sleepEnd: sleepEnd.toISOString(),
            qualityScore: sleep.sleepStages ? 85 : undefined, // Mock quality score
          }
        );
        if (error) {
          console.error('Error storing sleep data:', error);
        }
      }

      // Store daily activity (steps, screen time, etc.)
      const dailySteps = stepData.reduce((sum, step) => sum + step.count, 0);
      
      const { error: activityError } = await SupabaseService.insertDailyActivity(
        this.userId,
        this.currentDevice.id,
        today,
        {
          steps: dailySteps,
          screenTime: screenTimeData.duration,
        }
      );

      if (activityError) {
        console.error('Error storing daily activity:', activityError);
      }

      // Update device last sync
      await SupabaseService.updateDeviceLastSync(this.currentDevice.id);

      console.log('Health data sync completed successfully');
    } catch (error) {
      console.error('Error syncing health data:', error);
      throw error;
    }
  }

  static async getWearOSConnectionStatus(): Promise<WearOSConnection> {
    try {
      const isConnected = await GoogleFitService.isConnectedToWearOS();
      
      // Try to find Wear OS device
      let wearDevice: Device | null = null;
      if (this.userId) {
        const { data: devices } = await SupabaseService.getUserDevices(this.userId);
        wearDevice = devices?.find((d: Device) => d.deviceType === 'wear_os') || null;
      }
      
      return {
        isConnected,
        deviceName: wearDevice?.deviceName || (isConnected ? 'Wear OS Device' : undefined),
        deviceId: wearDevice?.id,
        lastSync: wearDevice?.lastSync,
      };
    } catch (error) {
      console.error('Error checking Wear OS connection:', error);
      return {
        isConnected: false,
      };
    }
  }

  static async getTodayStats(): Promise<{
    heartRate: HeartRateData | null;
    sleep: SleepData | null;
    steps: StepData | null;
    screenTime: ScreenTimeData | null;
  }> {
    try {
      if (!this.userId) {
        throw new Error('User not initialized');
      }

      // Get today's summary from database
      const today = new Date().toISOString().split('T')[0];
      const { data: summary } = await SupabaseService.getUserHealthSummary(this.userId, today);

      // Get latest heart rate from Google Fit (real-time)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (60 * 60 * 1000)); // Last hour
      const heartRateData = await GoogleFitService.getHeartRateData(startTime, endTime);
      const latestHeartRate = heartRateData.length > 0 ? heartRateData[heartRateData.length - 1] : null;

      // Get current screen time
      const screenTime = await ScreenTimeService.getTodayScreenTime();
      
      return {
        heartRate: latestHeartRate || (summary?.avg_heart_rate ? {
          timestamp: new Date().toISOString(),
          value: summary.avg_heart_rate
        } : null),
        sleep: summary?.sleep_duration_hours ? {
          timestamp: summary.date,
          duration: summary.sleep_duration_hours,
          qualityScore: summary.sleep_quality
        } : null,
        steps: summary?.steps ? {
          timestamp: summary.date,
          count: summary.steps,
          distance: summary.distance_meters,
          calories: summary.calories_burned
        } : null,
        screenTime: {
          timestamp: screenTime.timestamp,
          duration: screenTime.duration
        }
      };
    } catch (error) {
      console.error('Error getting today stats:', error);
      return {
        heartRate: null,
        sleep: null,
        steps: null,
        screenTime: null,
      };
    }
  }

  static async getHistoricalData(days: number = 7): Promise<any[]> {
    if (!this.userId) {
      return [];
    }

    try {
      // Get daily activity history
      const { data: dailyData } = await SupabaseService.getDailyActivityHistory(this.userId, days);
      
      // Get sleep history
      const { data: sleepData } = await SupabaseService.getSleepHistory(this.userId, days);
      
      // Get detailed health data
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
      
      const { data: healthData } = await SupabaseService.getHealthDataByDateRange(
        this.userId,
        startDate,
        endDate
      );
      
      // Combine all data sources
      const combinedData = [
        ...(dailyData || []).map((item: DailyActivity) => ({
          id: item.id,
          timestamp: item.activityDate,
          steps: item.steps,
          distance: item.distanceMeters,
          calories: item.caloriesBurned,
          screenTime: item.screenTimeMinutes,
          dataSource: 'mobile',
          type: 'daily_activity'
        })),
        ...(sleepData || []).map((item: any) => ({
          id: item.id,
          timestamp: item.sleep_start,
          sleepHours: item.total_duration_minutes / 60,
          sleepQuality: item.sleep_quality_score,
          dataSource: 'wear_os',
          type: 'sleep'
        })),
        ...(healthData || []).map((item: any) => ({
          id: item.id,
          timestamp: item.recorded_at,
          heartRate: item.health_metric_types?.name === 'heart_rate' ? item.value : undefined,
          dataSource: item.metadata?.dataSource || 'unknown',
          type: item.health_metric_types?.name
        }))
      ];

      return combinedData.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  static async getHealthSummary(date?: string): Promise<HealthSummary | null> {
    if (!this.userId) return null;

    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const { data: summary } = await SupabaseService.getUserHealthSummary(this.userId, targetDate);
      return summary;
    } catch (error) {
      console.error('Error getting health summary:', error);
      return null;
    }
  }

  static cleanup(): void {
    ScreenTimeService.cleanup();
    this.isInitialized = false;
    this.userId = null;
    this.currentDevice = null;
  }
}
