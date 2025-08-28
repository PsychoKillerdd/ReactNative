import GoogleFit, { Scopes } from 'react-native-google-fit';
import { PermissionsAndroid, Platform } from 'react-native';
import { HeartRateData, SleepData, StepData } from '../types/health';

export class GoogleFitService {
  static async initializeGoogleFit(): Promise<boolean> {
    try {
      // Request permissions for Android
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to location for fitness data',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
      }

      // Configure Google Fit
      const options = {
        scopes: [
          Scopes.FITNESS_ACTIVITY_READ,
          Scopes.FITNESS_HEART_RATE_READ,
          Scopes.FITNESS_SLEEP_READ,
          Scopes.FITNESS_BODY_READ,
          Scopes.FITNESS_LOCATION_READ,
        ],
      };

      const authResult = await GoogleFit.authorize(options);
      const isAuthorized = authResult.success;
      
      return isAuthorized;
    } catch (error) {
      console.error('Error initializing Google Fit:', error);
      return false;
    }
  }

  static async getHeartRateData(startDate: Date, endDate: Date): Promise<HeartRateData[]> {
    try {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const heartRateData = await GoogleFit.getHeartRateSamples(options);
      
      return heartRateData.map((sample: any) => ({
        timestamp: new Date(sample.startDate).toISOString(),
        value: sample.value,
      }));
    } catch (error) {
      console.error('Error fetching heart rate data:', error);
      return [];
    }
  }

  static async getSleepData(_startDate: Date, _endDate: Date): Promise<SleepData[]> {
    try {
      // Note: Sleep data might not be directly available through react-native-google-fit
      // This is a placeholder implementation
      console.log('Sleep data retrieval not fully implemented in react-native-google-fit');
      return [];
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      return [];
    }
  }

  static async getStepData(startDate: Date, _endDate: Date): Promise<StepData[]> {
    try {
      const stepData = await GoogleFit.getDailySteps(startDate);
      
      if (Array.isArray(stepData)) {
        return stepData.map((sample: any) => ({
          timestamp: new Date(sample.date).toISOString(),
          count: sample.value || 0,
        }));
      }

      // If single day data
      return [{
        timestamp: startDate.toISOString(),
        count: (stepData as any).value || 0,
      }];
    } catch (error) {
      console.error('Error fetching step data:', error);
      return [];
    }
  }

  static async syncWearOSData(): Promise<{
    heartRate: HeartRateData[];
    sleep: SleepData[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (24 * 60 * 60 * 1000)); // Last 24 hours

      const heartRateData = await this.getHeartRateData(startDate, endDate);
      const sleepData = await this.getSleepData(startDate, endDate);

      return {
        heartRate: heartRateData,
        sleep: sleepData,
      };
    } catch (error) {
      console.error('Error syncing Wear OS data:', error);
      return {
        heartRate: [],
        sleep: [],
      };
    }
  }

  static async isConnectedToWearOS(): Promise<boolean> {
    try {
      // Check if there are recent data entries from Wear OS
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (5 * 60 * 1000)); // Last 5 minutes

      const heartRateData = await this.getHeartRateData(startDate, endDate);
      return heartRateData.length > 0;
    } catch (error) {
      console.error('Error checking Wear OS connection:', error);
      return false;
    }
  }
}
