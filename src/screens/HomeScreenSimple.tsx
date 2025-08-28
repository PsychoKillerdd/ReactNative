import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import { HealthService } from '../services/healthDrizzle';
import { SupabaseService } from '../services/supabase';
import { WearOSConnection, HeartRateData, SleepData, StepData, ScreenTimeData } from '../types/health';

interface HomeScreenProps {
  navigation: any;
}

const StatCard: React.FC<{
  title: string;
  value: string | number;
  unit: string;
  icon: string;
  color: string;
}> = ({ title, value, unit, icon, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <View style={styles.statCardHeader}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statCardTitle}>{title}</Text>
    </View>
    <Text style={styles.statCardValue}>
      {value} <Text style={styles.statCardUnit}>{unit}</Text>
    </Text>
  </View>
);

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wearOSStatus, setWearOSStatus] = useState<WearOSConnection>({ isConnected: false });
  const [todayStats, setTodayStats] = useState<{
    heartRate: HeartRateData | null;
    sleep: SleepData | null;
    steps: StepData | null;
    screenTime: ScreenTimeData | null;
  }>({
    heartRate: null,
    sleep: null,
    steps: null,
    screenTime: null,
  });

  const loadData = useCallback(async () => {
    try {
      // Get Wear OS connection status
      const status = await HealthService.getWearOSConnectionStatus();
      setWearOSStatus(status);

      // Get today's stats
      const stats = await HealthService.getTodayStats();
      setTodayStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const initializeApp = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const user = await SupabaseService.getCurrentUser();
      if (!user) {
        // Navigate to login if not authenticated
        navigation.navigate('Login');
        return;
      }

      // Initialize health service
      await HealthService.initialize(user.id);
      
      // Load initial data
      await loadData();
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Error', 'Failed to initialize the application');
    } finally {
      setIsLoading(false);
    }
  }, [navigation, loadData]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await HealthService.syncAllHealthData();
      await loadData();
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Sync Error', 'Failed to sync health data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await SupabaseService.signOut();
      HealthService.cleanup();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const getConnectionStatusColor = () => {
    return wearOSStatus.isConnected ? '#4CAF50' : '#FF5722';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading health data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Dashboard</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Icon name="logout" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Wear OS Connection Status */}
        <View style={styles.connectionCard}>
          <View style={styles.connectionHeader}>
            <Icon
              name="watch"
              size={24}
              color={getConnectionStatusColor()}
            />
            <Text style={styles.connectionTitle}>Wear OS Device</Text>
          </View>
          <Text
            style={[
              styles.connectionStatus,
              { color: getConnectionStatusColor() }
            ]}
          >
            {wearOSStatus.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          {wearOSStatus.lastSync && (
            <Text style={styles.lastSync}>
              Last sync: {new Date(wearOSStatus.lastSync).toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Today's Stats */}
        <Text style={styles.sectionTitle}>Today's Statistics</Text>
        
        <StatCard
          title="Heart Rate"
          value={todayStats.heartRate?.value || '--'}
          unit="bpm"
          icon="favorite"
          color="#FF6B6B"
        />

        <StatCard
          title="Sleep"
          value={todayStats.sleep?.duration ? todayStats.sleep.duration.toFixed(1) : '--'}
          unit="hours"
          icon="bedtime"
          color="#9C27B0"
        />

        <StatCard
          title="Steps"
          value={todayStats.steps?.count || '--'}
          unit="steps"
          icon="directions-walk"
          color="#4CAF50"
        />

        <StatCard
          title="Screen Time"
          value={todayStats.screenTime?.duration ? todayStats.screenTime.duration.toFixed(1) : '--'}
          unit="hours"
          icon="phone-android"
          color="#FF9800"
        />

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.syncButton]}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Icon 
              name="sync" 
              size={18} 
              color="#FFF" 
            />
            <Text style={styles.actionButtonText}>
              {refreshing ? 'Syncing...' : 'Sync Data'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('History')}
          >
            <Icon name="history" size={18} color="#FFF" />
            <Text style={styles.actionButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1E5E9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  signOutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  connectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  connectionStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  lastSync: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statCardUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.48,
  },
  syncButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default HomeScreen;
