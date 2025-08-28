const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { DrizzleService } = require('../services/drizzle');
const { validateAuth } = require('../middleware/auth');

// Validation schemas
const heartRateSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  deviceId: Joi.string().uuid().required(),
  value: Joi.number().min(30).max(250).required(),
  timestamp: Joi.date().iso().required(),
  accuracy: Joi.number().min(0).max(100).default(100),
  metadata: Joi.object().default({})
});

const sleepDataSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  deviceId: Joi.string().uuid().required(),
  sleepStart: Joi.date().iso().required(),
  sleepEnd: Joi.date().iso().required(),
  stages: Joi.object({
    deep: Joi.number().min(0).default(0),
    light: Joi.number().min(0).default(0),
    rem: Joi.number().min(0).default(0),
    awake: Joi.number().min(0).default(0)
  }).required(),
  qualityScore: Joi.number().min(0).max(100).default(75),
  heartRateVariability: Joi.number().min(0).optional(),
  restlessness: Joi.number().min(0).max(100).optional(),
  snoreData: Joi.object().optional(),
  metadata: Joi.object().default({})
});

const stepsDataSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  deviceId: Joi.string().uuid().required(),
  date: Joi.date().iso().required(),
  steps: Joi.number().min(0).required(),
  distance: Joi.number().min(0).default(0),
  calories: Joi.number().min(0).default(0),
  activeMinutes: Joi.number().min(0).default(0),
  floorsClimbed: Joi.number().min(0).default(0),
  metadata: Joi.object().default({})
});

const batchDataSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  deviceId: Joi.string().uuid().required(),
  dataType: Joi.string().valid('heartRate', 'sleep', 'steps', 'mixed').required(),
  data: Joi.array().min(1).max(1000).required(),
  syncTimestamp: Joi.date().iso().default(() => new Date())
});

// 📊 POST /api/samsung/sync-heart-rate - Sync heart rate data
router.post('/sync-heart-rate', validateAuth, async (req, res) => {
  try {
    const { error, value } = heartRateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Get heart rate metric type
    const heartRateMetric = await DrizzleService.getHealthMetricTypeByName('heart_rate');
    if (!heartRateMetric) {
      return res.status(500).json({ error: 'Heart rate metric type not found' });
    }

    // Save to database
    const healthData = await DrizzleService.insertHealthData({
      userId: value.userId,
      deviceId: value.deviceId,
      metricTypeId: heartRateMetric.id,
      value: value.value.toString(),
      recordedAt: new Date(value.timestamp),
      metadata: JSON.stringify({
        ...value.metadata,
        source: 'samsung_health',
        accuracy: value.accuracy,
        syncedAt: new Date().toISOString()
      })
    });

    console.log(`💓 Heart rate data saved: ${value.value} bpm for user ${value.userId}`);

    res.status(201).json({
      success: true,
      message: 'Heart rate data saved successfully',
      data: {
        id: healthData.id,
        value: value.value,
        timestamp: value.timestamp
      }
    });

  } catch (error) {
    console.error('Error saving heart rate data:', error);
    res.status(500).json({ 
      error: 'Failed to save heart rate data',
      message: error.message 
    });
  }
});

// 😴 POST /api/samsung/sync-sleep - Sync sleep data
router.post('/sync-sleep', validateAuth, async (req, res) => {
  try {
    const { error, value } = sleepDataSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    // Calculate total duration
    const startTime = new Date(value.sleepStart);
    const endTime = new Date(value.sleepEnd);
    const totalDurationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Save to database
    const sleepData = await DrizzleService.insertSleepSession(
      value.userId,
      value.deviceId,
      {
        sleepStart: value.sleepStart,
        sleepEnd: value.sleepEnd,
        qualityScore: value.qualityScore,
        deepSleepMinutes: value.stages.deep,
        lightSleepMinutes: value.stages.light,
        remSleepMinutes: value.stages.rem,
        awakeDurationMinutes: value.stages.awake
      }
    );

    console.log(`😴 Sleep session saved: ${totalDurationMinutes}min for user ${value.userId}`);

    res.status(201).json({
      success: true,
      message: 'Sleep data saved successfully',
      data: {
        id: sleepData.id,
        duration: totalDurationMinutes,
        quality: value.qualityScore,
        sleepStart: value.sleepStart,
        sleepEnd: value.sleepEnd
      }
    });

  } catch (error) {
    console.error('Error saving sleep data:', error);
    res.status(500).json({ 
      error: 'Failed to save sleep data',
      message: error.message 
    });
  }
});

