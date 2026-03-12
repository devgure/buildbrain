import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import axios from 'axios';

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  bidsCount: number;
  imageUrl?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  rating: number;
}

interface HomeProps {
  baseUrl?: string;
  userToken?: string;
  onNavigate?: (screen: string) => void;
}

const Home: React.FC<HomeProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
  userToken = '',
  onNavigate,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recommendations, setRecommendations] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${userToken}` };

      const [userRes, projectsRes, recsRes, notificationsRes] = await Promise.all([
        axios.get(`${baseUrl}/users/me`, { headers }),
        axios.get(`${baseUrl}/projects/recent`, { headers }),
        axios.get(`${baseUrl}/projects/recommended`, { headers }),
        axios.get(`${baseUrl}/notifications/unread-count`, { headers }),
      ]);

      setUser(userRes.data);
      setRecentProjects(projectsRes.data.items || []);
      setRecommendations(recsRes.data.items || []);
      setNotifications(notificationsRes.data.count || 0);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196f3" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header with Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name}! 👋</Text>
            <Text style={styles.subheading}>{user?.role}</Text>
          </View>
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationCount}>{notifications}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {user?.rating.toFixed(1) || '—'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{recentProjects.length}</Text>
            <Text style={styles.statLabel}>
              {user?.role === 'GC' ? 'Projects' : 'Jobs'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>${(Math.random() * 50000).toFixed(0)}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          {user?.role === 'GC' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => onNavigate?.('Projects')}
            >
              <Text style={styles.actionBtnText}>📋 Post Job</Text>
            </TouchableOpacity>
          )}
          {user?.role === 'WORKER' && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={() => onNavigate?.('Bids')}
            >
              <Text style={styles.actionBtnText}>🎯 Browse Jobs</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => onNavigate?.('Wallet')}
          >
            <Text style={styles.actionBtnText}>💰 Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => onNavigate?.('Profile')}
          >
            <Text style={styles.actionBtnText}>👤 Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Items Section */}
        {user?.role === 'GC' && recentProjects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📦 Recent Projects</Text>
              <TouchableOpacity onPress={() => onNavigate?.('Projects')}>
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            {recentProjects.slice(0, 3).map(project => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => onNavigate?.('Projects')}
              >
                <View style={styles.projectCardContent}>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {project.title}
                  </Text>
                  <Text style={styles.projectDescription} numberOfLines={1}>
                    {project.description}
                  </Text>
                  <View style={styles.projectMeta}>
                    <Text style={styles.projectBudget}>${project.budget.toLocaleString()}</Text>
                    <Text style={styles.projectBids}>{project.bidsCount} bids</Text>
                  </View>
                </View>
                <View style={[styles.statusChip, { backgroundColor: '#e3f2fd' }]}>
                  <Text style={styles.statusText}>{project.status}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recommendations Section */}
        {user?.role === 'WORKER' && recommendations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⭐ Recommended for You</Text>
              <TouchableOpacity onPress={() => onNavigate?.('Bids')}>
                <Text style={styles.seeAll}>See All →</Text>
              </TouchableOpacity>
            </View>
            {recommendations.slice(0, 3).map(project => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => onNavigate?.('Bids')}
              >
                <View style={styles.projectCardContent}>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {project.title}
                  </Text>
                  <Text style={styles.projectDescription} numberOfLines={1}>
                    {project.description}
                  </Text>
                  <View style={styles.projectMeta}>
                    <Text style={styles.projectBudget}>${project.budget.toLocaleString()}</Text>
                    <Text style={styles.projectBids}>{project.bidsCount} bids</Text>
                  </View>
                </View>
                <View style={[styles.statusChip, { backgroundColor: '#f3e5f5' }]}>
                  <Text style={styles.statusText}>NEW</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tips/Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Quick Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>
              {user?.role === 'GC'
                ? 'Get More Bids'
                : 'Improve Your Profile'}
            </Text>
            <Text style={styles.tipDescription}>
              {user?.role === 'GC'
                ? 'Clear job descriptions attract more quality bids. Try adding photos and detailed requirements.'
                : 'Add certifications and portfolio items to stand out to project creators.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  subheading: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  notificationBadge: {
    backgroundColor: '#f44336',
    borderRadius: 20,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 6,
    marginVertical: 6,
    alignItems: 'center',
    minWidth: '45%',
  },
  primaryBtn: {
    backgroundColor: '#2196f3',
  },
  secondaryBtn: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196f3',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  seeAll: {
    color: '#2196f3',
    fontWeight: '600',
    fontSize: 14,
  },
  projectCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  projectCardContent: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  projectDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  projectBudget: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  projectBids: {
    fontSize: 12,
    color: '#999',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1976d2',
  },
  tipCard: {
    backgroundColor: '#fffde7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#fbc02d',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  tipDescription: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
});

export default Home;
