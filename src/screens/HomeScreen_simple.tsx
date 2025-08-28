import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SupabaseService } from '../services/supabase';

interface HealthSummary {
  date: string;
  heartRate: {
    latest: number;
    average: number;
    count: number;
  };
  steps: {
    total: number;
    recorded: boolean;
  };
  sleep: {
    hours: number;
    recorded: boolean;
  };
  totalRecords: number;
}

const HomeScreen: React.FC = () => {
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Usuario de prueba para testing
  const TEST_USER_ID = '12345678-1234-1234-1234-123456789012';
  const TEST_DEVICE_ID = 'galaxy-watch-6';

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      
      // Probar conexión primero
      const connectionTest = await SupabaseService.testConnection();
      if (!connectionTest.success) {
        Alert.alert('Error de Conexión', `No se pudo conectar a la base de datos: ${connectionTest.error}`);
        return;
      }

      // Obtener resumen diario
      const result = await SupabaseService.getDailySummary(TEST_USER_ID);
      if (result.success && result.data) {
        setSummary(result.data);
      } else {
        Alert.alert('Error', `No se pudieron cargar los datos: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Error inesperado: ${error}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHealthData();
  };

  const insertSampleData = async () => {
    try {
      setLoading(true);
      
      // Generar datos de prueba
      const randomHeartRate = Math.floor(Math.random() * 40) + 60; // 60-100 BPM
      const randomSteps = Math.floor(Math.random() * 5000) + 3000; // 3000-8000 pasos
      const randomSleep = Math.random() * 3 + 6; // 6-9 horas

      // Insertar heart rate
      const hrResult = await SupabaseService.insertHeartRate(TEST_USER_ID, TEST_DEVICE_ID, randomHeartRate);
      
      // Insertar pasos
      const stepsResult = await SupabaseService.insertDailySteps(TEST_USER_ID, TEST_DEVICE_ID, randomSteps);
      
      // Insertar sueño
      const sleepResult = await SupabaseService.insertSleepData(TEST_USER_ID, TEST_DEVICE_ID, randomSleep);

      if (hrResult.success && stepsResult.success && sleepResult.success) {
        Alert.alert('✅ Éxito', 'Datos de prueba insertados correctamente');
        loadHealthData(); // Recargar datos
      } else {
        Alert.alert('❌ Error', 'Algunos datos no se pudieron insertar');
      }
    } catch (error) {
      Alert.alert('Error', `Error insertando datos: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando datos de salud...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏥 Health Tracker</Text>
          <Text style={styles.subtitle}>Samsung Health Data</Text>
        </View>

        {/* Resumen de datos */}
        {summary ? (
          <>
            <View style={styles.statsContainer}>
              {/* Heart Rate */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>💓</Text>
                <Text style={styles.statLabel}>Frecuencia Cardíaca</Text>
                <Text style={styles.statValue}>
                  {summary.heartRate.latest > 0 ? `${summary.heartRate.latest} BPM` : 'No data'}
                </Text>
                <Text style={styles.statSubtext}>
                  Promedio: {summary.heartRate.average} | {summary.heartRate.count} registros
                </Text>
              </View>

              {/* Steps */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🚶‍♂️</Text>
                <Text style={styles.statLabel}>Pasos Hoy</Text>
                <Text style={styles.statValue}>
                  {summary.steps.recorded ? `${summary.steps.total.toLocaleString()}` : 'No data'}
                </Text>
                <Text style={styles.statSubtext}>
                  {summary.steps.recorded ? 'Meta: 10,000 pasos' : 'Sin registros'}
                </Text>
              </View>

              {/* Sleep */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>😴</Text>
                <Text style={styles.statLabel}>Sueño</Text>
                <Text style={styles.statValue}>
                  {summary.sleep.recorded ? `${summary.sleep.hours.toFixed(1)}h` : 'No data'}
                </Text>
                <Text style={styles.statSubtext}>
                  {summary.sleep.recorded ? 'Calidad: Buena' : 'Sin registros'}
                </Text>
              </View>

              {/* Total Records */}
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📊</Text>
                <Text style={styles.statLabel}>Total Registros</Text>
                <Text style={styles.statValue}>{summary.totalRecords}</Text>
                <Text style={styles.statSubtext}>Hoy: {summary.date}</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>📭 No hay datos disponibles</Text>
            <Text style={styles.noDataSubtext}>
              Presiona "Insertar Datos de Prueba" para comenzar
            </Text>
          </View>
        )}

        {/* Botones de acción */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={insertSampleData}>
            <Text style={styles.buttonText}>🧪 Insertar Datos de Prueba</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={loadHealthData}>
            <Text style={styles.buttonText}>🔄 Actualizar Datos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            💡 Esta app se conecta directamente a Supabase para almacenar datos de Samsung Health
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E1F5FE',
    textAlign: 'center',
    marginTop: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    padding: 15,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statIcon: {
    fontSize: 30,
    textAlign: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#007AFF',
    marginBottom: 5,
  },
  statSubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
  noDataContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  noDataSubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    padding: 20,
    paddingTop: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#6C757D',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoContainer: {
    padding: 20,
    paddingTop: 0,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default HomeScreen;