// 🚶 POST /api/samsung/sync-steps - Sync steps/activity data
router.post('/sync-steps', validateAuth, async (req, res) => {
  try {
    const { error, value } = stepsDataSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const dateString = value.date.toISOString().split('T')[0];

    // Save to database
    const activityData = await DrizzleService.insertDailyActivity(
      value.userId,
      value.deviceId,
      dateString,
      {
        steps: value.steps,
        distanceMeters: value.distance,
        caloriesBurned: value.calories,
        activeMinutes: value.activeMinutes,
        floorsClimbed: value.floorsClimbed
      }
    );

    console.log(`🚶 Activity data saved: ${value.steps} steps for user ${value.userId}`);

    res.status(201).json({
      success: true,
      message: 'Activity data saved successfully',
      data: {
        id: activityData.id,
        steps: value.steps,
        distance: value.distance,
        calories: value.calories,
        date: dateString
      }
    });

  } catch (error) {
    console.error('Error saving activity data:', error);
    res.status(500).json({ 
      error: 'Failed to save activity data',
      message: error.message 
    });
  }
});

// 🔄 POST /api/samsung/batch-sync - Batch sync multiple data points
router.post('/batch-sync', validateAuth, async (req, res) => {
  try {
    const { error, value } = batchDataSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details 
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    console.log(`🔄 Starting batch sync: ${value.data.length} items for user ${value.userId}`);

    for (const item of value.data) {
      try {
        switch (value.dataType) {
          case 'heartRate':
            const heartRateValidation = heartRateSchema.validate({
              userId: value.userId,
              deviceId: value.deviceId,
              ...item
            });
            
            if (heartRateValidation.error) {
              results.failed++;
              results.errors.push(`Heart rate validation: ${heartRateValidation.error.message}`);
              continue;
            }

            const heartRateMetric = await DrizzleService.getHealthMetricTypeByName('heart_rate');
            await DrizzleService.insertHealthData({
              userId: value.userId,
              deviceId: value.deviceId,
              metricTypeId: heartRateMetric.id,
              value: item.value.toString(),
              recordedAt: new Date(item.timestamp),
              metadata: JSON.stringify({
                source: 'samsung_health_batch',
                accuracy: item.accuracy || 100,
                batchSyncAt: value.syncTimestamp
              })
            });
            break;

          case 'steps':
            const stepsValidation = stepsDataSchema.validate({
              userId: value.userId,
              deviceId: value.deviceId,
              ...item
            });
            
            if (stepsValidation.error) {
              results.failed++;
              results.errors.push(`Steps validation: ${stepsValidation.error.message}`);
              continue;
            }

            const dateString = new Date(item.date).toISOString().split('T')[0];
            await DrizzleService.insertDailyActivity(
              value.userId,
              value.deviceId,
              dateString,
              {
                steps: item.steps,
                distanceMeters: item.distance || 0,
                caloriesBurned: item.calories || 0,
                activeMinutes: item.activeMinutes || 0,
                floorsClimbed: item.floorsClimbed || 0
              }
            );
            break;

          case 'sleep':
            const sleepValidation = sleepDataSchema.validate({
              userId: value.userId,
              deviceId: value.deviceId,
              ...item
            });
            
            if (sleepValidation.error) {
              results.failed++;
              results.errors.push(`Sleep validation: ${sleepValidation.error.message}`);
              continue;
            }

            await DrizzleService.insertSleepSession(
              value.userId,
              value.deviceId,
              {
                sleepStart: item.sleepStart,
                sleepEnd: item.sleepEnd,
                qualityScore: item.qualityScore || 75,
                deepSleepMinutes: item.stages?.deep || 0,
                lightSleepMinutes: item.stages?.light || 0,
                remSleepMinutes: item.stages?.rem || 0,
                awakeDurationMinutes: item.stages?.awake || 0
              }
            );
            break;

          default:
            results.failed++;
            results.errors.push(`Unknown data type: ${value.dataType}`);
            continue;
        }

        results.success++;

      } catch (itemError) {
        results.failed++;
        results.errors.push(`Item processing error: ${itemError.message}`);
      }
    }

    console.log(`✅ Batch sync completed: ${results.success} success, ${results.failed} failed`);

    res.status(results.failed === 0 ? 200 : 207).json({
      success: true,
      message: 'Batch sync completed',
      results: results,
      summary: {
        totalItems: value.data.length,
        successCount: results.success,
        failedCount: results.failed,
        successRate: ((results.success / value.data.length) * 100).toFixed(2) + '%'
      }
    });

  } catch (error) {
    console.error('Error in batch sync:', error);
    res.status(500).json({ 
      error: 'Batch sync failed',
      message: error.message 
    });
  }
});

