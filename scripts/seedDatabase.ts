import 'dotenv/config';
import { db } from '../src/db/index';
import { healthMetricTypes } from '../src/db/schema';

async function seedHealthMetricTypes() {
  console.log('🌱 Seeding health metric types...');

  const metricTypes = [
    {
      name: 'heart_rate',
      displayName: 'Heart Rate',
      unit: 'bpm',
      description: 'Heart rate measurement in beats per minute',
      minValue: '30',
      maxValue: '220',
    },
    {
      name: 'blood_pressure_systolic',
      displayName: 'Systolic Blood Pressure',
      unit: 'mmHg',
      description: 'Systolic blood pressure measurement',
      minValue: '70',
      maxValue: '200',
    },
    {
      name: 'blood_pressure_diastolic',
      displayName: 'Diastolic Blood Pressure',
      unit: 'mmHg',
      description: 'Diastolic blood pressure measurement',
      minValue: '40',
      maxValue: '120',
    },
    {
      name: 'blood_oxygen',
      displayName: 'Blood Oxygen Saturation',
      unit: '%',
      description: 'Blood oxygen saturation percentage',
      minValue: '70',
      maxValue: '100',
    },
    {
      name: 'body_temperature',
      displayName: 'Body Temperature',
      unit: '°C',
      description: 'Body temperature in Celsius',
      minValue: '35',
      maxValue: '42',
    },
    {
      name: 'respiratory_rate',
      displayName: 'Respiratory Rate',
      unit: 'breaths/min',
      description: 'Respiratory rate in breaths per minute',
      minValue: '8',
      maxValue: '40',
    },
    {
      name: 'stress_level',
      displayName: 'Stress Level',
      unit: 'level',
      description: 'Stress level measurement (0-100)',
      minValue: '0',
      maxValue: '100',
    },
  ];

  try {
    for (const metricType of metricTypes) {
      await db
        .insert(healthMetricTypes)
        .values(metricType)
        .onConflictDoNothing();
    }

    console.log('✅ Health metric types seeded successfully!');
    console.log(`📊 Inserted ${metricTypes.length} metric types:`);
    metricTypes.forEach(metric => {
      console.log(`   • ${metric.displayName} (${metric.unit})`);
    });
  } catch (error) {
    console.error('❌ Error seeding health metric types:', error);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedHealthMetricTypes()
    .then(() => {
      console.log('🎉 Seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

export { seedHealthMetricTypes };
