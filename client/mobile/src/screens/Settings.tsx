import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import axios from 'axios';

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  bidNotifications: boolean;
  messageNotifications: boolean;
  paymentNotifications: boolean;
}

interface ContactRule {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  reason: string;
}

interface SettingsProps {
  baseUrl?: string;
  userToken?: string;
  onNavigate?: (screen?: string) => void;
  onLogout?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
  userToken = '',
  onNavigate,
  onLogout,
}) => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    bidNotifications: true,
    messageNotifications: true,
    paymentNotifications: true,
  });
  const [contactRules, setContactRules] = useState<ContactRule[]>([]);
  const [showContactRuleModal, setShowContactRuleModal] = useState(false);
  const [ruleReason, setRuleReason] = useState('');
  const [ruleDays, setRuleDays] = useState('7');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const headers = { Authorization: `Bearer ${userToken}` };

      const [notificationsRes, contactRes] = await Promise.all([
        axios.get(`${baseUrl}/notifications/preferences`, { headers }),
        axios.get(`${baseUrl}/users/me/contact-rules`, { headers }),
      ]);

      setNotificationSettings(notificationsRes.data);
      setContactRules(contactRes.data.items || []);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleNotificationChange = async (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);

    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      await axios.patch(
        `${baseUrl}/notifications/preferences`,
        updated,
        { headers }
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification settings');
      // Revert on error
      setNotificationSettings(notificationSettings);
    }
  };

  const handleAddContactRule = async () => {
    if (!ruleReason || !ruleDays) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const days = parseInt(ruleDays);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Error', 'Please enter a valid number of days');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      await axios.post(
        `${baseUrl}/users/me/contact-rules`,
        {
          reason: ruleReason,
          startDate,
          endDate,
        },
        { headers }
      );

      Alert.alert('Success', 'Do-not-contact rule added');
      setShowContactRuleModal(false);
      setRuleReason('');
      setRuleDays('7');
      fetchSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to add contact rule');
      console.error(error);
    }
  };

  const handleRemoveContactRule = async (ruleId: string) => {
    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      await axios.delete(`${baseUrl}/users/me/contact-rules/${ruleId}`, { headers });
      fetchSettings();
    } catch (error) {
      Alert.alert('Error', 'Failed to remove contact rule');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Sign Out',
        onPress: () => onLogout?.(),
        style: 'destructive',
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>⚙️ Settings</Text>

        {/* Notification Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Notification Preferences</Text>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive email alerts for bids, messages, and updates
              </Text>
            </View>
            <Switch
              value={notificationSettings.emailNotifications}
              onValueChange={value => handleNotificationChange('emailNotifications', value)}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={notificationSettings.emailNotifications ? '#4caf50' : '#f1f1f1'}
            />
          </View>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>SMS Notifications</Text>
              <Text style={styles.settingDescription}>
                Get text messages for important alerts
              </Text>
            </View>
            <Switch
              value={notificationSettings.smsNotifications}
              onValueChange={value => handleNotificationChange('smsNotifications', value)}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={notificationSettings.smsNotifications ? '#4caf50' : '#f1f1f1'}
            />
          </View>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive app notifications on your device
              </Text>
            </View>
            <Switch
              value={notificationSettings.pushNotifications}
              onValueChange={value => handleNotificationChange('pushNotifications', value)}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={notificationSettings.pushNotifications ? '#4caf50' : '#f1f1f1'}
            />
          </View>

          {/* Category-Specific Toggles */}
          <View style={styles.categorySection}>
            <Text style={styles.categoryLabel}>Notification Categories</Text>

            <View style={styles.categoryItem}>
              <Text style={styles.categoryName}>Bid Notifications</Text>
              <Switch
                value={notificationSettings.bidNotifications}
                onValueChange={value => handleNotificationChange('bidNotifications', value)}
                trackColor={{ false: '#767577', true: '#81c784' }}
                thumbColor={notificationSettings.bidNotifications ? '#4caf50' : '#f1f1f1'}
              />
            </View>

            <View style={styles.categoryItem}>
              <Text style={styles.categoryName}>Messages</Text>
              <Switch
                value={notificationSettings.messageNotifications}
                onValueChange={value => handleNotificationChange('messageNotifications', value)}
                trackColor={{ false: '#767577', true: '#81c784' }}
                thumbColor={notificationSettings.messageNotifications ? '#4caf50' : '#f1f1f1'}
              />
            </View>

            <View style={styles.categoryItem}>
              <Text style={styles.categoryName}>Payment Alerts</Text>
              <Switch
                value={notificationSettings.paymentNotifications}
                onValueChange={value => handleNotificationChange('paymentNotifications', value)}
                trackColor={{ false: '#767577', true: '#81c784' }}
                thumbColor={notificationSettings.paymentNotifications ? '#4caf50' : '#f1f1f1'}
              />
            </View>
          </View>
        </View>

        {/* Do-Not-Contact Rules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚫 Do-Not-Contact Rules</Text>

          {contactRules.length === 0 ? (
            <Text style={styles.emptyText}>No active do-not-contact rules</Text>
          ) : (
            contactRules.map(rule => (
              <View key={rule.id} style={styles.ruleCard}>
                <View>
                  <Text style={styles.ruleReason}>{rule.reason}</Text>
                  <Text style={styles.ruleDate}>
                    Until: {new Date(rule.endDate).toLocaleDateString()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveContactRule(rule.id)}
                  style={styles.removeBtn}
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.addRuleBtn}
            onPress={() => setShowContactRuleModal(true)}
          >
            <Text style={styles.addRuleBtnText}>+ Add Do-Not-Contact Period</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account</Text>

          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionLabel}>Password</Text>
            <Text style={styles.accountOptionValue}>Change Password →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionLabel}>Two-Factor Authentication</Text>
            <Text style={styles.accountOptionValue}>Not Enabled →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.accountOption}>
            <Text style={styles.accountOptionLabel}>Connected Accounts</Text>
            <Text style={styles.accountOptionValue}>Manage →</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ App Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2024.01.15</Text>
          </View>

          <TouchableOpacity style={styles.infoLink}>
            <Text style={styles.infoLinkText}>View Changelog</Text>
          </TouchableOpacity>
        </View>

        {/* Help & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Help & Legal</Text>

          <TouchableOpacity style={styles.linkOption}>
            <Text style={styles.linkText}>Help Center</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkOption}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkOption}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkOption}>
            <Text style={styles.linkText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Contact Rule Modal */}
      <Modal
        visible={showContactRuleModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactRuleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Do-Not-Contact Period</Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Reason</Text>
              <TextInput
                style={styles.input}
                placeholder="Why do you want to be unavailable?"
                placeholderTextColor="#999"
                value={ruleReason}
                onChangeText={setRuleReason}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Duration (days)</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of days"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                value={ruleDays}
                onChangeText={setRuleDays}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleAddContactRule}
              >
                <Text style={styles.modalBtnText}>Add Rule</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setShowContactRuleModal(false)}
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
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#212121',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#212121',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  categorySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 12,
  },
  categoryName: {
    fontSize: 13,
    color: '#212121',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  ruleCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  ruleReason: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  ruleDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  removeBtn: {
    paddingHorizontal: 8,
  },
  removeBtnText: {
    color: '#f44336',
    fontWeight: '600',
    fontSize: 12,
  },
  addRuleBtn: {
    borderWidth: 2,
    borderColor: '#2196f3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addRuleBtnText: {
    color: '#2196f3',
    fontWeight: '600',
  },
  accountOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  accountOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  accountOptionValue: {
    fontSize: 13,
    color: '#2196f3',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  infoLink: {
    paddingVertical: 10,
  },
  infoLinkText: {
    color: '#2196f3',
    fontWeight: '600',
    fontSize: 13,
  },
  linkOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  linkText: {
    color: '#2196f3',
    fontWeight: '500',
    fontSize: 14,
  },
  logoutBtn: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  logoutBtnText: {
    color: '#f44336',
    fontWeight: '600',
    fontSize: 16,
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

export default Settings;
