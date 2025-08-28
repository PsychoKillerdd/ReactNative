import { NativeModules, NativeEventEmitter } from 'react-native';

// Samsung Health SDK integration for React Native
// This service handles direct communication with Samsung Health

export interface SamsungHealthData {
  heartRate: {
    value: number;
    timestamp: string;
    accuracy: number;
  }[];
  sleep: {
    startTime: string;
    endTime: string;
    sleepStage: 'light' | 'deep' | 'rem' | 'awake';
    duration: number;
  }[];
  steps: {
    count: number;
    timestamp: string;
    distance: number;
    calories: number;
  }[];
}

class SamsungHealthService {
  private static isInitialized = false;
  private static eventEmitter: NativeEventEmitter | null = null;

  static async initialize(): Promise<boolean> {
    try {
      console.log('🔧 Initializing Samsung Health SDK...');
      
      // Check if Samsung Health is available
      if (!NativeModules.SamsungHealth) {
        console.warn('Samsung Health module not found. Make sure to install Samsung Health SDK.');
        return false;
      }

      // Initialize Samsung Health SDK
      const initResult = await NativeModules.SamsungHealth.initialize();
      
      if (initResult.success) {
        this.isInitialized = true;
        this.setupEventListeners();
        console.log('✅ Samsung Health SDK initialized successfully');
        return true;
      } else {
        console.error('❌ Failed to initialize Samsung Health SDK:', initResult.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing Samsung Health SDK:', error);
      return false;
    }
  }

  private static setupEventListeners(): void {
    if (NativeModules.SamsungHealth) {
      this.eventEmitter = new NativeEventEmitter(NativeModules.SamsungHealth);
      
      // Listen for real-time heart rate updates
      this.eventEmitter.addListener('onHeartRateChanged', (data) => {
        console.log('💓 New heart rate data:', data);
        this.handleHeartRateUpdate(data);
      });

      // Listen for sleep data updates
      this.eventEmitter.addListener('onSleepDataChanged', (data) => {
        console.log('😴 New sleep data:', data);
        this.handleSleepUpdate(data);
      });

      // Listen for step data updates
      this.eventEmitter.addListener('onStepDataChanged', (data) => {
        console.log('🚶 New step data:', data);
        this.handleStepUpdate(data);
      });
    }
  }

  static async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.warn('Samsung Health SDK not initialized');
        return false;
      }

      const permissions = [
        'com.samsung.android.providers.health.heartrate',
        'com.samsung.android.providers.health.sleep',
        'com.samsung.android.providers.health.step_count',
        'com.samsung.android.providers.health.exercise',
      ];

      const result = await NativeModules.SamsungHealth.requestPermissions(permissions);
      
      if (result.success) {
        console.log('✅ Samsung Health permissions granted');
        return true;
      } else {
        console.error('❌ Samsung Health permissions denied:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting Samsung Health permissions:', error);
      return false;
    }
  }

  static async startRealTimeTracking(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.warn('Samsung Health SDK not initialized');
        return false;
      }

      const result = await NativeModules.SamsungHealth.startRealTimeTracking({
        heartRate: true,
        steps: true,
        sleep: true,
      });

      if (result.success) {
        console.log('✅ Real-time tracking started');
        return true;
      } else {
        console.error('❌ Failed to start real-time tracking:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error starting real-time tracking:', error);
      return false;
    }
  }

  static async getHistoricalData(
    startDate: Date,
    endDate: Date
  ): Promise<SamsungHealthData> {
    try {
      if (!this.isInitialized) {
        throw new Error('Samsung Health SDK not initialized');
      }

      console.log('📊 Fetching historical data from Samsung Health...');

      const [heartRateData, sleepData, stepData] = await Promise.all([
        NativeModules.SamsungHealth.getHeartRateData(
          startDate.getTime(),
          endDate.getTime()
        ),
        NativeModules.SamsungHealth.getSleepData(
          startDate.getTime(),
          endDate.getTime()
        ),
        NativeModules.SamsungHealth.getStepData(
          startDate.getTime(),
          endDate.getTime()
        ),
      ]);

      return {
        heartRate: heartRateData.map((item: any) => ({
          value: item.heartRate,
          timestamp: new Date(item.timestamp).toISOString(),
          accuracy: item.accuracy || 100,
        })),
        sleep: sleepData.map((item: any) => ({
          startTime: new Date(item.startTime).toISOString(),
          endTime: new Date(item.endTime).toISOString(),
          sleepStage: item.sleepStage,
          duration: item.duration,
        })),
        steps: stepData.map((item: any) => ({
          count: item.stepCount,
          timestamp: new Date(item.timestamp).toISOString(),
          distance: item.distance || 0,
          calories: item.calories || 0,
        })),
      };
    } catch (error) {
      console.error('❌ Error fetching historical data:', error);
      return {
        heartRate: [],
        sleep: [],
        steps: [],
      };
    }
  }

  static async checkWatchConnection(): Promise<{
    isConnected: boolean;
    deviceInfo?: {
      name: string;
      model: string;
      batteryLevel: number;
    };
  }> {
    try {
      if (!this.isInitialized) {
        return { isConnected: false };
      }

      const result = await NativeModules.SamsungHealth.getConnectedDevices();
      
      if (result.devices && result.devices.length > 0) {
        const watch = result.devices.find((device: any) => 
          device.type === 'watch' || device.name.toLowerCase().includes('watch')
        );

        if (watch) {
          return {
            isConnected: true,
            deviceInfo: {
              name: watch.name,
              model: watch.model,
              batteryLevel: watch.batteryLevel || 0,
            },
          };
        }
      }

      return { isConnected: false };
    } catch (error) {
      console.error('❌ Error checking watch connection:', error);
      return { isConnected: false };
    }
  }

  // Event handlers for real-time data
  private static async handleHeartRateUpdate(data: any): Promise<void> {
    try {
      // This will be called by the health service to save to Supabase
      const { HealthService } = await import('./healthDrizzle');
      
      // Format and save the heart rate data
      await HealthService.saveRealTimeHeartRate({
        value: data.heartRate,
        timestamp: new Date(data.timestamp).toISOString(),
        source: 'samsung_watch',
        accuracy: data.accuracy,
      });
    } catch (error) {
      console.error('❌ Error handling heart rate update:', error);
    }
  }

  private static async handleSleepUpdate(data: any): Promise<void> {
    try {
      const { HealthService } = await import('./healthDrizzle');
      
      await HealthService.saveSleepSession({
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        sleepStage: data.sleepStage,
        duration: data.duration,
        source: 'samsung_watch',
      });
    } catch (error) {
      console.error('❌ Error handling sleep update:', error);
    }
  }

  private static async handleStepUpdate(data: any): Promise<void> {
    try {
      const { HealthService } = await import('./healthDrizzle');
      
      await HealthService.saveStepData({
        count: data.stepCount,
        timestamp: new Date(data.timestamp).toISOString(),
        distance: data.distance,
        calories: data.calories,
        source: 'samsung_watch',
      });
    } catch (error) {
      console.error('❌ Error handling step update:', error);
    }
  }

  static cleanup(): void {
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners('onHeartRateChanged');
      this.eventEmitter.removeAllListeners('onSleepDataChanged');
      this.eventEmitter.removeAllListeners('onStepDataChanged');
    }
    this.isInitialized = false;
  }
}

export default SamsungHealthService;
