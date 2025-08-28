import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import { HealthService } from '../services/healthDrizzle';
import { HealthData } from '../types/health';

interface HistoryScreenProps {
  navigation: any;
}

const DaySelector: React.FC<{
  selectedDays: number;
  onDaysChange: (days: number) => void;
}> = ({ selectedDays, onDaysChange }) => (
  <View style={styles.daySelector}>
    {[7, 14, 30].map(days => (
      <TouchableOpacity
        key={days}
        style={[
          styles.daySelectorButton,
          selectedDays === days && styles.selectedDayButton
        ]}
        onPress={() => onDaysChange(days)}
      >
        <Text
          style={[
            styles.daySelectorText,
            selectedDays === days && styles.selectedDayText
          ]}
        >
          {days} days
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const HistoryItem: React.FC<{ item: HealthData }> = ({ item }) => {
  const formatValue = (data: HealthData) => {
    if (data.heartRate) return `${data.heartRate} bpm`;
    if (data.sleepHours) return `${data.sleepHours.toFixed(1)} hours`;
    if (data.steps) return `${data.steps.toLocaleString()} steps`;
    if (data.screenTime) return `${data.screenTime} min`;
    return 'N/A';
  };

  const getDataIcon = (data: HealthData) => {
    if (data.heartRate) return 'favorite';
    if (data.sleepHours) return 'bedtime';
    if (data.steps) return 'directions-walk';
    if (data.screenTime) return 'phone-android';
    return 'data-usage';
  };

  const getDataColor = (data: HealthData) => {
    if (data.heartRate) return '#FF6B6B';
    if (data.sleepHours) return '#9C27B0';
    if (data.steps) return '#4CAF50';
    if (data.screenTime) return '#FF9800';
    return '#666';
  };

  const getDataType = (data: HealthData) => {
    if (data.heartRate) return 'Heart Rate';
    if (data.sleepHours) return 'Sleep';
    if (data.steps) return 'Steps';
    if (data.screenTime) return 'Screen Time';
    return 'Unknown';
  };

  return (
    <View style={styles.historyItem}>
      <View style={styles.itemLeft}>
        <Icon
          name={getDataIcon(item)}
          size={24}
          color={getDataColor(item)}
          style={styles.itemIcon}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemType}>{getDataType(item)}</Text>
          <Text style={styles.itemSource}>
            {item.dataSource === 'wear_os' ? 'Wear OS' : 'Mobile'}
          </Text>
        </View>
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemValue}>{formatValue(item)}</Text>
        <Text style={styles.itemTime}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const [historyData, setHistoryData] = useState<HealthData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(7);

  const loadHistoryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await HealthService.getHistoricalData(selectedDays);
      setHistoryData(data);
    } catch (error) {
      console.error('Error loading history data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDays]);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  const groupDataByDate = (data: HealthData[]) => {
    const grouped: { [key: string]: HealthData[] } = {};
    
    data.forEach(item => {
      const date = new Date(item.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });
    
    return Object.entries(grouped).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  const groupedData = groupDataByDate(historyData);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health History</Text>
        <View style={styles.placeholder} />
      </View>

      <DaySelector selectedDays={selectedDays} onDaysChange={setSelectedDays} />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {groupedData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="history" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No data available</Text>
              <Text style={styles.emptySubtitle}>
                Start syncing your health data to see history
              </Text>
            </View>
          ) : (
            groupedData.map(([date, items]) => (
              <View key={date} style={styles.dayContainer}>
                <Text style={styles.dayHeader}>
                  {new Date(date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <View style={styles.dayItems}>
                  {items.map((item, index) => (
                    <HistoryItem key={`${item.id}-${index}`} item={item} />
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  daySelectorButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  selectedDayButton: {
    backgroundColor: '#2196F3',
  },
  daySelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  dayContainer: {
    marginBottom: 24,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingLeft: 4,
  },
  dayItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemSource: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemTime: {
    fontSize: 12,
    color: '#666',
  },
});

export default HistoryScreen;
