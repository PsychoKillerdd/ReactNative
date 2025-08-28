import 'dotenv/config';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL!;

async function applySchemaDirectly() {
  console.log('🔧 Attempting to apply schema directly...');
  
  // Usar el cliente postgres directamente para ejecutar SQL crudo
  const sql = postgres(DATABASE_URL, {
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  try {
    console.log('\n1. Testing basic connection...');
    await sql`SELECT 1 as test`;
    console.log('✅ Basic connection successful!');

    console.log('\n2. Creating basic tables...');
    
    // Crear las extensiones necesarias
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    console.log('✅ UUID extension created');

    // Crear enum types
    await sql`
      DO $$ BEGIN
        CREATE TYPE device_type AS ENUM ('wear_os', 'android_phone', 'iphone', 'fitness_tracker');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Device type enum created');

    await sql`
      DO $$ BEGIN
        CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log('✅ Alert enums created');

    // Crear tabla user_profiles
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        date_of_birth TIMESTAMP,
        timezone VARCHAR(50) DEFAULT 'UTC',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ User profiles table created');

    // Crear tabla devices
    await sql`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        device_name VARCHAR(255) NOT NULL,
        device_type device_type NOT NULL,
        device_model VARCHAR(255),
        manufacturer VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Devices table created');

    // Crear tabla health_metric_types
    await sql`
      CREATE TABLE IF NOT EXISTS health_metric_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        description TEXT,
        min_value DECIMAL,
        max_value DECIMAL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Health metric types table created');

    // Crear tabla health_data
    await sql`
      CREATE TABLE IF NOT EXISTS health_data (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        metric_type_id UUID NOT NULL REFERENCES health_metric_types(id) ON DELETE RESTRICT,
        value DECIMAL NOT NULL,
        recorded_at TIMESTAMP NOT NULL,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Health data table created');

    // Crear tabla sleep_sessions
    await sql`
      CREATE TABLE IF NOT EXISTS sleep_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        sleep_start TIMESTAMP NOT NULL,
        sleep_end TIMESTAMP NOT NULL,
        total_duration_minutes INTEGER NOT NULL,
        deep_sleep_minutes INTEGER,
        light_sleep_minutes INTEGER,
        rem_sleep_minutes INTEGER,
        awake_duration_minutes INTEGER,
        sleep_quality_score INTEGER,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Sleep sessions table created');

    // Crear tabla daily_activity
    await sql`
      CREATE TABLE IF NOT EXISTS daily_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        activity_date TIMESTAMP NOT NULL,
        steps INTEGER,
        distance_meters DECIMAL,
        calories_burned INTEGER,
        active_minutes INTEGER,
        screen_time_minutes INTEGER,
        floors_climbed INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Daily activity table created');

    // Crear índices importantes
    await sql`CREATE INDEX IF NOT EXISTS idx_health_data_user_id ON health_data(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sleep_sessions_user_id ON sleep_sessions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_activity_user_id ON daily_activity(user_id)`;
    console.log('✅ Indexes created');

    console.log('\n🎉 Schema applied successfully!');
    console.log('Now you can run: npm run db:test');

    await sql.end();

  } catch (error: any) {
    console.error('❌ Error applying schema:', error);
    
    if (error.message && error.message.includes('SASL')) {
      console.log('\n💡 SASL error detected. This usually means:');
      console.log('   1. Wrong password');
      console.log('   2. Wrong username');
      console.log('   3. Connection string format issue');
      console.log('\n🔍 Current DATABASE_URL format:');
      console.log('   ', DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
    }
    
    await sql.end();
  }
}

applySchemaDirectly();
