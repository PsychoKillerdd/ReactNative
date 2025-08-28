import 'dotenv/config';

async function checkConfiguration() {
  console.log('🔍 Checking configuration...\n');

  // 1. Verificar variables de entorno
  console.log('1. Environment Variables:');
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}\n`);

  // 2. Verificar formato de DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    console.log('2. DATABASE_URL Analysis:');
    
    if (dbUrl.includes('[YOUR-PASSWORD]')) {
      console.log('   ❌ Password placeholder not replaced');
      console.log('   💡 Replace [YOUR-PASSWORD] with your actual Supabase password');
    } else {
      console.log('   ✅ Password placeholder replaced');
    }
    
    if (dbUrl.includes('nnnjiepnpsedqjyokfmq')) {
      console.log('   ✅ Project ID found');
    } else {
      console.log('   ❌ Project ID not found or incorrect');
    }
    
    if (dbUrl.includes('6543')) {
      console.log('   ✅ Using connection pooler port');
    } else if (dbUrl.includes('5432')) {
      console.log('   ⚠️  Using direct connection port (might work but pooler is recommended)');
    }
    
    console.log(`   🔗 URL format: ${dbUrl.substring(0, 50)}...`);
  }

  console.log('\n3. Next Steps:');
  console.log('   📝 To get your Supabase password:');
  console.log('      1. Go to https://supabase.com/dashboard');
  console.log('      2. Select your project');
  console.log('      3. Go to Settings > Database');
  console.log('      4. Find "Connection string" section');
  console.log('      5. Copy the password from there');
  console.log('');
  console.log('   🗃️ To set up your database schema:');
  console.log('      1. Go to your Supabase project dashboard');
  console.log('      2. Open SQL Editor');
  console.log('      3. Execute the contents of database/schema.sql');
  console.log('      4. Execute the contents of database/functions.sql');
  console.log('');
  console.log('   🧪 Once configured, test with:');
  console.log('      npm run db:test');
}

checkConfiguration();
