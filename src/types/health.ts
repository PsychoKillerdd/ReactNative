export interface HealthData {
  id?: string;
  userId: string;
  deviceId?: string;
  timestamp: string;
  heartRate?: number;
  sleepHours?: number;
  steps?: number;
  screenTime?: number;
  dataSource: 'wear_os' | 'mobile';
  metadata?: any;
  qualityScore?: number;
}

export interface HeartRateData {
  timestamp: string;
  value: number;
  quality?: number;
}

export interface SleepData {
  timestamp: string;
  duration: number; // in hours
  sleepStart?: string;
  sleepEnd?: string;
  sleepStages?: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
  qualityScore?: number;
  efficiency?: number;
}

export interface StepData {
  timestamp: string;
  count: number;
  distance?: number;
  calories?: number;
}

export interface ScreenTimeData {
  timestamp: string;
  duration: number; // in minutes
}

export interface WearOSConnection {
  isConnected: boolean;
  deviceName?: string;
  deviceId?: string;
  lastSync?: string;
  batteryLevel?: number;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'wear_os' | 'android_phone' | 'iphone' | 'fitness_tracker';
  deviceModel?: string;
  manufacturer?: string;
  osVersion?: string;
  isActive: boolean;
  lastSync?: string;
  deviceIdentifier?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  heightCm?: number;
  weightKg?: number;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyActivity {
  id?: string;
  userId: string;
  deviceId?: string;
  activityDate: string;
  steps: number;
  distanceMeters: number;
  caloriesBurned: number;
  activeMinutes: number;
  sedentaryMinutes: number;
  floorsClimbed: number;
  screenTimeMinutes: number;
}

export interface SleepSession {
  id?: string;
  userId: string;
  deviceId?: string;
  sleepStart: string;
  sleepEnd: string;
  totalDurationMinutes: number;
  deepSleepMinutes: number;
  lightSleepMinutes: number;
  remSleepMinutes: number;
  awakeMinutes: number;
  sleepEfficiency?: number;
  sleepQualityScore?: number;
  interruptionsCount: number;
  notes?: string;
}

export interface HealthMetricType {
  id: number;
  name: string;
  displayName: string;
  unit: string;
  category: 'cardiovascular' | 'activity' | 'sleep' | 'mental_health' | 'other';
  description?: string;
  isActive: boolean;
}

export interface HealthGoal {
  id?: string;
  userId: string;
  metricTypeId: number;
  targetValue: number;
  targetPeriod: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate?: string;
  isActive: boolean;
  description?: string;
}

export interface HealthAlert {
  id?: string;
  userId: string;
  alertType: 'high_heart_rate' | 'low_activity' | 'sleep_deficit' | 'goal_achieved' | 'anomaly_detected';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  triggeredAt: string;
  isRead: boolean;
  isDismissed: boolean;
  metadata?: any;
  expiresAt?: string;
}

export interface HealthSummary {
  date: string;
  steps: number;
  distanceMeters: number;
  caloriesBurned: number;
  screenTimeMinutes: number;
  sleepDurationHours: number;
  sleepQuality: number;
  avgHeartRate: number;
  maxHeartRate: number;
  restingHeartRate: number;
}
