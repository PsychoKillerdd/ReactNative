import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  text,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const deviceTypeEnum = pgEnum('device_type', [
  'wear_os',
  'android_phone',
  'iphone',
  'fitness_tracker'
]);

export const alertStatusEnum = pgEnum('alert_status', [
  'active',
  'acknowledged',
  'resolved'
]);

export const alertSeverityEnum = pgEnum('alert_severity', [
  'low',
  'medium',
  'high',
  'critical'
]);

// Tables
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  dateOfBirth: timestamp('date_of_birth'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: index('idx_user_profiles_email').on(table.email),
}));

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  deviceName: varchar('device_name', { length: 255 }).notNull(),
  deviceType: deviceTypeEnum('device_type').notNull(),
  deviceModel: varchar('device_model', { length: 255 }),
  manufacturer: varchar('manufacturer', { length: 255 }),
  isActive: boolean('is_active').default(true),
  lastSync: timestamp('last_sync'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_devices_user_id').on(table.userId),
  deviceTypeIdx: index('idx_devices_device_type').on(table.deviceType),
}));

export const healthMetricTypes = pgTable('health_metric_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  description: text('description'),
  minValue: decimal('min_value'),
  maxValue: decimal('max_value'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const healthData = pgTable('health_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  metricTypeId: uuid('metric_type_id').notNull().references(() => healthMetricTypes.id, { onDelete: 'restrict' }),
  value: decimal('value').notNull(),
  recordedAt: timestamp('recorded_at').notNull(),
  metadata: text('metadata'), // JSON field for additional data
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_health_data_user_id').on(table.userId),
  userIdRecordedAtIdx: index('idx_health_data_user_id_recorded_at').on(table.userId, table.recordedAt),
  metricTypeIdx: index('idx_health_data_metric_type_id').on(table.metricTypeId),
}));

export const sleepSessions = pgTable('sleep_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  sleepStart: timestamp('sleep_start').notNull(),
  sleepEnd: timestamp('sleep_end').notNull(),
  totalDurationMinutes: integer('total_duration_minutes').notNull(),
  deepSleepMinutes: integer('deep_sleep_minutes'),
  lightSleepMinutes: integer('light_sleep_minutes'),
  remSleepMinutes: integer('rem_sleep_minutes'),
  awakeDurationMinutes: integer('awake_duration_minutes'),
  sleepQualityScore: integer('sleep_quality_score'), // 0-100
  metadata: text('metadata'), // JSON field for sleep stages, etc.
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_sleep_sessions_user_id').on(table.userId),
  userIdSleepStartIdx: index('idx_sleep_sessions_user_id_sleep_start').on(table.userId, table.sleepStart),
}));

export const dailyActivity = pgTable('daily_activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  deviceId: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  activityDate: timestamp('activity_date').notNull(),
  steps: integer('steps'),
  distanceMeters: decimal('distance_meters'),
  caloriesBurned: integer('calories_burned'),
  activeMinutes: integer('active_minutes'),
  screenTimeMinutes: integer('screen_time_minutes'),
  floorsClimbed: integer('floors_climbed'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_daily_activity_user_id').on(table.userId),
  userIdDateIdx: index('idx_daily_activity_user_id_date').on(table.userId, table.activityDate),
  uniqueUserDateDevice: index('idx_daily_activity_unique').on(table.userId, table.activityDate, table.deviceId),
}));

export const healthGoals = pgTable('health_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  metricTypeId: uuid('metric_type_id').notNull().references(() => healthMetricTypes.id, { onDelete: 'cascade' }),
  targetValue: decimal('target_value').notNull(),
  currentValue: decimal('current_value').default('0'),
  goalType: varchar('goal_type', { length: 50 }).notNull(), // 'daily', 'weekly', 'monthly'
  isActive: boolean('is_active').default(true),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_health_goals_user_id').on(table.userId),
  activeGoalsIdx: index('idx_health_goals_active').on(table.userId, table.isActive),
}));

