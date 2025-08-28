import { eq, desc, and, gte, lte, avg } from 'drizzle-orm';
import { db } from './index';
import {
  userProfiles,
  devices,
  healthMetricTypes,
  healthData,
  sleepSessions,
  dailyActivity,
  healthGoals,
  healthAlerts,
  type UserProfile,
  type NewUserProfile,
  type Device,
  type NewDevice,
  type HealthData,
  type NewHealthData,
  type SleepSession,
  type DailyActivity,
} from './schema';

export class DrizzleService {
  // User Profile Methods
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1);
    return result[0] || null;
  }

  static async createUserProfile(userId: string, profile: Omit<NewUserProfile, 'id'>): Promise<UserProfile> {
    const result = await db.insert(userProfiles).values({
      id: userId,
      ...profile,
    }).returning();
    return result[0];
  }

  static async updateUserProfile(userId: string, updates: Partial<NewUserProfile>): Promise<UserProfile | null> {
    const result = await db
      .update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.id, userId))
      .returning();
    return result[0] || null;
  }

  // Device Methods
  static async getUserDevices(userId: string): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.userId, userId));
  }

  static async registerDevice(userId: string, deviceData: Omit<NewDevice, 'id' | 'userId'>): Promise<Device> {
    const result = await db.insert(devices).values({
      userId,
      ...deviceData,
    }).returning();
    return result[0];
  }

  static async updateDeviceLastSync(deviceId: string): Promise<void> {
    await db
      .update(devices)
      .set({ lastSync: new Date() })
      .where(eq(devices.id, deviceId));
  }

  // Health Metric Types
  static async getHealthMetricTypes(): Promise<any[]> {
    return await db.select().from(healthMetricTypes).where(eq(healthMetricTypes.isActive, true));
  }

  static async getHealthMetricTypeByName(name: string): Promise<any | null> {
    const result = await db
      .select()
      .from(healthMetricTypes)
      .where(eq(healthMetricTypes.name, name))
      .limit(1);
    return result[0] || null;
  }

  // Health Data Methods
  static async insertHealthData(data: NewHealthData): Promise<HealthData> {
    const result = await db.insert(healthData).values(data).returning();
    return result[0];
  }

  static async insertHeartRateBatch(
    userId: string,
    deviceId: string,
    heartRateData: Array<{ timestamp: string; value: number }>
  ): Promise<void> {
    // Get heart rate metric type
    const heartRateMetric = await this.getHealthMetricTypeByName('heart_rate');
    if (!heartRateMetric) {
      throw new Error('Heart rate metric type not found');
    }

    const batchData = heartRateData.map(hr => ({
      userId,
      deviceId,
      metricTypeId: heartRateMetric.id,
      value: hr.value.toString(),
      recordedAt: new Date(hr.timestamp),
    }));

    await db.insert(healthData).values(batchData);
  }

  static async getHealthDataByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    return await db
      .select({
        id: healthData.id,
        value: healthData.value,
        recordedAt: healthData.recordedAt,
        metadata: healthData.metadata,
        metricType: {
          id: healthMetricTypes.id,
          name: healthMetricTypes.name,
          displayName: healthMetricTypes.displayName,
          unit: healthMetricTypes.unit,
        },
        device: {
          id: devices.id,
          deviceName: devices.deviceName,
          deviceType: devices.deviceType,
        }
      })
      .from(healthData)
      .leftJoin(healthMetricTypes, eq(healthData.metricTypeId, healthMetricTypes.id))
      .leftJoin(devices, eq(healthData.deviceId, devices.id))
      .where(
        and(
          eq(healthData.userId, userId),
          gte(healthData.recordedAt, new Date(startDate)),
          lte(healthData.recordedAt, new Date(endDate))
        )
      )
      .orderBy(desc(healthData.recordedAt));
  }

  // Sleep Session Methods
  static async insertSleepSession(
    userId: string,
    deviceId: string,
    sleepData: {
      sleepStart: string;
      sleepEnd: string;
      qualityScore?: number;
      deepSleepMinutes?: number;
      lightSleepMinutes?: number;
      remSleepMinutes?: number;
      awakeDurationMinutes?: number;
    }
  ): Promise<SleepSession> {
    const startTime = new Date(sleepData.sleepStart);
    const endTime = new Date(sleepData.sleepEnd);
    const totalDurationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const result = await db.insert(sleepSessions).values({
      userId,
      deviceId,
      sleepStart: startTime,
      sleepEnd: endTime,
      totalDurationMinutes,
      sleepQualityScore: sleepData.qualityScore,
      deepSleepMinutes: sleepData.deepSleepMinutes,
      lightSleepMinutes: sleepData.lightSleepMinutes,
      remSleepMinutes: sleepData.remSleepMinutes,
      awakeDurationMinutes: sleepData.awakeDurationMinutes,
    }).returning();

    return result[0];
  }

  static async getSleepHistory(userId: string, days: number = 7): Promise<SleepSession[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(sleepSessions)
      .where(
        and(
          eq(sleepSessions.userId, userId),
          gte(sleepSessions.sleepStart, cutoffDate)
        )
      )
      .orderBy(desc(sleepSessions.sleepStart));
  }

  // Daily Activity Methods
  static async insertDailyActivity(
    userId: string,
    deviceId: string,
    activityDate: string,
    activityData: {
      steps?: number;
      screenTime?: number;
      distanceMeters?: number;
      caloriesBurned?: number;
      activeMinutes?: number;
      floorsClimbed?: number;
    }
  ): Promise<DailyActivity> {
    const result = await db.insert(dailyActivity).values({
      userId,
      deviceId,
      activityDate: new Date(activityDate),
      steps: activityData.steps,
      screenTimeMinutes: activityData.screenTime,
      distanceMeters: activityData.distanceMeters?.toString(),
      caloriesBurned: activityData.caloriesBurned,
      activeMinutes: activityData.activeMinutes,
      floorsClimbed: activityData.floorsClimbed,
    }).returning();

    return result[0];
  }

  static async getDailyActivityHistory(userId: string, days: number = 7): Promise<DailyActivity[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return await db
      .select()
      .from(dailyActivity)
      .where(
        and(
          eq(dailyActivity.userId, userId),
          gte(dailyActivity.activityDate, cutoffDate)
        )
      )
      .orderBy(desc(dailyActivity.activityDate));
  }

  // Health Summary Method
  static async getUserHealthSummary(userId: string, date: string): Promise<any | null> {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get daily activity for the date
    const dailyActivityResult = await db
      .select()
      .from(dailyActivity)
      .where(
        and(
          eq(dailyActivity.userId, userId),
          gte(dailyActivity.activityDate, startOfDay),
          lte(dailyActivity.activityDate, endOfDay)
        )
      )
      .limit(1);

    // Get sleep data for the date
    const sleepResult = await db
      .select()
      .from(sleepSessions)
      .where(
        and(
          eq(sleepSessions.userId, userId),
          gte(sleepSessions.sleepStart, startOfDay),
          lte(sleepSessions.sleepEnd, endOfDay)
        )
      )
      .limit(1);

    // Get heart rate data for the date
    const heartRateMetric = await this.getHealthMetricTypeByName('heart_rate');
    let avgHeartRate = null;

    if (heartRateMetric) {
      const heartRateResult = await db
        .select({
          avgHeartRate: avg(healthData.value),
        })
        .from(healthData)
        .where(
          and(
            eq(healthData.userId, userId),
            eq(healthData.metricTypeId, heartRateMetric.id),
            gte(healthData.recordedAt, startOfDay),
            lte(healthData.recordedAt, endOfDay)
          )
        );

      avgHeartRate = heartRateResult[0]?.avgHeartRate ? parseFloat(heartRateResult[0].avgHeartRate) : null;
    }

    const dailyData = dailyActivityResult[0];
    const sleepData = sleepResult[0];

    return {
      date,
      steps: dailyData?.steps || 0,
      distance_meters: dailyData?.distanceMeters ? parseFloat(dailyData.distanceMeters) : 0,
      calories_burned: dailyData?.caloriesBurned || 0,
      screen_time_minutes: dailyData?.screenTimeMinutes || 0,
      avg_heart_rate: avgHeartRate,
      sleep_duration_hours: sleepData ? sleepData.totalDurationMinutes / 60 : null,
      sleep_quality: sleepData?.sleepQualityScore || null,
    };
  }

  // Health Goals Methods
  static async getUserHealthGoals(userId: string): Promise<any[]> {
    return await db
      .select({
        id: healthGoals.id,
        targetValue: healthGoals.targetValue,
        currentValue: healthGoals.currentValue,
        goalType: healthGoals.goalType,
        isActive: healthGoals.isActive,
        startDate: healthGoals.startDate,
        endDate: healthGoals.endDate,
        metricType: {
          id: healthMetricTypes.id,
          name: healthMetricTypes.name,
          displayName: healthMetricTypes.displayName,
          unit: healthMetricTypes.unit,
        }
      })
      .from(healthGoals)
      .leftJoin(healthMetricTypes, eq(healthGoals.metricTypeId, healthMetricTypes.id))
      .where(eq(healthGoals.userId, userId))
      .orderBy(desc(healthGoals.createdAt));
  }

  // Health Alerts Methods
  static async getUserHealthAlerts(userId: string, limit: number = 10): Promise<any[]> {
    return await db
      .select({
        id: healthAlerts.id,
        alertType: healthAlerts.alertType,
        severity: healthAlerts.severity,
        status: healthAlerts.status,
        message: healthAlerts.message,
        triggerValue: healthAlerts.triggerValue,
        createdAt: healthAlerts.createdAt,
        metricType: {
          id: healthMetricTypes.id,
          name: healthMetricTypes.name,
          displayName: healthMetricTypes.displayName,
          unit: healthMetricTypes.unit,
        }
      })
      .from(healthAlerts)
      .leftJoin(healthMetricTypes, eq(healthAlerts.metricTypeId, healthMetricTypes.id))
      .where(eq(healthAlerts.userId, userId))
      .orderBy(desc(healthAlerts.createdAt))
      .limit(limit);
  }

  static async acknowledgeAlert(alertId: string): Promise<void> {
    await db
      .update(healthAlerts)
      .set({
        status: 'acknowledged',
        acknowledgedAt: new Date(),
      })
      .where(eq(healthAlerts.id, alertId));
  }

  static async resolveAlert(alertId: string): Promise<void> {
    await db
      .update(healthAlerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
      })
      .where(eq(healthAlerts.id, alertId));
  }
}
