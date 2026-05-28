import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://dealiit.com/api';
// Apne laptop ka IP address aur backend ka port (jo tumne server mein set kiya hai, e.g., 5000)
// const API_URL = 'http://192.168.31.109:5000/api';

export default function TopNavbar({ user }) {
  const navigation = useNavigation();
  const [credits, setCredits] = useState(user?.account_credits || 0);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const token = await AsyncStorage.getItem('dealit_token');
        const headers = { Authorization: `Bearer ${token}` };

        const profileRes = await axios.get(`${API_URL}/users/profile`, { headers });
        if (profileRes.data.success) {
          const freshCredits = profileRes.data.data.account_credits;
          setCredits(freshCredits);
          
          const storedUser = await AsyncStorage.getItem('dealit_user');
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            parsed.account_credits = freshCredits;
            await AsyncStorage.setItem('dealit_user', JSON.stringify(parsed));
          }
        }

        const notifRes = await axios.get(`${API_URL}/notifications?limit=1`, { headers });
        if (notifRes.data.success) {
          setUnreadCount(notifRes.data.unreadCount || 0);
        }
      } catch (error) {
        console.log('Error fetching user data for Navbar:', error);
      }
    };

    fetchUserData();
  }, [user]);

  return (
    <View style={styles.navContainer}>
      {/* Logo Section */}
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.logoContainer}>
        <Image source={require('../../assets/applogo.png')} style={styles.logoIcon} />
        <Text style={styles.logoText}>dealit</Text>
      </TouchableOpacity>

      {/* Right Icons Section */}
      <View style={styles.rightIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('Search')} style={styles.iconBtn}>
          <Ionicons name="search-outline" size={24} color="#4b5563" />
        </TouchableOpacity>

        {user ? (
          <>
            {/* Credits Pill */}
            <TouchableOpacity onPress={() => navigation.navigate('Wallet')} style={styles.creditsPill}>
              <Ionicons name="wallet" size={16} color="#F59E0B" />
              <Text style={styles.creditsText}>{credits}</Text>
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.iconBtn}>
              <Ionicons name="notifications-outline" size={24} color="#4b5563" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('Auth')} style={styles.loginBtn}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6B46C1',
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 6,
    position: 'relative',
  },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 4,
  },
  creditsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  loginBtn: {
    backgroundColor: '#A388E1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});