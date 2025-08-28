# 🚀 Guía de Configuración con Drizzle ORM

## 📋 Resumen

Tu aplicación React Native ahora está configurada para usar **Drizzle ORM** en lugar del cliente directo de Supabase. Esto te proporciona:

- ✅ **Type Safety** completa con TypeScript
- ✅ **Query Builder** intuitivo y potente
- ✅ **Migrations** automáticas y controladas
- ✅ **Relaciones** definidas en código
- ✅ **Performance** optimizado

## 🔧 Configuración Inicial

### 1. Configurar Variables de Entorno

Actualiza el archivo `.env` con tus credenciales reales:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres.nnnjiepnpsedqjyokfmq:TU_PASSWORD_REAL@aws-0-us-east-2.pooler.supabase.com:6543/postgres"

# Supabase Configuration (para auth)
SUPABASE_URL="https://nnnjiepnpsedqjyokfmq.supabase.co"
SUPABASE_ANON_KEY="tu_supabase_anon_key"

# Google Fit API Configuration
GOOGLE_FIT_CLIENT_ID="tu_google_fit_client_id"

# Development
NODE_ENV="development"
```

### 2. Ejecutar el Schema en Supabase

Como ya tienes el schema SQL creado, ejecuta en Supabase SQL Editor:

```sql
-- Primero ejecuta: database/schema.sql
-- Luego ejecuta: database/functions.sql
```

### 3. Insertar Tipos de Métricas Iniciales

```bash
npm run db:seed
```

Este comando insertará los tipos de métricas de salud necesarios (heart_rate, blood_pressure, etc.).

## 🛠️ Comandos Disponibles

### Comandos de Base de Datos:
```bash
# Generar migraciones (si cambias el schema)
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# Abrir Drizzle Studio (interfaz visual)
npm run db:studio

# Push schema directo a DB (desarrollo)
npm run db:push

# Insertar datos iniciales
npm run db:seed
```

### Comandos de React Native:
```bash
# Iniciar Metro Bundler
npm start

# Ejecutar en Android
npm run android

# Verificar TypeScript
bunx tsc --noEmit
```

## 📊 Uso del Servicio

### Ejemplo de Uso Básico:

```typescript
import { DrizzleService } from '../db/drizzleService';

// Crear usuario
const user = await DrizzleService.createUserProfile('user-id', {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
});

// Registrar dispositivo
const device = await DrizzleService.registerDevice('user-id', {
  deviceName: 'Galaxy Watch 4',
  deviceType: 'wear_os',
  deviceModel: 'SM-R870',
  manufacturer: 'Samsung',
});

// Insertar datos de ritmo cardíaco
await DrizzleService.insertHeartRateBatch('user-id', device.id, [
  { timestamp: '2025-01-15T10:30:00Z', value: 72 },
  { timestamp: '2025-01-15T10:31:00Z', value: 74 },
]);

// Obtener resumen de salud
const summary = await DrizzleService.getUserHealthSummary('user-id', '2025-01-15');
```

### Usando el Servicio de Salud Actualizado:

```typescript
import { HealthService } from '../services/healthDrizzle';

// Inicializar servicio
await HealthService.initialize('user-id');

// Sincronizar datos
await HealthService.syncAllHealthData();

// Obtener estadísticas de hoy
const todayStats = await HealthService.getTodayStats();

// Obtener datos históricos
const history = await HealthService.getHistoricalData(7); // últimos 7 días
```

## 🔄 Migración desde Supabase Client

### Cambios Principales:

1. **Servicio de Salud:**
   - `src/services/health.ts` → `src/services/healthDrizzle.ts`
   - Métodos actualizados para usar Drizzle ORM

2. **Base de Datos:**
   - Cliente Supabase → Cliente PostgreSQL con Drizzle
   - Queries SQL → Query Builder tipado

3. **Tipos:**
   - Tipos inferidos automáticamente desde el schema
   - Type safety completa en todas las operaciones

### Para Actualizar tu App:

1. **Reemplaza las importaciones:**
   ```typescript
   // Antes
   import { HealthService } from '../services/health';
   
   // Después
   import { HealthService } from '../services/healthDrizzle';
   ```

2. **Los métodos públicos son idénticos**, no necesitas cambiar tu código de UI.

## 🔍 Drizzle Studio

Drizzle Studio te permite visualizar y editar tu base de datos:

```bash
npm run db:studio
```

Esto abrirá una interfaz web donde puedes:
- Ver todas las tablas y datos
- Ejecutar queries visuales
- Editar registros
- Analizar relaciones

## 🔐 Autenticación

Puedes mantener Supabase Auth y usar Drizzle solo para las operaciones de base de datos:

```typescript
// Mantén Supabase para auth
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth con Supabase
const { data: { user } } = await supabase.auth.getUser();

// Datos con Drizzle
if (user) {
  await HealthService.initialize(user.id);
}
```

## 📈 Ventajas de Drizzle

### vs Supabase Client:
- ✅ **Mejor Performance**: Queries optimizadas automáticamente
- ✅ **Type Safety**: Tipos generados automáticamente
- ✅ **IntelliSense**: Autocompletado perfecto en tu IDE
- ✅ **Debugging**: Queries SQL visibles y debuggeables
- ✅ **Migrations**: Control de versiones de tu DB

### vs Prisma:
- ✅ **Más Ligero**: Bundle size más pequeño
- ✅ **Edge Ready**: Funciona en edge functions
- ✅ **SQL-like**: Sintaxis más cercana a SQL nativo
- ✅ **Performance**: Mejor performance en queries complejas

## 🚨 Troubleshooting

### Error: "Cannot connect to database"
- Verifica que la URL de base de datos esté correcta
- Asegúrate de que la contraseña no tenga caracteres especiales sin escapar

### Error: "Relation does not exist"
- Ejecuta el schema SQL en Supabase
- Verifica que las tablas se hayan creado correctamente

### Error: "Environment variable not found"
- Verifica que el archivo `.env` esté en la raíz del proyecto
- Reinicia el servidor de desarrollo después de cambios en `.env`

## 🎯 Próximos Pasos

1. **Configura las credenciales** en `.env`
2. **Ejecuta el seed**: `npm run db:seed`
3. **Actualiza las importaciones** para usar `healthDrizzle.ts`
4. **Prueba la aplicación**: `npm run android`
5. **Explora Drizzle Studio**: `npm run db:studio`

¡Tu aplicación ahora tiene una base de datos profesional con type safety completa! 🎉
