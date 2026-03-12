import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  ImageBackground,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import axios from 'axios';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  rating: number;
  reviewCount: number;
  avatarUrl?: string;
  bio: string;
  company?: string;
  joinDate: Date;
}

interface Skill {
  id: string;
  name: string;
  endorsed: number;
  verified: boolean;
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expireDate?: Date;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  projectValue: number;
}

interface ProfileProps {
  baseUrl?: string;
  userToken?: string;
  onNavigate?: (screen: string) => void;
}

const Profile: React.FC<ProfileProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
  userToken = '',
  onNavigate,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${userToken}` };

      const [profileRes, skillsRes, certRes, portfolioRes] = await Promise.all([
        axios.get(`${baseUrl}/users/me`, { headers }),
        axios.get(`${baseUrl}/users/me/skills`, { headers }),
        axios.get(`${baseUrl}/users/me/certifications`, { headers }),
        axios.get(`${baseUrl}/users/me/portfolio`, { headers }),
      ]);

      setProfile(profileRes.data);
      setSkills(skillsRes.data.items || []);
      setCertifications(certRes.data.items || []);
      setPortfolio(portfolioRes.data.items || []);

      // Set edit fields
      setEditName(profileRes.data.name);
      setEditBio(profileRes.data.bio);
      setEditPhone(profileRes.data.phone);
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      await axios.patch(
        `${baseUrl}/users/me`,
        {
          name: editName,
          bio: editBio,
          phone: editPhone,
        },
        { headers }
      );

      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated');
      fetchProfileData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error(error);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      await axios.delete(`${baseUrl}/users/me/skills/${skillId}`, { headers });
      setSkills(skills.filter(s => s.id !== skillId));
    } catch (error) {
      Alert.alert('Error', 'Failed to remove skill');
    }
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
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        {profile && (
          <>
            <View style={styles.headerBackground}>
              <ImageBackground
                source={{ uri: profile.avatarUrl || 'https://via.placeholder.com/150' }}
                style={styles.avatarImage}
                imageStyle={{ borderRadius: 50 }}
              >
                <View style={styles.avatarOverlay} />
              </ImageBackground>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileRole}>{profile.role}</Text>
              {profile.company && (
                <Text style={styles.profileCompany}>@ {profile.company}</Text>
              )}

              <View style={styles.ratingContainer}>
                <Text style={styles.ratingStars}>
                  ⭐ {profile.rating.toFixed(1)}
                </Text>
                <Text style={styles.ratingCount}>
                  ({profile.reviewCount} reviews)
                </Text>
              </View>

              <Text style={styles.joinDate}>
                Joined {new Date(profile.joinDate).toLocaleDateString()}
              </Text>

              {profile.bio && (
                <Text style={styles.profileBio}>{profile.bio}</Text>
              )}
            </View>

            {/* Edit Button */}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setEditModalVisible(true)}
            >
              <Text style={styles.editBtnText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Skills Section */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Skills</Text>
            <View style={styles.skillsContainer}>
              {skills.map(skill => (
                <View key={skill.id} style={styles.skillTag}>
                  <Text style={styles.skillName}>
                    {skill.name}
                    {skill.verified && ' ✓'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveSkill(skill.id)}
                    style={styles.skillRemove}
                  >
                    <Text style={styles.skillRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Certifications Section */}
        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 Certifications</Text>
            {certifications.map(cert => (
              <View key={cert.id} style={styles.certCard}>
                <View>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certIssuer}>{cert.issuer}</Text>
                  <Text style={styles.certDate}>
                    Issued: {new Date(cert.issueDate).toLocaleDateString()}
                  </Text>
                  {cert.expireDate && (
                    <Text style={styles.certExpire}>
                      Expires: {new Date(cert.expireDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <Text style={styles.certBadge}>📋</Text>
              </View>
            ))}
          </View>
        )}

        {/* Portfolio Section */}
        {portfolio.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎨 Portfolio</Text>
            {portfolio.map(item => (
              <View key={item.id} style={styles.portfolioCard}>
                {item.imageUrl && (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.portfolioImage}
                  />
                )}
                <View style={styles.portfolioContent}>
                  <Text style={styles.portfolioTitle}>{item.title}</Text>
                  <Text style={styles.portfolioDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={styles.portfolioValue}>
                    Project Value: ${item.projectValue.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Account</Text>
          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionText}>Email: {profile?.email}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionText}>Phone: {profile?.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor="#999"
              value={editName}
              onChangeText={setEditName}
            />

            <TextInput
              style={styles.input}
              placeholder="Phone"
              placeholderTextColor="#999"
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio"
              placeholderTextColor="#999"
              value={editBio}
              onChangeText={setEditBio}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleSaveProfile}
              >
                <Text style={styles.modalBtnText}>Save Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackground: {
    height: 120,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e3f2fd',
  },
  avatarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 50,
  },
  profileInfo: {
    padding: 20,
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  profileRole: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '600',
    marginTop: 4,
  },
  profileCompany: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  ratingStars: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffa500',
  },
  ratingCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  profileBio: {
    fontSize: 13,
    color: '#555',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  editBtn: {
    marginHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  editBtnText: {
    color: '#2196f3',
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#212121',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillTag: {
    backgroundColor: '#f3e5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillName: {
    fontSize: 12,
    color: '#7b1fa2',
    fontWeight: '600',
  },
  skillRemove: {
    paddingHorizontal: 4,
  },
  skillRemoveText: {
    fontSize: 16,
    color: '#7b1fa2',
  },
  certCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  certName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  certIssuer: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  certDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  certExpire: {
    fontSize: 11,
    color: '#f44336',
    marginTop: 2,
  },
  certBadge: {
    fontSize: 24,
  },
  portfolioCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  portfolioImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  portfolioContent: {
    padding: 12,
  },
  portfolioTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  portfolioDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  portfolioValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4caf50',
    marginTop: 8,
  },
  accountOption: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
  },
  accountOptionText: {
    fontSize: 14,
    color: '#212121',
  },
  logoutBtn: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#f44336',
    fontWeight: '600',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212121',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    color: '#212121',
  },
  bioInput: {
    textAlignVertical: 'top',
  },
  modalActions: {
    gap: 10,
    marginTop: 16,
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

export default Profile;
