import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, 
  Dimensions, Animated, FlatList, Platform, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TopNavbar from '../components/TopNavbar';

import ProductCard from '../components/ProductCard';
import BottomNav from '../components/BottomNav';
import CoinCelebration from '../components/CoinCelebration';

const { width } = Dimensions.get('window');
const API_URL = 'https://dealiit.com/api';
// const API_URL = 'http://192.168.31.109:5000/api';

const ICON_DICTIONARY = {
  'Package': 'cube-outline',
  'Smartphone': 'phone-portrait-outline',
  'Shirt': 'shirt-outline',
  'Watch': 'watch-outline',
  'Home': 'home-outline',
  'Gamepad2': 'game-controller-outline',
  'Car': 'car-sport-outline',
  'Monitor': 'desktop-outline',
  'Book': 'book-outline',
};

export default function HomeScreen({ navigation, user, setUser }) {
  const [activeCategory, setActiveCategory] = useState('All');
  

  const [showCelebration, setShowCelebration] = useState(false);
  const coinScale = useRef(new Animated.Value(1)).current;
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/categories?activeOnly=true&hasItems=true`);
      return res.data.data;
    },
  });
  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['items', activeCategory],
    queryFn: async () => {
      const url = activeCategory === 'All' 
        ? `${API_URL}/items?limit=10` 
        : `${API_URL}/items?category=${activeCategory}&limit=10`;
      const res = await axios.get(url);
      return res.data.data;
    },
  });

  const { data: offers = [] } = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/offers`);
      return res.data.data.filter(offer => offer.isActive);
    },
  });

  const handleClaimBonus = async () => {
    try {
      const token = await AsyncStorage.getItem('dealit_token');
      const res = await axios.post(`${API_URL}/users/claim-bonus`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success && setUser) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3500);
        Animated.sequence([
          Animated.timing(coinScale, { toValue: 1.5, duration: 200, useNativeDriver: true }),
          Animated.spring(coinScale, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();

        setUser(prev => ({
          ...prev,
          account_credits: res.data.data.account_credits,
          hasClaimedWelcomeBonus: true
        }));
      }
    } catch (error) {
      console.log('Error claiming bonus', error);
    }
  };

  const shouldShowClaimButton = user && !user.hasClaimedWelcomeBonus;

  const renderCategory = ({ item }) => {
    const isActive = activeCategory === item.name;
    const iconName = ICON_DICTIONARY[item.icon] || 'cube-outline';

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => setActiveCategory(item.name)}
        style={[styles.categoryPill, isActive && styles.categoryPillActive]}
      >
        {isActive ? (
          <LinearGradient colors={['#805ad5', '#A388E1']} style={StyleSheet.absoluteFillObject} borderRadius={20} />
        ) : null}
        <Ionicons name={iconName} size={16} color={isActive ? '#ffffff' : '#6b7280'} style={{ zIndex: 1 }} />
        <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TopNavbar user={user} />
      {showCelebration && <CoinCelebration coinCount={30} />}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.heroGrid}>
          <View style={styles.heroMain}>
            <LinearGradient colors={['#fdfbfb', '#ebedee']} style={StyleSheet.absoluteFillObject} borderRadius={20} />
            <Text style={styles.heroTitle}>Sell what you don't use</Text>
            <Text style={styles.heroTitleHighlight}>Get what you actually want</Text>
            <Text style={styles.heroSubtitle}>Sell your stuff → Earn credits → Buy anything.</Text>
          </View>
          <View style={styles.heroSide}>
            {user ? (
              <LinearGradient colors={['#A388E1', '#6b46c1']} style={styles.walletCard}>
                <Text style={styles.walletRate}>₹1 = 1 Cr</Text>
                <View style={styles.walletInfo}>
                  <Animated.View style={{ transform: [{ scale: coinScale }] }}>
                    <View style={styles.coin}>
                      <Text style={styles.coinText}>Cr</Text>
                    </View>
                  </Animated.View>
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.walletBalance}>{user.account_credits}</Text>
                    <Text style={styles.walletLabel}>credits</Text>
                  </View>
                </View>
                {shouldShowClaimButton ? (
                  <TouchableOpacity onPress={handleClaimBonus} style={styles.claimBtn}>
                    <Text style={styles.claimBtnText}>Claim Bonus</Text>
                    <Ionicons name="gift" size={14} color="#78350F" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => navigation.navigate('Wallet')} style={styles.earnBtn}>
                    <Text style={styles.earnBtnText}>Earn More</Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            ) : (
              <LinearGradient colors={['#1f2937', '#111827']} style={styles.walletCard}>
                <Ionicons name="person-circle-outline" size={32} color="#9ca3af" />
                <Text style={styles.joinText}>Join Community</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Auth')} style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>Login / Sign Up</Text>
                </TouchableOpacity>
              </LinearGradient>
            )}
          </View>
        </View>
        {offers.length > 0 && (
          <FlatList
            data={offers}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.85 + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.offerList}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.9} style={styles.offerCard}>
                <Image source={{ uri: item.mobileImage }} style={styles.offerImage} />
              </TouchableOpacity>
            )}
          />
        )}
        <View style={styles.sectionContainer}>
          <FlatList
            data={[{ _id: 'all', name: 'All', icon: 'Package' }, ...categories]}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            keyExtractor={(item) => item._id}
            renderItem={renderCategory}
          />
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{activeCategory === 'All' ? 'Popular Items' : `Top in ${activeCategory}`}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Items')}>
            <Text style={styles.seeAllText}>See All <Ionicons name="chevron-forward" size={12} /></Text>
          </TouchableOpacity>
        </View>

        {loadingItems ? (
          <ActivityIndicator size="large" color="#A388E1" style={{ marginTop: 20 }} />
        ) : items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No items right now.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={150 + 16}
            decelerationRate="fast"
            contentContainerStyle={styles.itemsList}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <ProductCard 
                item={item} 
                onPress={(id) => navigation.navigate('ItemDetail', { itemId: id })} 
              />
            )}
          />
        )}

  
        <View style={styles.ctaContainer}>
          <LinearGradient colors={['#F8F6FF', '#EBE5F7']} style={styles.ctaCard}>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Got unused items?</Text>
              <Text style={styles.ctaSubtitle}>List items you no longer need and earn instant credits!</Text>
              <TouchableOpacity 
                style={styles.ctaBtn} 
                onPress={() => navigation.navigate(user ? 'AddItem' : 'Auth')}
              >
                <Ionicons name="add" size={16} color="#78350F" />
                <Text style={styles.ctaBtnText}>List an Item</Text>
              </TouchableOpacity>
            </View>
            <Ionicons name="cube" size={80} color="#A388E1" style={styles.ctaIcon} opacity={0.2} />
          </LinearGradient>
        </View>

      </ScrollView>

      <BottomNav user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9fc',
  },
  heroGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  heroMain: {
    flex: 5,
    padding: 16,
    borderRadius: 20,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  heroTitleHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#805ad5',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  heroSide: {
    flex: 3,
  },
  walletCard: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#6b46c1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 5 },
    }),
  },
  walletRate: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  coin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDE68A',
    borderWidth: 2,
    borderColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
  },
  walletBalance: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 22,
  },
  walletLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  claimBtn: {
    backgroundColor: '#FDE68A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
  },
  claimBtnText: {
    color: '#78350F',
    fontSize: 11,
    fontWeight: '800',
  },
  earnBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: 8,
  },
  earnBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  joinText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
  },
  joinBtn: {
    backgroundColor: '#A388E1',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  offerList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
  offerCard: {
    width: width * 0.85,
    aspectRatio: 5/2,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  offerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  categoryPillActive: {
    borderColor: 'transparent',
    borderWidth: 0,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    zIndex: 1,
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A388E1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBE5F7',
    overflow: 'hidden',
  },
  itemsList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  ctaContainer: {
    padding: 16,
    marginTop: 10,
  },
  ctaCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#A388E1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  ctaContent: {
    flex: 1,
    zIndex: 10,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6B46C1',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
    marginBottom: 16,
    paddingRight: 20,
  },
  ctaBtn: {
    backgroundColor: '#FDE68A',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  ctaBtnText: {
    color: '#78350F',
    fontSize: 13,
    fontWeight: '800',
  },
  ctaIcon: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    transform: [{ rotate: '-15deg' }],
  }
});