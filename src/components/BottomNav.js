import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://dealiit.com/api';
// const API_URL = 'http://192.168.31.109:5000/api';

export default function BottomNav({ user }) {
  const navigation = useNavigation();
  const route = useRoute();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    const fetchUnreadCount = async () => {
      try {
        const token = await AsyncStorage.getItem('dealit_token');
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.get(`${API_URL}/notifications?limit=1`, { headers });
        if (response.data.success) {
          setUnreadCount(response.data.unreadCount || 0);
        }
      } catch (error) {
        console.log("Failed to fetch notification count", error);
      }
    };

    fetchUnreadCount();
  }, [route.name, user]);

  const isActive = (screenName) => route.name === screenName;

  const navigateTo = (screenName) => {
    if (!user && screenName !== 'Home') {
      navigation.navigate('Auth');
    } else {
      navigation.navigate(screenName);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.navContent}>
        
        {/* 1. Home */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('Home')}>
          <Ionicons 
            name={isActive('Home') ? 'home' : 'home-outline'} 
            size={24} 
            color={isActive('Home') ? '#6B46C1' : '#9ca3af'} 
          />
          <Text style={[styles.navText, isActive('Home') && styles.activeText]}>Home</Text>
        </TouchableOpacity>

        {/* 2. Earn / Wallet */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('Wallet')}>
          <Ionicons 
            name={isActive('Wallet') ? 'wallet' : 'wallet-outline'} 
            size={24} 
            color={isActive('Wallet') ? '#EAB308' : '#9ca3af'} 
          />
          <Text style={[styles.navText, isActive('Wallet') && { color: '#EAB308' }]}>Earn</Text>
        </TouchableOpacity>

        {/* 3. Floating Add Button (Center) */}
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity 
            style={styles.floatingButton} 
            activeOpacity={0.9}
            onPress={() => navigateTo('AddItem')}
          >
            <Ionicons name="add" size={32} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* 4. Notifications */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('Notifications')}>
          <View style={styles.iconWrapper}>
            <Ionicons 
              name={isActive('Notifications') ? 'notifications' : 'notifications-outline'} 
              size={24} 
              color={isActive('Notifications') ? '#6B46C1' : '#9ca3af'} 
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.navText, isActive('Notifications') && styles.activeText]}>Alerts</Text>
        </TouchableOpacity>

        {/* 5. Profile */}
        <TouchableOpacity style={styles.navItem} onPress={() => navigateTo('Profile')}>
          <Ionicons 
            name={isActive('Profile') ? 'person' : 'person-outline'} 
            size={24} 
            color={isActive('Profile') ? '#6B46C1' : '#9ca3af'} 
          />
          <Text style={[styles.navText, isActive('Profile') && styles.activeText]}>Profile</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 8,
    paddingHorizontal: 16,
    zIndex: 50,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 15 },
    }),
  },
  navContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    position: 'relative',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    gap: 4,
  },
  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
  },
  activeText: {
    color: '#6B46C1',
  },
  floatingButtonContainer: {
    position: 'relative',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    width: 56,
    height: 56,
    backgroundColor: '#6B46C1',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    ...Platform.select({
      ios: { shadowColor: '#6B46C1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  iconWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  }
});