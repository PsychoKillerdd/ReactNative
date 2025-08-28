# Samsung Health SDK Setup for React Native

## 🔧 **Pasos para Integrar Samsung Health SDK:**

### **1. Descargar Samsung Health SDK**
```bash
# Descarga el Samsung Health SDK desde Samsung Developers
# https://developer.samsung.com/health/android
# Requiere registro como desarrollador Samsung (gratis)
```

### **2. Configuración de Android**

#### **android/settings.gradle**
```gradle
include ':samsung-health'
project(':samsung-health').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-samsung-health/android')
```

#### **android/app/build.gradle**
```gradle
dependencies {
    implementation project(':samsung-health')
    implementation 'com.samsung.android.sdk:healthdata:1.5.0'
    implementation 'com.samsung.android.sdk:health-data:6.3.0'
    // Otras dependencias...
}
```

### **3. Permisos Necesarios**

#### **android/app/src/main/AndroidManifest.xml**
```xml
<uses-permission android:name="com.samsung.android.providers.health.permission.READ" />
<uses-permission android:name="com.samsung.android.providers.health.permission.WRITE" />

<!-- Meta-data para Samsung Health -->
<meta-data
    android:name="com.samsung.android.health.permission-group.SENSOR"
    android:value="@string/health_permission_sensor" />
<meta-data
    android:name="com.samsung.android.health.permission-group.FITNESS"
    android:value="@string/health_permission_fitness" />
```

### **4. Configuración Native Bridge**

#### **Crear: android/app/src/main/java/.../SamsungHealthModule.java**
```java
package com.reactnativehealthtracker;

import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.samsung.android.sdk.healthdata.*;

public class SamsungHealthModule extends ReactContextBaseJavaModule {
    private ReactApplicationContext reactContext;
    private HealthDataStore mStore;
    private HealthConnectionErrorListener mConnectionListener;

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
        try {
            // Inicializar Samsung Health SDK
            HealthDataService healthDataService = new HealthDataService();
            
            healthDataService.initialize(reactContext.getCurrentActivity());
            mStore = new HealthDataStore(reactContext, mConnectionListener);
            mStore.connectService();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void requestPermissions(ReadableArray permissions, Promise promise) {
        try {
            Set<PermissionKey> pmsPermissions = new HashSet<>();
            pmsPermissions.add(new PermissionKey(HealthConstants.HeartRate.HEALTH_DATA_TYPE, PermissionKey.PERMISSION_READ));
            pmsPermissions.add(new PermissionKey(HealthConstants.Sleep.HEALTH_DATA_TYPE, PermissionKey.PERMISSION_READ));
            pmsPermissions.add(new PermissionKey(HealthConstants.StepCount.HEALTH_DATA_TYPE, PermissionKey.PERMISSION_READ));

            mStore.requestPermissions(pmsPermissions, new HealthDataStore.PermissionListener() {
                @Override
                public void onPermissionAcquired(Set<PermissionKey> permissionKeys) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    promise.resolve(result);
                }

                @Override
                public void onPermissionFailed(Set<PermissionKey> permissionKeys) {
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", false);
                    result.putString("error", "Permissions denied");
                    promise.resolve(result);
                }
            });
        } catch (Exception e) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", false);
            result.putString("error", e.getMessage());
            promise.resolve(result);
        }
    }

    @ReactMethod
    public void getHeartRateData(double startTime, double endTime, Promise promise) {
        try {
            HealthDataResolver resolver = new HealthDataResolver(mStore, null);

            Filter filter = Filter.and(
                Filter.greaterThanEquals(HealthConstants.HeartRate.START_TIME, (long)startTime),
                Filter.lessThanEquals(HealthConstants.HeartRate.END_TIME, (long)endTime)
            );

            HealthDataResolver.ReadRequest request = new HealthDataResolver.ReadRequest.Builder()
                .setDataType(HealthConstants.HeartRate.HEALTH_DATA_TYPE)
                .setFilter(filter)
                .build();

            resolver.read(request).setResultListener(result -> {
                WritableArray heartRateArray = Arguments.createArray();
                
                try {
                    Iterator<HealthData> iterator = result.iterator();
                    while (iterator.hasNext()) {
                        HealthData data = iterator.next();
                        WritableMap heartRateData = Arguments.createMap();
                        
                        heartRateData.putInt("heartRate", data.getInt(HealthConstants.HeartRate.HEART_RATE));
                        heartRateData.putDouble("timestamp", data.getLong(HealthConstants.HeartRate.START_TIME));
                        
                        heartRateArray.pushMap(heartRateData);
                    }
                    promise.resolve(heartRateArray);
                } finally {
                    result.close();
                }
            });
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}
```

### **5. Registrar el Módulo**

#### **MainApplication.java**
```java
@Override
protected List<ReactPackage> getPackages() {
    @SuppressWarnings("UnnecessaryLocalVariable")
    List<ReactPackage> packages = new PackageList(this).getPackages();
    // Agregar Samsung Health Module
    packages.add(new SamsungHealthPackage());
    return packages;
}
```

## 🚀 **Instalación Rápida (Alternativa con react-native-samsung-health)**

```bash
# Instalar dependencia existente de la comunidad
npm install react-native-samsung-health

# Para React Native 0.60+ auto-linking debería funcionar
# Para versiones anteriores:
react-native link react-native-samsung-health
```

## 📱 **Configuración de Permisos en Tiempo de Ejecución**

```typescript
// En tu App.tsx o componente principal
import SamsungHealth from 'react-native-samsung-health';

const permissions = [
  SamsungHealth.Permissions.STEP_COUNT,
  SamsungHealth.Permissions.HEART_RATE,
  SamsungHealth.Permissions.SLEEP_ANALYSIS,
];

SamsungHealth.initializeHealthData()
  .then(() => {
    return SamsungHealth.requestPermissions(permissions);
  })
  .then((result) => {
    console.log('✅ Samsung Health permissions granted');
  })
  .catch((error) => {
    console.log('❌ Samsung Health setup error:', error);
  });
```

## 🔄 **Integración con la App**

La integración ya está lista en `src/services/samsungHealth.ts`. Solo necesitas:

1. **Instalar el SDK de Samsung Health**
2. **Configurar los permisos de Android**
3. **Compilar la aplicación en dispositivo real**

```bash
# Compilar y ejecutar en dispositivo Android
bunx react-native run-android --device
```

## 📋 **Requisitos del Dispositivo:**
- ✅ Samsung Galaxy Watch (Wear OS o Tizen)
- ✅ Smartphone Android con Samsung Health instalado
- ✅ Conexión Bluetooth entre dispositivos
- ✅ Permisos de ubicación y salud habilitados
