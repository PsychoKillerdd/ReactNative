import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SupabaseService } from '../services/supabase';

interface HealthData {
  heartRate: number;
  steps: number;
  sleepHours: number;
  calories: number;
  lastUpdate: string;
}

const HomeScreen: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData>({
    heartRate: 0,
    steps: 0,
    sleepHours: 0,
    calories: 0,
    lastUpdate: 'Nunca'
  });
  const [refreshing, setRefreshing] = useState(false);
  
  // Usuario de prueba
  const TEST_USER_ID = 'user-123';
  const TEST_DEVICE_ID = 'galaxy-watch-6';

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setRefreshing(true);
      
      // Cargar datos recientes
      const result = await SupabaseService.getRecentHealthData(TEST_USER_ID, 7);
      
      if (result.success && result.data) {
        // Procesar datos para mostrar las métricas más recientes
        const data = result.data;
        
        const latestHeartRate = data.find(d => d.metric_type === 'heart_rate');
        const latestSteps = data.find(d => d.metric_type === 'daily_steps');  
        const latestSleep = data.find(d => d.metric_type === 'sleep_duration');
        const latestCalories = data.find(d => d.metric_type === 'calories_burned');
        
        setHealthData({
          heartRate: latestHeartRate ? parseInt(latestHeartRate.value, 10) : 0,
          steps: latestSteps ? parseInt(latestSteps.value, 10) : 0,
          sleepHours: latestSleep ? parseFloat(latestSleep.value) : 0,
          calories: latestCalories ? parseInt(latestCalories.value, 10) : 0,
          lastUpdate: new Date().toLocaleTimeString()
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const syncWearOSData = async () => {
    Alert.alert(
      'Sincronización Wear OS',
      '¿Deseas sincronizar los datos de tu smartwatch?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sincronizar', 
          onPress: async () => {
            // Simular datos de Wear OS
            const mockData = {
              heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 BPM
              steps: Math.floor(Math.random() * 5000) + 5000, // 5000-10000 pasos
              sleepHours: parseFloat((Math.random() * 2 + 6.5).toFixed(1)), // 6.5-8.5 horas
              calories: Math.floor(Math.random() * 300) + 200 // 200-500 cal
            };

            try {
              // Insertar datos simulados
              await SupabaseService.insertHeartRate(TEST_USER_ID, TEST_DEVICE_ID, mockData.heartRate);
              await SupabaseService.insertDailySteps(TEST_USER_ID, TEST_DEVICE_ID, mockData.steps);
              await SupabaseService.insertSleepData(TEST_USER_ID, TEST_DEVICE_ID, mockData.sleepHours);
              
              // Actualizar UI
              setHealthData({
                ...mockData,
                lastUpdate: new Date().toLocaleTimeString()
              });
              
              Alert.alert('✅ Sincronización exitosa', 'Datos de Wear OS actualizados');
            } catch (error) {
              Alert.alert('❌ Error', 'No se pudieron sincronizar los datos');
            }
          }
        }
      ]
    );
  };

  const renderMetricCard = (title: string, value: string | number, unit: string, icon: string, color: string) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Salud</Text>
        <Text style={styles.headerSubtitle}>Datos de tu smartwatch</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadHealthData} />
        }
      >
        <View style={styles.metricsGrid}>
          {renderMetricCard('Frecuencia Cardíaca', healthData.heartRate || '--', 'BPM', '💓', '#e53e3e')}
          {renderMetricCard('Pasos Diarios', healthData.steps.toLocaleString() || '--', 'pasos', '🚶', '#38a169')}
          {renderMetricCard('Horas de Sueño', healthData.sleepHours || '--', 'horas', '😴', '#3182ce')}
          {renderMetricCard('Calorías', healthData.calories || '--', 'kcal', '🔥', '#d69e2e')}
        </View>

        <View style={styles.lastUpdateContainer}>
          <Text style={styles.lastUpdateText}>
            Última actualización: {healthData.lastUpdate}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.syncButton}
          onPress={syncWearOSData}
        >
          <Text style={styles.syncButtonText}>🔄 Sincronizar Wear OS</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '48%',
    marginBottom: 15,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  metricUnit: {
    fontSize: 12,
    color: '#718096',
  },
  lastUpdateContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  lastUpdateText: {
    fontSize: 14,
    color: '#718096',
  },
  syncButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
