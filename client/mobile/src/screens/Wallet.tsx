import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import axios from 'axios';

interface WalletBalance {
  available: number;
  pending: number;
  total: number;
}

interface Transaction {
  id: string;
  type: 'PAYMENT' | 'WITHDRAWAL' | 'REFUND' | 'DEPOSIT';
  amount: number;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  date: Date;
  reference: string;
}

interface WithdrawalMethod {
  id: string;
  type: 'ACH' | 'WIRE' | 'DIRECT_DEPOSIT' | 'USDC';
  name: string;
  isDefault: boolean;
  lastFour?: string;
}

interface WalletProps {
  baseUrl?: string;
  userToken?: string;
  onNavigate?: (screen: string) => void;
}

const Wallet: React.FC<WalletProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
  userToken = '',
  onNavigate,
}) => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchWalletData();
  }, [page]);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${userToken}` };

      const [balanceRes, transactionsRes, methodsRes] = await Promise.all([
        axios.get(`${baseUrl}/payments/wallet/balance`, { headers }),
        axios.get(`${baseUrl}/payments/transactions?skip=${(page - 1) * 20}&take=20`, {
          headers,
        }),
        axios.get(`${baseUrl}/payments/withdrawal-methods`, { headers }),
      ]);

      setBalance(balanceRes.data);
      setTransactions(transactionsRes.data.items || []);
      setWithdrawalMethods(methodsRes.data.items || []);
      if (methodsRes.data.items?.length > 0) {
        setSelectedMethod(methodsRes.data.items[0].id);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !selectedMethod) {
      Alert.alert('Error', 'Please enter amount and select method');
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    if (amount > (balance?.available || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${userToken}` };
      await axios.post(
        `${baseUrl}/payments/withdraw`,
        {
          amount,
          withdrawalMethodId: selectedMethod,
        },
        { headers }
      );

      Alert.alert('Success', 'Withdrawal request submitted');
      setWithdrawalModalVisible(false);
      setWithdrawalAmount('');
      fetchWalletData();
    } catch (error) {
      Alert.alert('Error', 'Failed to process withdrawal');
      console.error(error);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
        return '💸';
      case 'WITHDRAWAL':
        return '🏧';
      case 'REFUND':
        return '♻️';
      case 'DEPOSIT':
        return '💰';
      default:
        return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#4caf50';
      case 'PENDING':
        return '#ff9800';
      case 'FAILED':
        return '#f44336';
      default:
        return '#666';
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
        {/* Header */}
        <Text style={styles.header}>💰 Wallet</Text>

        {/* Balance Cards */}
        {balance && (
          <View style={styles.balanceContainer}>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>${balance.available.toLocaleString()}</Text>
            </View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text style={styles.pendingAmount}>${balance.pending.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={() => setWithdrawalModalVisible(true)}
          >
            <Text style={styles.actionBtnText}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]}>
            <Text style={styles.actionBtnSecondaryText}>Request Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* Withdrawal Methods */}
        {withdrawalMethods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Saved Methods</Text>
            {withdrawalMethods.map(method => (
              <View key={method.id} style={styles.methodCard}>
                <View>
                  <Text style={styles.methodType}>
                    {method.type === 'ACH' && 'ACH Transfer'}
                    {method.type === 'WIRE' && 'Wire Transfer'}
                    {method.type === 'DIRECT_DEPOSIT' && 'Direct Deposit'}
                    {method.type === 'USDC' && 'USDC Wallet'}
                  </Text>
                  {method.lastFour && (
                    <Text style={styles.methodDetails}>
                      •••• {method.lastFour}
                    </Text>
                  )}
                </View>
                {method.isDefault && (
                  <Text style={styles.defaultBadge}>Default</Text>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addMethodBtn}>
              <Text style={styles.addMethodText}>+ Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Transaction History</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyMessage}>No transactions yet</Text>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.transactionCard}>
                <View style={styles.txLeft}>
                  <Text style={styles.txIcon}>{getTransactionIcon(tx.type)}</Text>
                  <View>
                    <Text style={styles.txDescription}>{tx.description}</Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.date).toLocaleDateString()} · {tx.reference}
                    </Text>
                  </View>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      {
                        color:
                          tx.type === 'PAYMENT' || tx.type === 'WITHDRAWAL'
                            ? '#f44336'
                            : '#4caf50',
                      },
                    ]}
                  >
                    {tx.type === 'PAYMENT' || tx.type === 'WITHDRAWAL' ? '-' : '+'}$
                    {tx.amount.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.txStatus,
                      { color: getStatusColor(tx.status) },
                    ]}
                  >
                    {tx.status}
                  </Text>
                </View>
              </View>
            ))
          )}
          {transactions.length > 0 && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setPage(page + 1)}
            >
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={withdrawalModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWithdrawalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Funds</Text>

            <View style={styles.modalBalance}>
              <Text style={styles.modalBalanceLabel}>Available Balance</Text>
              <Text style={styles.modalBalanceAmount}>
                ${balance?.available.toLocaleString()}
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={withdrawalAmount}
              onChangeText={setWithdrawalAmount}
            />

            <View style={styles.methodSelector}>
              <Text style={styles.methodSelectorLabel}>Withdrawal Method</Text>
              {withdrawalMethods.map(method => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.methodOption,
                    selectedMethod === method.id && styles.methodOptionSelected,
                  ]}
                  onPress={() => setSelectedMethod(method.id)}
                >
                  <View style={styles.methodOptionRadio}>
                    {selectedMethod === method.id && (
                      <View style={styles.methodOptionRadioDot} />
                    )}
                  </View>
                  <Text style={styles.methodOptionText}>
                    {method.type === 'ACH' && 'ACH Transfer'}
                    {method.type === 'WIRE' && 'Wire Transfer'}
                    {method.type === 'DIRECT_DEPOSIT' && 'Direct Deposit'}
                    {method.type === 'USDC' && 'USDC Wallet'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={handleWithdrawal}
              >
                <Text style={styles.modalBtnText}>Confirm Withdrawal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => setWithdrawalModalVisible(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#212121',
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: '#2196f3',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  balanceLabel: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  pendingAmount: {
    color: '#ffc107',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
    color: '#ffffff',
    fontWeight: '600',
  },
  actionBtnSecondaryText: {
    color: '#2196f3',
    fontWeight: '600',
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
  methodCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  methodDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  defaultBadge: {
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  addMethodBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2196f3',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addMethodText: {
    color: '#2196f3',
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  transactionCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  txDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
  },
  txDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  txRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  txStatus: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  loadMoreBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#2196f3',
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
  modalBalance: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalBalanceLabel: {
    fontSize: 12,
    color: '#666',
  },
  modalBalanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196f3',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#212121',
  },
  methodSelector: {
    marginBottom: 20,
  },
  methodSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#212121',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  methodOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  methodOptionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2196f3',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodOptionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196f3',
  },
  methodOptionText: {
    fontSize: 14,
    color: '#212121',
  },
  modalActions: {
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 14,
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
    fontSize: 16,
  },
  modalBtnSecondaryText: {
    color: '#212121',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default Wallet;
