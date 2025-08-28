# Health Tracker - React Native App

Una aplicación React Native que se integra con dispositivos Wear OS para rastrear datos de salud del usuario, incluyendo ritmo cardíaco, sueño, pasos diarios y tiempo de pantalla, almacenando toda la información en una base de datos Supabase.

## 🚀 Funcionalidades

### Datos de Wear OS
- **Ritmo cardíaco**: Monitoreo en tiempo real desde el reloj inteligente
- **Datos de sueño**: Registro de horas de sueño y calidad

### Datos Móviles
- **Pasos diarios**: Contador de pasos usando sensores del teléfono
- **Tiempo de pantalla**: Seguimiento del tiempo de uso de la aplicación

### Funcionalidades Principales
- 🔐 Autenticación de usuarios con Supabase
- 📊 Dashboard de salud en tiempo real
- 📈 Historial de datos con visualización por períodos
- 🔄 Sincronización automática con Google Fit
- ⌚ Detección de conexión con dispositivos Wear OS
- 💾 Almacenamiento seguro en Supabase

## 🛠 Tecnologías Utilizadas

- **React Native 0.81.1**: Framework principal
- **TypeScript**: Tipado estático
- **Supabase**: Backend y base de datos
- **Google Fit API**: Integración con datos de salud
- **React Navigation**: Navegación entre pantallas
- **AsyncStorage**: Almacenamiento local
- **React Native Vector Icons**: Iconografía

## 📋 Prerrequisitos

- Node.js (versión 18+)
- React Native CLI
- Android Studio (para desarrollo Android)
- Xcode (para desarrollo iOS, solo macOS)
- Cuenta de Google Developer (para Google Fit API)
- Proyecto de Supabase

## 🔧 Configuración

### 1. Clonar e Instalar Dependencias

```bash
# Instalar dependencias
bun install
# o
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Crea una tabla `health_data` con la siguiente estructura:

```sql
CREATE TABLE health_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  userId UUID NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  heartRate INTEGER,
  sleepHours DECIMAL,
  steps INTEGER,
  screenTime INTEGER,
  dataSource VARCHAR(20) NOT NULL CHECK (dataSource IN ('wear_os', 'mobile')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_health_data_user_timestamp ON health_data(userId, timestamp DESC);
CREATE INDEX idx_health_data_source ON health_data(dataSource);
```

3. Actualiza las credenciales en `src/services/supabase.ts`:

```typescript
const SUPABASE_URL = 'tu-url-de-supabase';
const SUPABASE_ANON_KEY = 'tu-clave-anonima-de-supabase';
```

### 3. Configurar Google Fit API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la Google Fit API
4. Crea credenciales para Android
5. Configura el OAuth consent screen

### 4. Configuración Android

Añade los permisos necesarios en `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="com.google.android.gms.permission.ACTIVITY_RECOGNITION" />
```

## 🚀 Ejecutar la Aplicación

### Iniciar Metro Bundler
```bash
npx react-native start
```

### Ejecutar en Android
```bash
npx react-native run-android
```

### Ejecutar en iOS
```bash
npx react-native run-ios
```

## 📱 Estructura del Proyecto

```
src/
├── components/         # Componentes reutilizables
├── screens/           # Pantallas de la aplicación
│   ├── HomeScreen.tsx    # Dashboard principal
│   ├── LoginScreen.tsx   # Autenticación
│   └── HistoryScreen.tsx # Historial de datos
├── services/          # Servicios de integración
│   ├── supabase.ts       # Cliente Supabase
│   ├── googleFit.ts      # Integración Google Fit
│   ├── screenTime.ts     # Seguimiento tiempo pantalla
│   └── health.ts         # Servicio principal de salud
├── types/             # Definiciones TypeScript
│   └── health.ts         # Tipos de datos de salud
└── utils/             # Utilidades
```

## 🔐 Autenticación y Seguridad

- La aplicación utiliza Supabase Auth para el manejo de usuarios
- Los datos de salud están vinculados al ID del usuario autenticado
- Se implementa Row Level Security (RLS) en Supabase para proteger los datos

## 📊 Datos Soportados

| Tipo de Dato | Fuente | Descripción |
|--------------|--------|-------------|
| Ritmo Cardíaco | Wear OS | Mediciones en BPM |
| Sueño | Wear OS | Horas y calidad del sueño |
| Pasos | Móvil | Contador diario de pasos |
| Tiempo de Pantalla | Móvil | Minutos de uso de la app |

## 🎨 Diseño

La aplicación utiliza un diseño moderno y limpio con:
- Tema de colores consistente
- Iconografía Material Design
- Interfaz responsiva
- Indicadores de estado en tiempo real

## ⚠️ Notas Importantes

- **Wear OS**: Los datos de ritmo cardíaco y sueño requieren un dispositivo Wear OS emparejado
- **Permisos**: La app solicitará permisos de ubicación y reconocimiento de actividad
- **Google Fit**: Es necesario configurar correctamente las credenciales de Google
- **Supabase**: Asegúrate de configurar las políticas RLS para proteger los datos de usuarios

## 🐛 Solución de Problemas

### Error de Google Fit
- Verifica que las credenciales estén correctamente configuradas
- Asegúrate de que el OAuth consent screen esté aprobado
- Revisa que los permisos de Android estén concedidos

### Error de Conexión Supabase
- Verifica las credenciales de Supabase
- Asegúrate de que la tabla `health_data` exista
- Revisa las políticas RLS

### Problemas de Compilación
- Ejecuta `npx react-native clean`
- Borra `node_modules` y reinstala con `npm install`
- Verifica la versión de Node.js

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## ⚠️ Descargo de Responsabilidad

Esta aplicación es solo para fines informativos y de seguimiento personal. No debe ser utilizada como sustituto del consejo médico profesional, diagnóstico o tratamiento.

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
