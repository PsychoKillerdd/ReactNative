# Configuración de Base de Datos - Health Tracker App

## 📋 Resumen

Tu aplicación React Native de Health Tracker está completa con una base de datos relacional normalizada diseñada específicamente para almacenar datos de salud de dispositivos Wear OS y móviles de forma eficiente.

## 🗃️ Estructura de la Base de Datos

### Tablas Principales:

1. **user_profiles** - Perfiles de usuario con configuración y zona horaria
2. **devices** - Dispositivos registrados (Wear OS, Android, iPhone)
3. **health_metric_types** - Tipos de métricas de salud (heart_rate, sleep, etc.)
4. **health_data** - Datos de salud en tiempo real (ritmo cardíaco principalmente)
5. **sleep_sessions** - Sesiones completas de sueño con calidad
6. **daily_activity** - Actividad diaria agregada (pasos, tiempo pantalla, etc.)
7. **health_goals** - Objetivos de salud personalizables
8. **health_alerts** - Alertas por valores anómalos

### Características:
- ✅ **Relaciones Normalizadas**: Sin duplicación de datos
- ✅ **Índices Optimizados**: Para consultas rápidas por usuario y fecha
- ✅ **Row Level Security (RLS)**: Seguridad a nivel de fila
- ✅ **Triggers Automáticos**: Detección de anomalías en tiempo real
- ✅ **Funciones Helper**: Para consultas complejas optimizadas

## 🚀 Pasos de Configuración

### 1. Configurar Supabase

1. **Crear proyecto Supabase:**
   - Ve a [supabase.com](https://supabase.com)
   - Crea un nuevo proyecto
   - Anota la URL y la clave anónima

2. **Ejecutar el esquema de base de datos:**
   ```sql
   -- Copia y pega el contenido completo del archivo database/schema.sql
   -- en el SQL Editor de Supabase
   ```

3. **Ejecutar las funciones helper:**
   ```sql
   -- Copia y pega el contenido completo del archivo database/functions.sql
   -- en el SQL Editor de Supabase
   ```

### 2. Configurar las Credenciales

Edita el archivo `src/services/supabase.ts` y actualiza:

```typescript
const SUPABASE_URL = 'TU_URL_DE_SUPABASE';
const SUPABASE_ANON_KEY = 'TU_CLAVE_ANONIMA_DE_SUPABASE';
```

### 3. Configurar Google Fit API

1. **Google Cloud Console:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com)
   - Crea o selecciona un proyecto
   - Habilita la Google Fit API
   - Crea credenciales OAuth 2.0

2. **Configurar permisos en Android:**
   - Los permisos ya están configurados en `android/app/src/main/AndroidManifest.xml`
   - Asegúrate de que la aplicación tenga permisos para:
     - `ACTIVITY_RECOGNITION`
     - `BODY_SENSORS`
     - Acceso a Google Fit

### 4. Configurar OAuth para Google Fit

Edita `android/app/src/main/res/values/strings.xml` (crear si no existe):

```xml
<resources>
    <string name="app_name">HealthTracker</string>
    <string name="google_fit_client_id">TU_CLIENT_ID_DE_GOOGLE</string>
</resources>
```

## 📱 Uso de la Aplicación

### Funcionalidades Principales:

1. **Datos de Wear OS (Google Fit):**
   - ❤️ Ritmo cardíaco en tiempo real
   - 😴 Sesiones de sueño con calidad
   - ⏱️ Sincronización automática

2. **Datos Móviles:**
   - 👟 Contador de pasos diarios
   - 📱 Tiempo de pantalla
   - 📊 Métricas agregadas

3. **Almacenamiento Inteligente:**
   - Base de datos relacional normalizada
   - Detección automática de anomalías
   - Histórico completo con consultas optimizadas

### Flujo de Datos:

```
Wear OS Device → Google Fit API → React Native App → Supabase Database
Mobile Sensors → React Native Services → Supabase Database
```

## 🔧 Comandos de Desarrollo

```bash
# Iniciar Metro Bundler
bunx react-native start

# Ejecutar en Android
bunx react-native run-android

# Ejecutar en iOS (requiere Mac)
bunx react-native run-ios

# Verificar TypeScript
bunx tsc --noEmit

# Verificar sintaxis
npm run lint
```

## 📊 Consultas Útiles

### Ver resumen de salud de un usuario:
```sql
SELECT * FROM get_user_health_summary('user-uuid', '2024-01-15');
```

### Ver dispositivos de un usuario:
```sql
SELECT * FROM devices WHERE user_id = 'user-uuid';
```

### Ver alertas recientes:
```sql
SELECT * FROM health_alerts 
WHERE user_id = 'user-uuid' 
AND created_at >= NOW() - INTERVAL '24 hours';
```

## 🛡️ Seguridad

- **RLS (Row Level Security)**: Cada usuario solo puede ver sus propios datos
- **Autenticación**: Integración completa con Supabase Auth
- **Validación**: Triggers de base de datos para validar rangos de valores
- **Encriptación**: Todas las comunicaciones son HTTPS

## 🔄 Próximos Pasos

1. **Configurar Supabase** con las credenciales reales
2. **Configurar Google Fit** con OAuth válido
3. **Probar en dispositivo** con Wear OS pareado
4. **Personalizar objetivos** de salud según necesidades
5. **Configurar notificaciones** para alertas importantes

## 📞 Soporte

Si encuentras algún problema:

1. Verifica que todas las credenciales estén correctas
2. Revisa que los permisos de Android estén concedidos
3. Asegúrate de que el dispositivo Wear OS esté pareado
4. Consulta los logs de la consola para errores específicos

---

¡Tu aplicación de Health Tracker está lista para usar! 🎉
