import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenTimeData } from '../types/health';

export class ScreenTimeService {
  private static startTime: number = 0;
  private static dailyScreenTime: number = 0;
  private static lastSaveDate: string = '';
  private static subscription: any = null;

  static async initializeScreenTimeTracking(): Promise<void> {
    try {
      // Load previous data
      await this.loadDailyScreenTime();
      
      // Set up app state change listener
      this.subscription = AppState.addEventListener('change', this.handleAppStateChange);
      
      // Start tracking when app becomes active
      if (AppState.currentState === 'active') {
        this.startTracking();
      }
    } catch (error) {
      console.error('Error initializing screen time tracking:', error);
    }
  }

  private static handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'active') {
      this.startTracking();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      this.stopTracking();
    }
  };

  private static startTracking(): void {
    this.startTime = Date.now();
  }

  private static async stopTracking(): Promise<void> {
    if (this.startTime > 0) {
      const sessionTime = Math.floor((Date.now() - this.startTime) / 1000 / 60); // Convert to minutes
      this.dailyScreenTime += sessionTime;
      this.startTime = 0;
      
      await this.saveDailyScreenTime();
    }
  }

  private static async loadDailyScreenTime(): Promise<void> {
    try {
      const today = new Date().toDateString();
      const savedData = await AsyncStorage.getItem('screenTimeData');
      
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // If it's a new day, reset the counter
        if (data.date !== today) {
          this.dailyScreenTime = 0;
          this.lastSaveDate = today;
        } else {
          this.dailyScreenTime = data.screenTime || 0;
          this.lastSaveDate = data.date;
        }
      } else {
        this.dailyScreenTime = 0;
        this.lastSaveDate = today;
      }
    } catch (error) {
      console.error('Error loading screen time data:', error);
      this.dailyScreenTime = 0;
      this.lastSaveDate = new Date().toDateString();
    }
  }

  private static async saveDailyScreenTime(): Promise<void> {
    try {
      const today = new Date().toDateString();
      
      // If it's a new day, reset the counter
      if (this.lastSaveDate !== today) {
        this.dailyScreenTime = 0;
        this.lastSaveDate = today;
      }
      
      const data = {
        date: today,
        screenTime: this.dailyScreenTime,
      };
      
      await AsyncStorage.setItem('screenTimeData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving screen time data:', error);
    }
  }

  static async getCurrentScreenTime(): Promise<number> {
    // Add current session time if app is active
    let currentTime = this.dailyScreenTime;
    
    if (this.startTime > 0 && AppState.currentState === 'active') {
      const currentSession = Math.floor((Date.now() - this.startTime) / 1000 / 60);
      currentTime += currentSession;
    }
    
    return currentTime;
  }

  static async getScreenTimeData(startDate: Date, _endDate: Date): Promise<ScreenTimeData[]> {
    try {
      // For now, we only track current day's screen time
      // In a real implementation, you would store historical data
      const today = new Date().toDateString();
      const requestedDate = startDate.toDateString();
      
      if (requestedDate === today) {
        const screenTime = await this.getCurrentScreenTime();
        return [{
          timestamp: new Date().toISOString(),
          duration: screenTime,
        }];
      }
      
      // Return empty array for historical data (not implemented)
      return [];
    } catch (error) {
      console.error('Error fetching screen time data:', error);
      return [];
    }
  }

  static async getTodayScreenTime(): Promise<ScreenTimeData> {
    const screenTime = await this.getCurrentScreenTime();
    return {
      timestamp: new Date().toISOString(),
      duration: screenTime,
    };
  }

  static cleanup(): void {
    if (this.subscription) {
      this.subscription.remove();
    }
  }
}