// 📈 GET /api/samsung/device-status/:deviceId - Get device sync status
router.get('/device-status/:deviceId', validateAuth, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { userId } = req.user;

    // Get device info
    const device = await DrizzleService.getDeviceById(deviceId);
    if (!device || device.userId !== userId) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Get last sync times for different data types
    const lastHeartRateSync = await DrizzleService.getLastHealthDataTimestamp(userId, deviceId, 'heart_rate');
    const lastSleepSync = await DrizzleService.getLastSleepSessionTimestamp(userId, deviceId);
    const lastActivitySync = await DrizzleService.getLastActivityTimestamp(userId, deviceId);

    // Calculate data counts for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentDataCounts = await DrizzleService.getDataCountsSince(userId, deviceId, sevenDaysAgo);

    res.json({
      success: true,
      device: {
        id: device.id,
        name: device.deviceName,
        type: device.deviceType,
        lastSeen: device.lastSeenAt
      },
      syncStatus: {
        heartRate: {
          lastSync: lastHeartRateSync,
          recentCount: recentDataCounts.heartRate
        },
        sleep: {
          lastSync: lastSleepSync,
          recentCount: recentDataCounts.sleep
        },
        activity: {
          lastSync: lastActivitySync,
          recentCount: recentDataCounts.activity
        }
      },
      summary: {
        totalRecentRecords: recentDataCounts.total,
        isActive: recentDataCounts.total > 0,
        dataCompleteness: calculateDataCompleteness(recentDataCounts)
      }
    });

  } catch (error) {
    console.error('Error getting device status:', error);
    res.status(500).json({ 
      error: 'Failed to get device status',
      message: error.message 
    });
  }
});

// Helper function to calculate data completeness score
function calculateDataCompleteness(counts) {
  const expectedDaily = {
    heartRate: 1440, // Every minute
    sleep: 1,        // One session per day
    activity: 1      // One record per day
  };

  const days = 7;
  const scores = {
    heartRate: Math.min(100, (counts.heartRate / (expectedDaily.heartRate * days)) * 100),
    sleep: Math.min(100, (counts.sleep / (expectedDaily.sleep * days)) * 100),
    activity: Math.min(100, (counts.activity / (expectedDaily.activity * days)) * 100)
  };

  const overallScore = (scores.heartRate + scores.sleep + scores.activity) / 3;
  return {
    overall: Math.round(overallScore),
    heartRate: Math.round(scores.heartRate),
    sleep: Math.round(scores.sleep),
    activity: Math.round(scores.activity)
  };
}

module.exports = router;
