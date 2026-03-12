import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Home from './Home';
import Wallet from './Wallet';
import Profile from './Profile';
import Bids from './Bids';
import Settings from './Settings';

interface NavigationProps {
  baseUrl?: string;
  userToken?: string;
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({
  baseUrl = 'http://localhost:3000/api/v1',
  userToken = '',
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'Home' | 'Bids' | 'Wallet' | 'Profile' | 'Settings'>(
    'Home'
  );
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const renderScreen = () => {
    const commonProps = {
      baseUrl,
      userToken,
      onNavigate: (screen: string) => {
        setActiveTab(screen as any);
      },
    };

    switch (activeTab) {
      case 'Home':
        return <Home {...commonProps} />;
      case 'Bids':
        return <Bids {...commonProps} />;
      case 'Wallet':
        return <Wallet {...commonProps} />;
      case 'Profile':
        return <Profile {...commonProps} />;
      case 'Settings':
        return <Settings {...commonProps} onLogout={onLogout} />;
      default:
        return <Home {...commonProps} />;
    }
  };

  const TabButton = ({
    tab,
    icon,
    label,
    badge,
  }: {
    tab: string;
    icon: string;
    label: string;
    badge?: number;
  }) => {
    const isActive = activeTab === tab;

    return (
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => setActiveTab(tab as any)}
      >
        <View style={styles.tabIconContainer}>
          <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>
            {icon}
          </Text>
          {badge !== undefined && badge > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
          )}
        </View>
        <Text
          style={[
            styles.tabLabel,
            isActive && styles.tabLabelActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.navigationBar}>
        <TabButton tab="Home" icon="🏠" label="Home" />
        <TabButton tab="Bids" icon="🎯" label="Bids" />
        <TabButton tab="Wallet" icon="💰" label="Wallet" />
        <TabButton tab="Profile" icon="👤" label="Profile" />
        <TabButton tab="Settings" icon="⚙️" label="Settings" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenContainer: {
    flex: 1,
  },
  navigationBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconActive: {
    opacity: 1,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#2196f3',
    fontWeight: '600',
  },
});

export default Navigation;
