import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Job {
  id: string;
  title: string;
  category: string;
  hourlyRate?: number;
  totalBudget?: number;
  location: string;
  openPositions: number;
  relevanceScore?: number;
  hasApplied?: boolean;
}

export default function JobsScreen({ navigation }: any) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchJobs();
    }, []),
  );

  const fetchJobs = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await axios.get(`${API_URL}/marketplace/jobs/search`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          skip: 0,
          take: 20,
        },
      });

      setJobs(response.data.data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9333ea" />
      </View>
    );
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const renderJobCard = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.jobHeader}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.jobCategory}>{item.category}</Text>
        </View>
        <View style={styles.jobRate}>
          {item.hourlyRate && (
            <Text style={styles.rateText}>{formatCurrency(item.hourlyRate)}/hr</Text>
          )}
          {item.relevanceScore && (
            <Text style={styles.scoreText}>Match: {Math.round(item.relevanceScore)}%</Text>
          )}
        </View>
      </View>

      <Text style={styles.location}>📍 {item.location}</Text>

      <View style={styles.jobFooter}>
        <Text style={styles.positions}>{item.openPositions} positions open</Text>
        {!item.hasApplied ? (
          <TouchableOpacity style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.appliedText}>✓ Applied</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  jobCategory: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  jobRate: {
    alignItems: 'flex-end',
  },
  rateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9333ea',
  },
  scoreText: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  location: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  positions: {
    fontSize: 12,
    color: '#6b7280',
  },
  applyButton: {
    backgroundColor: '#9333ea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  appliedText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 12,
  },
});
