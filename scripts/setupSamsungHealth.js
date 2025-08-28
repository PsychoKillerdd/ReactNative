#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Setting up Samsung Health SDK for React Native...');

// 1. Install necessary packages
console.log('📦 Installing Samsung Health dependencies...');

const packagesToInstall = [
  'react-native-samsung-health',
  'react-native-health-connect',
  'react-native-wear-connectivity',
  'react-native-device-info',
];

try {
  execSync(`npm install ${packagesToInstall.join(' ')}`, { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// 2. Create Android configuration files
console.log('📱 Setting up Android configuration...');

const androidManifestPath = path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
const buildGradlePath = path.join(process.cwd(), 'android/app/build.gradle');

// Add Samsung Health permissions to AndroidManifest.xml
if (fs.existsSync(androidManifestPath)) {
  let manifest = fs.readFileSync(androidManifestPath, 'utf8');
  
  const samsungHealthPermissions = `
    <!-- Samsung Health Permissions -->
    <uses-permission android:name="com.samsung.android.providers.health.permission.READ" />
    <uses-permission android:name="com.samsung.android.providers.health.permission.WRITE" />
    <uses-permission android:name="android.permission.BODY_SENSORS" />
    
    <!-- Meta-data for Samsung Health -->
    <meta-data
        android:name="com.samsung.android.health.permission-group.SENSOR"
        android:value="sensor" />
    <meta-data
        android:name="com.samsung.android.health.permission-group.FITNESS"
        android:value="fitness" />`;

  if (!manifest.includes('samsung.android.providers.health')) {
    manifest = manifest.replace('<uses-permission android:name="android.permission.INTERNET" />', 
      '<uses-permission android:name="android.permission.INTERNET" />' + samsungHealthPermissions);
    
    fs.writeFileSync(androidManifestPath, manifest);
    console.log('✅ Android permissions added');
  } else {
    console.log('⚠️ Samsung Health permissions already exist');
  }
}

// Add Samsung Health dependencies to build.gradle
if (fs.existsSync(buildGradlePath)) {
  let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  
  const samsungHealthDeps = `
    implementation 'com.samsung.android.sdk:healthdata:1.5.0'
    implementation 'com.samsung.android.sdk:health-data:6.3.0'`;

  if (!buildGradle.includes('samsung.android.sdk:healthdata')) {
    buildGradle = buildGradle.replace(
      'dependencies {',
      'dependencies {' + samsungHealthDeps
    );
    
    fs.writeFileSync(buildGradlePath, buildGradle);
    console.log('✅ Android dependencies added');
  } else {
    console.log('⚠️ Samsung Health dependencies already exist');
  }
}

// 3. Create native bridge module template
console.log('🌉 Creating native bridge module...');

const javaModulePath = path.join(
  process.cwd(), 
  'android/app/src/main/java/com/reactnativehealthtracker/SamsungHealthModule.java'
);

const javaModuleContent = `
package com.reactnativehealthtracker;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.samsung.android.sdk.healthdata.*;
import java.util.*;

public class SamsungHealthModule extends ReactContextBaseJavaModule {
    private ReactApplicationContext reactContext;
    private HealthDataStore mStore;

    public SamsungHealthModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SamsungHealth";
    }

    @ReactMethod
    public void initialize(Promise promise) {
        // Implementation will be added here
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", true);
        result.putString("message", "Samsung Health module created successfully");
        promise.resolve(result);
    }

    @ReactMethod
    public void requestPermissions(ReadableArray permissions, Promise promise) {
        // Implementation will be added here
        WritableMap result = Arguments.createMap();
        result.putBoolean("success", true);
        promise.resolve(result);
    }
}
`;

try {
  const javaDir = path.dirname(javaModulePath);
  if (!fs.existsSync(javaDir)) {
    fs.mkdirSync(javaDir, { recursive: true });
  }
  
  if (!fs.existsSync(javaModulePath)) {
    fs.writeFileSync(javaModulePath, javaModuleContent);
    console.log('✅ Native bridge module created');
  } else {
    console.log('⚠️ Native bridge module already exists');
  }
} catch (error) {
  console.log('⚠️ Could not create native bridge module:', error.message);
}

// 4. Instructions for developer
console.log(`
🎉 Samsung Health SDK setup completed!

📋 Next Steps:
1. Download Samsung Health SDK from Samsung Developers:
   https://developer.samsung.com/health/android

2. Add the Samsung Health SDK to your Android project:
   - Copy the SDK JAR files to android/app/libs/
   - Update build.gradle dependencies

3. Test the integration:
   npm run samsung-health:test

4. Build and run on Android device:
   npx react-native run-android --device

📱 Requirements:
✅ Samsung Galaxy Watch (connected via Bluetooth)
✅ Samsung Health app installed
✅ Android device with Samsung Health permissions
✅ Physical device (Samsung Health doesn't work on emulators)

🔧 Troubleshooting:
- If build fails, check that Samsung Health SDK is properly installed
- Ensure your device has Samsung Health app installed and updated
- Check that Bluetooth is enabled and watch is paired

For detailed setup guide, see: SAMSUNG_HEALTH_SETUP.md
`);

console.log('✅ Samsung Health setup script completed!');