export const healthAlerts = pgTable('health_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  metricTypeId: uuid('metric_type_id').notNull().references(() => healthMetricTypes.id, { onDelete: 'cascade' }),
  healthDataId: uuid('health_data_id').references(() => healthData.id, { onDelete: 'set null' }),
  alertType: varchar('alert_type', { length: 100 }).notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  status: alertStatusEnum('status').default('active'),
  message: text('message').notNull(),
  triggerValue: decimal('trigger_value'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_health_alerts_user_id').on(table.userId),
  statusIdx: index('idx_health_alerts_status').on(table.status),
  userIdStatusIdx: index('idx_health_alerts_user_id_status').on(table.userId, table.status),
}));

// Relations
export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  devices: many(devices),
  healthData: many(healthData),
  sleepSessions: many(sleepSessions),
  dailyActivity: many(dailyActivity),
  healthGoals: many(healthGoals),
  healthAlerts: many(healthAlerts),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  userProfile: one(userProfiles, {
    fields: [devices.userId],
    references: [userProfiles.id],
  }),
  healthData: many(healthData),
  sleepSessions: many(sleepSessions),
  dailyActivity: many(dailyActivity),
}));

export const healthMetricTypesRelations = relations(healthMetricTypes, ({ many }) => ({
  healthData: many(healthData),
  healthGoals: many(healthGoals),
  healthAlerts: many(healthAlerts),
}));

export const healthDataRelations = relations(healthData, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [healthData.userId],
    references: [userProfiles.id],
  }),
  device: one(devices, {
    fields: [healthData.deviceId],
    references: [devices.id],
  }),
  metricType: one(healthMetricTypes, {
    fields: [healthData.metricTypeId],
    references: [healthMetricTypes.id],
  }),
}));

export const sleepSessionsRelations = relations(sleepSessions, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [sleepSessions.userId],
    references: [userProfiles.id],
  }),
  device: one(devices, {
    fields: [sleepSessions.deviceId],
    references: [devices.id],
  }),
}));

export const dailyActivityRelations = relations(dailyActivity, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [dailyActivity.userId],
    references: [userProfiles.id],
  }),
  device: one(devices, {
    fields: [dailyActivity.deviceId],
    references: [devices.id],
  }),
}));

export const healthGoalsRelations = relations(healthGoals, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [healthGoals.userId],
    references: [userProfiles.id],
  }),
  metricType: one(healthMetricTypes, {
    fields: [healthGoals.metricTypeId],
    references: [healthMetricTypes.id],
  }),
}));

export const healthAlertsRelations = relations(healthAlerts, ({ one }) => ({
  userProfile: one(userProfiles, {
    fields: [healthAlerts.userId],
    references: [userProfiles.id],
  }),
  metricType: one(healthMetricTypes, {
    fields: [healthAlerts.metricTypeId],
    references: [healthMetricTypes.id],
  }),
  healthData: one(healthData, {
    fields: [healthAlerts.healthDataId],
    references: [healthData.id],
  }),
}));

// Export types
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type HealthMetricType = typeof healthMetricTypes.$inferSelect;
export type NewHealthMetricType = typeof healthMetricTypes.$inferInsert;
export type HealthData = typeof healthData.$inferSelect;
export type NewHealthData = typeof healthData.$inferInsert;
export type SleepSession = typeof sleepSessions.$inferSelect;
export type NewSleepSession = typeof sleepSessions.$inferInsert;
export type DailyActivity = typeof dailyActivity.$inferSelect;
export type NewDailyActivity = typeof dailyActivity.$inferInsert;
export type HealthGoal = typeof healthGoals.$inferSelect;
export type NewHealthGoal = typeof healthGoals.$inferInsert;
export type HealthAlert = typeof healthAlerts.$inferSelect;
export type NewHealthAlert = typeof healthAlerts.$inferInsert;
