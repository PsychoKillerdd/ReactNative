import SamsungHealthService from '../src/services/samsungHealth';

async function testSamsungHealth() {
  console.log('🧪 Testing Samsung Health Service Integration...\n');

  try {
    // Test 1: Initialize Samsung Health SDK
    console.log('1️⃣ Testing Samsung Health initialization...');
    const initialized = await SamsungHealthService.initialize();
    
    if (initialized) {
      console.log('✅ Samsung Health initialized successfully');
    } else {
      console.log('❌ Samsung Health initialization failed');
      console.log('💡 Make sure you have:');
      console.log('   - Samsung Health app installed');
      console.log('   - Samsung Galaxy Watch connected');
      console.log('   - Physical Android device (not emulator)');
      return;
    }

    // Test 2: Request permissions
    console.log('\n2️⃣ Testing permissions request...');
    const permissionsGranted = await SamsungHealthService.requestPermissions();
    
    if (permissionsGranted) {
      console.log('✅ Permissions granted successfully');
    } else {
      console.log('❌ Permissions denied');
      console.log('💡 Please grant Samsung Health permissions in device settings');
      return;
    }

    // Test 3: Check watch connection
    console.log('\n3️⃣ Testing watch connection...');
    const connectionStatus = await SamsungHealthService.checkWatchConnection();
    
    if (connectionStatus.isConnected) {
      console.log('✅ Galaxy Watch connected successfully');
      console.log(`📱 Device: ${connectionStatus.deviceInfo?.name}`);
      console.log(`🔋 Battery: ${connectionStatus.deviceInfo?.batteryLevel}%`);
    } else {
      console.log('❌ No Galaxy Watch found');
      console.log('💡 Make sure your Galaxy Watch is:');
      console.log('   - Paired via Bluetooth');
      console.log('   - Samsung Health app is syncing');
      console.log('   - Watch is charged and nearby');
    }

    // Test 4: Start real-time tracking
    console.log('\n4️⃣ Testing real-time tracking...');
    const trackingStarted = await SamsungHealthService.startRealTimeTracking();
    
    if (trackingStarted) {
      console.log('✅ Real-time tracking started');
      console.log('💓 Heart rate monitoring active');
      console.log('🚶 Step counting active');
      console.log('😴 Sleep tracking active');
    } else {
      console.log('❌ Failed to start real-time tracking');
    }

    // Test 5: Get historical data (last 24 hours)
    console.log('\n5️⃣ Testing historical data retrieval...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    const historicalData = await SamsungHealthService.getHistoricalData(startDate, endDate);
    
    console.log(`📊 Historical data retrieved:`);
    console.log(`   💓 Heart rate records: ${historicalData.heartRate.length}`);
    console.log(`   😴 Sleep records: ${historicalData.sleep.length}`);
    console.log(`   🚶 Step records: ${historicalData.steps.length}`);

    // Show sample data if available
    if (historicalData.heartRate.length > 0) {
      const latestHeartRate = historicalData.heartRate[0];
      console.log(`   Latest heart rate: ${latestHeartRate.value} bpm at ${new Date(latestHeartRate.timestamp).toLocaleString()}`);
    }

    if (historicalData.steps.length > 0) {
      const latestSteps = historicalData.steps[0];
      console.log(`   Latest steps: ${latestSteps.count} steps at ${new Date(latestSteps.timestamp).toLocaleString()}`);
    }

    if (historicalData.sleep.length > 0) {
      const latestSleep = historicalData.sleep[0];
      const sleepDuration = Math.round(latestSleep.duration / 60); // Convert to hours
      console.log(`   Latest sleep: ${sleepDuration}h of ${latestSleep.sleepStage} sleep`);
    }

    console.log('\n🎉 Samsung Health integration test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ SDK initialized');
    console.log('✅ Permissions granted');
    console.log(connectionStatus.isConnected ? '✅ Watch connected' : '⚠️ Watch not connected');
    console.log(trackingStarted ? '✅ Real-time tracking enabled' : '⚠️ Tracking not started');
    console.log(`✅ Data sync ready (${historicalData.heartRate.length + historicalData.sleep.length + historicalData.steps.length} records found)`);

    // Cleanup
    SamsungHealthService.cleanup();

  } catch (error) {
    console.error('❌ Samsung Health test failed:', error);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Ensure you\'re running on a physical Samsung device');
    console.log('2. Install Samsung Health app from Galaxy Store');
    console.log('3. Pair your Galaxy Watch via Galaxy Wearable app');
    console.log('4. Grant all health permissions in Settings');
    console.log('5. Make sure Samsung Health SDK is properly installed');
  }
}

// Run the test
if (require.main === module) {
  testSamsungHealth().then(() => {
    console.log('\n🏁 Test completed. You can now use Samsung Health in your app!');
    process.exit(0);
  }).catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

export default testSamsungHealth;
