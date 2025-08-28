import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index';
import { 
  userProfiles, 
  devices, 
  healthMetricTypes, 
  healthData, 
  sleepSessions, 
  dailyActivity 
} from '../src/db/schema';

async function testDatabaseInsertions() {
  console.log('🔍 Testing database connection and insertions...');

  try {
    // 1. Verificar conexión a la base de datos
    console.log('\n1. Testing database connection...');
    await db.select().from(healthMetricTypes).limit(1);
    console.log('✅ Database connection successful!');

    // 2. Insertar tipos de métricas de salud (si no existen)
    console.log('\n2. Inserting health metric types...');
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
        name: 'blood_oxygen',
        displayName: 'Blood Oxygen Saturation',
        unit: '%',
        description: 'Blood oxygen saturation percentage',
        minValue: '70',
        maxValue: '100',
      },
      {
        name: 'steps',
        displayName: 'Steps',
        unit: 'steps',
        description: 'Number of steps taken',
        minValue: '0',
        maxValue: '100000',
      },
    ];

    for (const metricType of metricTypes) {
      try {
        const inserted = await db
          .insert(healthMetricTypes)
          .values(metricType)
          .onConflictDoNothing()
          .returning();
        
        if (inserted.length > 0) {
          console.log(`   ✅ Inserted metric type: ${metricType.displayName}`);
        } else {
          console.log(`   ℹ️  Metric type already exists: ${metricType.displayName}`);
        }
      } catch (error) {
        console.log(`   ❌ Error with ${metricType.displayName}:`, error);
      }
    }

    // 3. Crear un usuario de prueba
    console.log('\n3. Creating test user...');
    const testUserId = crypto.randomUUID(); // Generar UUID válido
    
    try {
      const newUser = await db
        .insert(userProfiles)
        .values({
          id: testUserId,
          email: `test${Date.now()}@example.com`,
          firstName: 'Test',
          lastName: 'User',
          timezone: 'America/New_York',
        })
        .returning();
      
      console.log('✅ Test user created:', newUser[0]);

      // 4. Registrar un dispositivo
      console.log('\n4. Registering test device...');
      const newDevice = await db
        .insert(devices)
        .values({
          userId: testUserId,
          deviceName: 'Galaxy Watch Test',
          deviceType: 'wear_os',
          deviceModel: 'SM-R870',
          manufacturer: 'Samsung',
        })
        .returning();
      
      console.log('✅ Test device created:', newDevice[0]);

      // 5. Insertar datos de salud
      console.log('\n5. Inserting health data...');
      
      // Obtener el tipo de métrica heart_rate
      const heartRateType = await db
        .select()
        .from(healthMetricTypes)
        .where(eq(healthMetricTypes.name, 'heart_rate'))
        .limit(1);

      if (heartRateType.length > 0) {
        const healthRecord = await db
          .insert(healthData)
          .values({
            userId: testUserId,
            deviceId: newDevice[0].id,
            metricTypeId: heartRateType[0].id,
            value: '72',
            recordedAt: new Date(),
          })
          .returning();
        
        console.log('✅ Health data inserted:', healthRecord[0]);
      }

      // 6. Insertar sesión de sueño
      console.log('\n6. Inserting sleep session...');
      const now = new Date();
      const sleepStart = new Date(now.getTime() - (8 * 60 * 60 * 1000)); // 8 horas atrás
      
      const sleepSession = await db
        .insert(sleepSessions)
        .values({
          userId: testUserId,
          deviceId: newDevice[0].id,
          sleepStart: sleepStart,
          sleepEnd: now,
          totalDurationMinutes: 480, // 8 horas
          deepSleepMinutes: 120,
          lightSleepMinutes: 300,
          remSleepMinutes: 60,
          sleepQualityScore: 85,
        })
        .returning();
      
      console.log('✅ Sleep session inserted:', sleepSession[0]);

      // 7. Insertar actividad diaria
      console.log('\n7. Inserting daily activity...');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const activity = await db
        .insert(dailyActivity)
        .values({
          userId: testUserId,
          deviceId: newDevice[0].id,
          activityDate: today,
          steps: 8500,
          distanceMeters: '6800',
          caloriesBurned: 320,
          activeMinutes: 45,
          screenTimeMinutes: 240,
        })
        .returning();
      
      console.log('✅ Daily activity inserted:', activity[0]);

      // 8. Verificar datos insertados
      console.log('\n8. Verifying inserted data...');
      
      // Contar registros por usuario
      const userDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.userId, testUserId));
      
      const userHealthData = await db
        .select()
        .from(healthData)
        .where(eq(healthData.userId, testUserId));
      
      const userSleep = await db
        .select()
        .from(sleepSessions)
        .where(eq(sleepSessions.userId, testUserId));
      
      const userActivity = await db
        .select()
        .from(dailyActivity)
        .where(eq(dailyActivity.userId, testUserId));

      console.log('\n📊 Data Summary:');
      console.log(`   👤 User ID: ${testUserId}`);
      console.log(`   📱 Devices: ${userDevices.length}`);
      console.log(`   💓 Health Records: ${userHealthData.length}`);
      console.log(`   😴 Sleep Sessions: ${userSleep.length}`);
      console.log(`   🏃 Activity Records: ${userActivity.length}`);

      console.log('\n🎉 All insertions completed successfully!');

    } catch (userError) {
      console.error('❌ Error creating test data:', userError);
    }

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('\n💡 Make sure to:');
    console.log('   1. Update DATABASE_URL in .env file');
    console.log('   2. Execute the schema SQL in Supabase');
    console.log('   3. Verify your database credentials');
  }
}

// Ejecutar si este archivo se ejecuta directamente
if (require.main === module) {
  testDatabaseInsertions()
    .then(() => {
      console.log('\n✨ Script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { testDatabaseInsertions };
