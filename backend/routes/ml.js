const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { DrizzleService } = require('../services/drizzle');
const { MLService } = require('../services/ml');
const { validateAuth } = require('../middleware/auth');

// 🤖 POST /api/ml/prepare-dataset - Prepare dataset for ML training
router.post('/prepare-dataset', validateAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      userId: Joi.string().uuid().optional(),
      dateRange: Joi.object({
        start: Joi.date().iso().required(),
        end: Joi.date().iso().required()
      }).required(),
      includeFeatures: Joi.array().items(
        Joi.string().valid(
          'heartRate', 'sleep', 'activity', 'demographics', 
          'environmental', 'behavioral', 'temporal'
        )
      ).default(['heartRate', 'sleep', 'activity']),
      aggregationLevel: Joi.string().valid('hourly', 'daily', 'weekly').default('daily'),
      format: Joi.string().valid('json', 'csv', 'parquet').default('json')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation failed', details: error.details });
    }

    console.log(`🤖 Preparing ML dataset for user ${value.userId || 'all users'}`);

    // Generate ML-ready dataset
    const dataset = await MLService.prepareDataset({
      userId: value.userId || req.user.userId,
      dateRange: value.dateRange,
      features: value.includeFeatures,
      aggregation: value.aggregationLevel,
      format: value.format
    });

    res.json({
      success: true,
      message: 'Dataset prepared successfully',
      dataset: dataset,
      metadata: {
        recordCount: dataset.length,
        features: Object.keys(dataset[0] || {}),
        dateRange: value.dateRange,
        aggregation: value.aggregationLevel,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error preparing ML dataset:', error);
    res.status(500).json({ 
      error: 'Failed to prepare dataset',
      message: error.message 
    });
  }
});

// 📊 GET /api/ml/health-insights/:userId - Get ML-powered health insights
router.get('/health-insights/:userId', validateAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days) || 30;

    // Generate health insights using ML
    const insights = await MLService.generateHealthInsights(userId, days);

    res.json({
      success: true,
      insights: insights,
      generatedAt: new Date().toISOString(),
      analysisPeriod: `${days} days`
    });

  } catch (error) {
    console.error('Error generating health insights:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      message: error.message 
    });
  }
});

// 🎯 POST /api/ml/predict-health-risk - Predict health risks
router.post('/predict-health-risk', validateAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      riskTypes: Joi.array().items(
        Joi.string().valid('cardiovascular', 'diabetes', 'sleep_disorder', 'stress', 'burnout')
      ).default(['cardiovascular', 'stress']),
      timeHorizon: Joi.string().valid('1_week', '1_month', '3_months', '6_months').default('1_month')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation failed', details: error.details });
    }

    // Generate risk predictions
    const predictions = await MLService.predictHealthRisks({
      userId: value.userId,
      riskTypes: value.riskTypes,
      timeHorizon: value.timeHorizon
    });

    res.json({
      success: true,
      predictions: predictions,
      disclaimer: 'These predictions are for informational purposes only and should not replace professional medical advice.',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error predicting health risks:', error);
    res.status(500).json({ 
      error: 'Failed to predict health risks',
      message: error.message 
    });
  }
});

// 📈 GET /api/ml/health-trends/:userId - Analyze health trends
router.get('/health-trends/:userId', validateAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const period = req.query.period || '3_months';
    const metrics = req.query.metrics ? req.query.metrics.split(',') : ['all'];

    const trends = await MLService.analyzeHealthTrends({
      userId,
      period,
      metrics
    });

    res.json({
      success: true,
      trends: trends,
      analysisDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing health trends:', error);
    res.status(500).json({ 
      error: 'Failed to analyze trends',
      message: error.message 
    });
  }
});

// 🏃‍♀️ POST /api/ml/recommend-activities - Get personalized activity recommendations
router.post('/recommend-activities', validateAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      userId: Joi.string().uuid().required(),
      currentGoals: Joi.array().items(
        Joi.string().valid('weight_loss', 'fitness', 'sleep_improvement', 'stress_reduction', 'general_health')
      ).required(),
      preferences: Joi.object({
        activityTypes: Joi.array().items(Joi.string()).default([]),
        timeOfDay: Joi.string().valid('morning', 'afternoon', 'evening', 'flexible').default('flexible'),
        duration: Joi.string().valid('short', 'medium', 'long', 'flexible').default('flexible'),
        intensity: Joi.string().valid('low', 'medium', 'high', 'flexible').default('flexible')
      }).default({})
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation failed', details: error.details });
    }

    const recommendations = await MLService.generateActivityRecommendations({
      userId: value.userId,
      goals: value.currentGoals,
      preferences: value.preferences
    });

    res.json({
      success: true,
      recommendations: recommendations,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating activity recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      message: error.message 
    });
  }
});

// 🔍 GET /api/ml/anomaly-detection/:userId - Detect health data anomalies
router.get('/anomaly-detection/:userId', validateAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const sensitivity = parseFloat(req.query.sensitivity) || 0.95;
    const days = parseInt(req.query.days) || 30;

    const anomalies = await MLService.detectAnomalies({
      userId,
      sensitivity,
      days
    });

    res.json({
      success: true,
      anomalies: anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        severityDistribution: anomalies.reduce((acc, item) => {
          acc[item.severity] = (acc[item.severity] || 0) + 1;
          return acc;
        }, {}),
        analysisDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ 
      error: 'Failed to detect anomalies',
      message: error.message 
    });
  }
});

// 📊 POST /api/ml/export-training-data - Export data for external ML training
router.post('/export-training-data', validateAuth, async (req, res) => {
  try {
    const schema = Joi.object({
      exportType: Joi.string().valid('tensorflow', 'pytorch', 'sklearn', 'raw').default('raw'),
      dataTypes: Joi.array().items(
        Joi.string().valid('heartRate', 'sleep', 'activity', 'combined')
      ).required(),
      dateRange: Joi.object({
        start: Joi.date().iso().required(),
        end: Joi.date().iso().required()
      }).required(),
      preprocessing: Joi.object({
        normalize: Joi.boolean().default(false),
        fillMissing: Joi.boolean().default(true),
        removeOutliers: Joi.boolean().default(false),
        featureEngineering: Joi.boolean().default(false)
      }).default({}),
      format: Joi.string().valid('json', 'csv', 'hdf5', 'npy').default('json')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation failed', details: error.details });
    }

    console.log(`📊 Exporting training data: ${value.dataTypes.join(', ')}`);

    const exportedData = await MLService.exportTrainingData(value);

    res.json({
      success: true,
      message: 'Training data exported successfully',
      export: exportedData,
      metadata: {
        recordCount: exportedData.recordCount,
        features: exportedData.features,
        exportedAt: new Date().toISOString(),
        format: value.format,
        preprocessing: value.preprocessing
      }
    });

  } catch (error) {
    console.error('Error exporting training data:', error);
    res.status(500).json({ 
      error: 'Failed to export training data',
      message: error.message 
    });
  }
});

module.exports = router;
