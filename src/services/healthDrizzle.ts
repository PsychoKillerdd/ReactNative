import { GoogleFitService } from './googleFit';
import { DrizzleService } from '../db/drizzleService';
import { ScreenTimeService } from './screenTime';
import { 
  WearOSConnection, 
  HeartRateData, 
  SleepData, 
  StepData, 
  ScreenTimeData,
  HealthSummary,
} from '../types/health';
import { Device, DailyActivity } from '../db/schema';

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
      const devices = await DrizzleService.getUserDevices(this.userId);
      
      // Find current mobile device
      const mobileDevice = devices.find((d: Device) => 
        d.deviceType === 'android_phone' || d.deviceType === 'iphone'
      );

      if (mobileDevice) {
        this.currentDevice = mobileDevice;
      } else {
        // Register new device
        const newDevice = await DrizzleService.registerDevice(this.userId, {
          deviceName: 'Mobile Device',
          deviceType: 'android_phone', // You might want to detect this
          deviceModel: 'Unknown',
          manufacturer: 'Unknown',
        });
        
        this.currentDevice = newDevice;
      }
    } catch (error) {
      console.error('Error ensuring device registration:', error);
    }
  }

  private static async ensureUserProfile(): Promise<void> {
    if (!this.userId) return;

    try {
      const profile = await DrizzleService.getUserProfile(this.userId);
      
      if (!profile) {
        // Create user profile - you'll need to get email from your auth system
        await DrizzleService.createUserProfile(this.userId, {
          email: 'user@example.com', // Replace with actual email from auth
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
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
        await DrizzleService.insertHeartRateBatch(
          this.userId,
          this.currentDevice.id,
          wearOSData.heartRate
        );
      }

      // Store sleep sessions
      for (const sleep of wearOSData.sleep) {
        const sleepEnd = new Date(new Date(sleep.timestamp).getTime() + (sleep.duration * 60 * 60 * 1000));
        
        await DrizzleService.insertSleepSession(
          this.userId,
          this.currentDevice.id,
          {
            sleepStart: sleep.timestamp,
            sleepEnd: sleepEnd.toISOString(),
            qualityScore: sleep.sleepStages ? 85 : undefined, // Mock quality score
          }
        );
      }

      // Store daily activity (steps, screen time, etc.)
      const dailySteps = stepData.reduce((sum, step) => sum + step.count, 0);
      
      await DrizzleService.insertDailyActivity(
        this.userId,
        this.currentDevice.id,
        today,
        {
          steps: dailySteps,
          screenTime: screenTimeData.duration,
        }
      );

      // Update device last sync
      await DrizzleService.updateDeviceLastSync(this.currentDevice.id);

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
        const devices = await DrizzleService.getUserDevices(this.userId);
        wearDevice = devices.find((d: Device) => d.deviceType === 'wear_os') || null;
      }
      
      return {
        isConnected,
        deviceName: wearDevice?.deviceName || (isConnected ? 'Wear OS Device' : undefined),
        deviceId: wearDevice?.id,
        lastSync: wearDevice?.lastSync?.toISOString(),
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
      const summary = await DrizzleService.getUserHealthSummary(this.userId, today);

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
      const dailyData = await DrizzleService.getDailyActivityHistory(this.userId, days);
      
      // Get sleep history
      const sleepData = await DrizzleService.getSleepHistory(this.userId, days);
      
      // Get detailed health data
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
      
      const healthData = await DrizzleService.getHealthDataByDateRange(
        this.userId,
        startDate,
        endDate
      );
      
      // Combine all data sources
      const combinedData = [
        ...dailyData.map((item: DailyActivity) => ({
          id: item.id,
          timestamp: item.activityDate?.toISOString(),
          steps: item.steps,
          distance: item.distanceMeters ? parseFloat(item.distanceMeters) : undefined,
          calories: item.caloriesBurned,
          screenTime: item.screenTimeMinutes,
          dataSource: 'mobile',
          type: 'daily_activity'
        })),
        ...sleepData.map((item: any) => ({
          id: item.id,
          timestamp: item.sleepStart?.toISOString(),
          sleepHours: item.totalDurationMinutes / 60,
          sleepQuality: item.sleepQualityScore,
          dataSource: 'wear_os',
          type: 'sleep'
        })),
        ...healthData.map((item: any) => ({
          id: item.id,
          timestamp: item.recordedAt?.toISOString(),
          heartRate: item.metricType?.name === 'heart_rate' ? parseFloat(item.value) : undefined,
          dataSource: item.metadata?.dataSource || 'unknown',
          type: item.metricType?.name
        }))
      ];

      return combinedData.sort((a, b) => 
        new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
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
      const summary = await DrizzleService.getUserHealthSummary(this.userId, targetDate);
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

  // Real-time data saving methods for Samsung Health integration
  static async saveRealTimeHeartRate(data: {
    value: number;
    timestamp: string;
    source: string;
    accuracy?: number;
  }): Promise<void> {
    try {
      if (!this.userId) {
        console.warn('No current user found for real-time heart rate save');
        return;
      }

      // Get heart rate metric type
      const heartRateMetric = await DrizzleService.getHealthMetricTypeByName('heart_rate');
      if (!heartRateMetric) {
        console.error('Heart rate metric type not found');
        return;
      }

      await DrizzleService.insertHealthData({
        userId: this.userId,
        deviceId: this.currentDevice?.id || '',
        metricTypeId: heartRateMetric.id,
        value: data.value.toString(),
        recordedAt: new Date(data.timestamp),
        metadata: JSON.stringify({
          source: data.source,
          accuracy: data.accuracy || 100,
          realTime: true,
        }),
      });

      console.log('💓 Real-time heart rate saved:', data.value);
    } catch (error) {
      console.error('❌ Error saving real-time heart rate:', error);
    }
  }

  static async saveSleepSession(data: {
    startTime: string;
    endTime: string;
    sleepStage: string;
    duration: number;
    source: string;
  }): Promise<void> {
    try {
      if (!this.userId) {
        console.warn('No current user found for sleep session save');
        return;
      }

      await DrizzleService.insertSleepSession(
        this.userId,
        this.currentDevice?.id || '',
        {
          sleepStart: data.startTime,
          sleepEnd: data.endTime,
          qualityScore: this.calculateSleepQuality(data.sleepStage),
          deepSleepMinutes: data.sleepStage === 'deep' ? data.duration : 0,
          lightSleepMinutes: data.sleepStage === 'light' ? data.duration : 0,
          remSleepMinutes: data.sleepStage === 'rem' ? data.duration : 0,
          awakeDurationMinutes: data.sleepStage === 'awake' ? data.duration : 0,
        }
      );

      console.log('😴 Sleep session saved:', data);
    } catch (error) {
      console.error('❌ Error saving sleep session:', error);
    }
  }

  static async saveStepData(data: {
    count: number;
    timestamp: string;
    distance?: number;
    calories?: number;
    source: string;
  }): Promise<void> {
    try {
      if (!this.userId) {
        console.warn('No current user found for step data save');
        return;
      }

      const dateString = data.timestamp.split('T')[0]; // Extract date from ISO string
      
      await DrizzleService.insertDailyActivity(
        this.userId,
        this.currentDevice?.id || '',
        dateString,
        {
          steps: data.count,
          distanceMeters: data.distance || 0,
          caloriesBurned: data.calories || 0,
          activeMinutes: 0,
        }
      );

      console.log('🚶 Step data saved:', data.count, 'steps');
    } catch (error) {
      console.error('❌ Error saving step data:', error);
    }
  }

  private static calculateSleepQuality(sleepStage: string): number {
    // Simple quality calculation based on sleep stage
    const baseQuality = 70;
    
    switch (sleepStage) {
      case 'deep':
        return Math.min(95, baseQuality + 20);
      case 'rem':
        return Math.min(90, baseQuality + 15);
      case 'light':
        return Math.min(80, baseQuality + 5);
      case 'awake':
        return Math.max(30, baseQuality - 30);
      default:
        return baseQuality;
    }
  }

  // Sync historical data from external sources including Samsung Health
  static async syncHistoricalData(userId: string, days: number = 7): Promise<void> {
    try {
      console.log(`📊 Syncing ${days} days of historical data for user ${userId}...`);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Sync from Samsung Health (if available)
      try {
        const { default: SamsungHealthService } = await import('./samsungHealth');
        
        if (await SamsungHealthService.initialize()) {
          const samsungData = await SamsungHealthService.getHistoricalData(startDate, endDate);
          
          // Save Samsung Health data to database
          for (const record of samsungData.heartRate) {
            await this.saveRealTimeHeartRate({
              value: record.value,
              timestamp: record.timestamp,
              source: 'samsung_health',
              accuracy: record.accuracy,
            });
          }
          
          for (const record of samsungData.sleep) {
            await this.saveSleepSession({
              startTime: record.startTime,
              endTime: record.endTime,
              sleepStage: record.sleepStage,
              duration: record.duration,
              source: 'samsung_health',
            });
          }
          
          for (const record of samsungData.steps) {
            await this.saveStepData({
              count: record.count,
              timestamp: record.timestamp,
              distance: record.distance,
              calories: record.calories,
              source: 'samsung_health',
            });
          }
          
          console.log('✅ Samsung Health data synced successfully');
        }
      } catch (error) {
        console.warn('⚠️ Could not sync Samsung Health data:', error);
      }

      console.log('✅ Historical data sync completed');
    } catch (error) {
      console.error('❌ Error syncing historical data:', error);
      throw error;
    }
  }
}
