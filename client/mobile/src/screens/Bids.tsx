import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  FlatList,
} from 'react-native';
import axios from 'axios';

interface BidProject {
  id: string;
  title: string;
  description: string;
  budget: number;
  skills: string[];
  deadline: Date;
  bidsCount: number;
  creatorName: string;
  creatorRating: number;
}

interface UserBid {
  id: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  message: string;
  status: 'SUBMITTED' | 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  submittedAt: Date;
  respondedAt?: Date;
}

interface BidFilter {
  minBudget: number;
  maxBudget: number;
  skills: string[];
  sortBy: 'newest' | 'budget' | 'deadline';
}

interface BidsProps {
  baseUrl?: string;
  userToken?: string;
  onNavigate?: (screen: string) => void;
}

const Bids: React.FC<BidsProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
  userToken = '',
  onNavigate,
}) => {
  const [projects, setProjects] = useState<BidProject[]>([]);
  const [userBids, setUserBids] = useState<UserBid[]>([]);
  const [tab, setTab] = useState<'browse' | 'myBids'>('browse');
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<BidProject | null>(null);
  const [bidModalVisible, setBidModalVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (tab === 'browse') {
      fetchProjects();
    } else {
      fetchUserBids();
    }
  }, [tab, page, searchQuery]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      const params = {
        search: searchQuery,
        skip: (page - 1) * 20,
        take: 20,
      };

      const response = await axios.get(`${baseUrl}/projects/available`, {
        headers,
        params,
      });

      if (page === 1) {
        setProjects(response.data.items || []);
      } else {
        setProjects([...projects, ...(response.data.items || [])]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBids = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      const response = await axios.get(`${baseUrl}/bids/my-bids`, { headers });
      setUserBids(response.data.items || []);
    } catch (error) {
      console.error('Failed to fetch bids:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedProject || !bidAmount) {
      Alert.alert('Error', 'Please enter a bid amount');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      await axios.post(
        `${baseUrl}/bids`,
        {
          projectId: selectedProject.id,
          amount,
          message: bidMessage,
        },
        { headers }
      );

      Alert.alert('Success', 'Bid submitted successfully');
      setBidModalVisible(false);
      setBidAmount('');
      setBidMessage('');
      fetchProjects();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit bid');
      console.error(error);
    }
  };

  const handleWithdrawBid = async (bidId: string) => {
    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      await axios.patch(`${baseUrl}/bids/${bidId}/withdraw`, {}, { headers });
      Alert.alert('Success', 'Bid withdrawn');
      fetchUserBids();
    } catch (error) {
      Alert.alert('Error', 'Failed to withdraw bid');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return '#4caf50';
      case 'REJECTED':
        return '#f44336';
      case 'PENDING':
        return '#ff9800';
      case 'SUBMITTED':
        return '#2196f3';
      default:
        return '#999';
    }
  };

  const dayRemaining = (deadline: Date) => {
    const now = new Date();
    const target = new Date(deadline);
    const days = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading && projects.length === 0 && userBids.length === 0) {
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
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, tab === 'browse' && styles.tabActive]}
          onPress={() => {
            setTab('browse');
            setPage(1);
          }}
        >
          <Text style={[styles.tabText, tab === 'browse' && styles.tabTextActive]}>
            🔍 Browse Jobs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'myBids' && styles.tabActive]}
          onPress={() => setTab('myBids')}
        >
          <Text style={[styles.tabText, tab === 'myBids' && styles.tabTextActive]}>
            📋 My Bids
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'browse' ? (
        <ScrollView style={styles.scrollView}>
          {/* Search */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Projects List */}
          {projects.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No jobs available</Text>
            </View>
          ) : (
            projects.map(project => (
              <View key={project.id} style={styles.projectCard}>
                <View style={styles.projectHeader}>
                  <Text style={styles.projectTitle} numberOfLines={2}>
                    {project.title}
                  </Text>
                  <Text style={styles.projectBudget}>
                    ${project.budget.toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.projectDescription} numberOfLines={2}>
                  {project.description}
                </Text>

                {/* Skills */}
                <View style={styles.skillsContainer}>
                  {project.skills.slice(0, 3).map((skill, i) => (
                    <View key={i} style={styles.skillBadge}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                  {project.skills.length > 3 && (
                    <Text style={styles.moreSkills}>+{project.skills.length - 3}</Text>
                  )}
                </View>

                {/* Meta Info */}
                <View style={styles.projectMeta}>
                  <View>
                    <Text style={styles.metaLabel}>Deadline</Text>
                    <Text style={styles.metaValue}>
                      {dayRemaining(project.deadline)} days left
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Bids</Text>
                    <Text style={styles.metaValue}>{project.bidsCount}</Text>
                  </View>
                  <View>
                    <Text style={styles.metaLabel}>Creator Rating</Text>
                    <Text style={styles.metaValue}>
                      ⭐ {project.creatorRating.toFixed(1)}
                    </Text>
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={styles.bidBtn}
                  onPress={() => {
                    setSelectedProject(project);
                    setBidModalVisible(true);
                  }}
                >
                  <Text style={styles.bidBtnText}>Place Bid</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Load More */}
          {projects.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setPage(page + 1)}
            >
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.scrollView}>
          {userBids.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No bids yet</Text>
            </View>
          ) : (
            userBids.map(bid => (
              <View key={bid.id} style={styles.bidCard}>
                <View style={styles.bidHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bidProjectTitle} numberOfLines={1}>
                      {bid.projectTitle}
                    </Text>
                    <Text style={styles.bidAmount}>
                      ${bid.amount.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(bid.status) },
                      ]}
                    >
                      {bid.status}
                    </Text>
                  </View>
                </View>

                {bid.message && (
                  <Text style={styles.bidMessage} numberOfLines={2}>
                    {bid.message}
                  </Text>
                )}

                <Text style={styles.bidDate}>
                  Submitted: {new Date(bid.submittedAt).toLocaleDateString()}
                </Text>

                {bid.status === 'SUBMITTED' && (
                  <TouchableOpacity
                    style={styles.withdrawBtn}
                    onPress={() => {
                      Alert.alert(
                        'Withdraw Bid',
                        'Are you sure you want to withdraw this bid?',
                        [
                          { text: 'Cancel', onPress: () => {} },
                          {
                            text: 'Withdraw',
                            onPress: () => handleWithdrawBid(bid.id),
                            style: 'destructive',
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.withdrawBtnText}>Withdraw</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Bid Modal */}
      <Modal
        visible={bidModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBidModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place Bid</Text>
              <TouchableOpacity onPress={() => setBidModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedProject && (
              <>
                <View style={styles.projectSummary}>
                  <Text style={styles.projectSummaryTitle}>
                    {selectedProject.title}
                  </Text>
                  <Text style={styles.projectSummaryBudget}>
                    Budget: ${selectedProject.budget.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Your Bid Amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    value={bidAmount}
                    onChangeText={setBidAmount}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Message (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Why should we hire you?"
                    placeholderTextColor="#999"
                    value={bidMessage}
                    onChangeText={setBidMessage}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary]}
                    onPress={handleSubmitBid}
                  >
                    <Text style={styles.modalBtnText}>Submit Bid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnSecondary]}
                    onPress={() => setBidModalVisible(false)}
                  >
                    <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2196f3',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#2196f3',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212121',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  projectCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  projectBudget: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
    marginLeft: 8,
  },
  projectDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    lineHeight: 16,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  skillBadge: {
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '500',
  },
  moreSkills: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 10,
    color: '#999',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212121',
    marginTop: 2,
  },
  bidBtn: {
    backgroundColor: '#2196f3',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bidBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  loadMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#2196f3',
    fontWeight: '600',
  },
  bidCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bidProjectTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  bidAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4caf50',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bidMessage: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  bidDate: {
    fontSize: 11,
    color: '#999',
  },
  withdrawBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f44336',
    borderRadius: 6,
    alignItems: 'center',
  },
  withdrawBtnText: {
    color: '#f44336',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  projectSummary: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  projectSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
  },
  projectSummaryBudget: {
    fontSize: 12,
    color: '#1565c0',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#212121',
  },
  textArea: {
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: '#2196f3',
  },
  modalBtnSecondary: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalBtnSecondaryText: {
    color: '#212121',
    fontWeight: '600',
  },
});

export default Bids;
