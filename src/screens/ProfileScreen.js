import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, 
  Dimensions, Animated, Platform, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import * as ImagePicker from 'expo-image-picker';
import BottomNav from '../components/BottomNav';

const { width, height } = Dimensions.get('window');


const API_URL = 'https://dealiit.com/api';
// const API_URL = 'http://192.168.31.109:5000/api';
const CLOUDINARY_CLOUD_NAME = 'your_cloudinary_name_here'; // Replace with your env variable equivalent
const CLOUDINARY_UPLOAD_PRESET = 'your_preset_here';

const Sk = ({ w = '100%', h = 16, style = {}, borderRadius = 12 }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View 
      style={[
        { width: w, height: h, backgroundColor: '#e5e7eb', borderRadius, opacity: pulseAnim }, 
        style
      ]} 
    />
  );
};

export default function ProfileScreen({ user, setUser, onLogout }) {
  const navigation = useNavigation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    city: '',
    pickupAddress: {
      houseNo: '',
      areaStreet: '',
      landmark: '',
      city: '',
      state: '',
      pincode: ''
    }
  });

  const queryClient = useQueryClient();

  // ── Queries ──
  const { data: profileData, isLoading: loading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('dealit_token');
      const res = await axios.get(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data;
    }
  });

  const { data: userStats } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('dealit_token');
      const res = await axios.get(`${API_URL}/users/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (profileData && setUser) {
      setUser(profileData);
      AsyncStorage.setItem('dealit_user', JSON.stringify(profileData));
    }
  }, [profileData, setUser]);

  // ── Image Upload — optimistic preview ──
  // --- CHANGES MADE HERE: Adapted for React Native file structures ---
  const uploadImageMutation = useMutation({
    mutationFn: async (imageUri) => {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      
      formData.append('file', { uri: imageUri, name: filename, type });
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      const uploadedUrl = cloudRes.data.secure_url;

      const token = await AsyncStorage.getItem('dealit_token');
      const res = await axios.put(
        `${API_URL}/users/profile-pic`,
        { profilePic: uploadedUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profile']);
      setLocalPreview(null);
      Alert.alert("Success", "Profile photo updated!");
    },
    onError: (err) => {
      setLocalPreview(null);
      Alert.alert("Error", "Photo upload failed. Please try again.");
      console.log(err);
    },
  });

  const handleImageUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setLocalPreview(uri);
      uploadImageMutation.mutate(uri);
    }
  };

  const openEditModal = () => {
    setEditForm({
      full_name: profileData?.full_name || '',
      phone: profileData?.phone || '',
      city: profileData?.city || '',
      pickupAddress: {
        houseNo:    profileData?.pickupAddress?.houseNo    || '',
        areaStreet: profileData?.pickupAddress?.areaStreet || '',
        landmark:   profileData?.pickupAddress?.landmark   || '',
        city:       profileData?.pickupAddress?.city       || '',
        state:      profileData?.pickupAddress?.state      || '',
        pincode:    profileData?.pickupAddress?.pincode    || '',
      }
    });
    setIsEditModalOpen(true);
  };

  const editProfileMutation = useMutation({
    mutationFn: async (data) => {
      const token = await AsyncStorage.getItem('dealit_token');
      return axios.put(`${API_URL}/users/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries(['profile']);
      setIsEditModalOpen(false);
      Alert.alert("Success", "Profile saved successfully!");
      try {
        const token = await AsyncStorage.getItem('dealit_token');
        const res = await axios.get(`${API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success && setUser) {
          setUser(res.data.data);
          AsyncStorage.setItem('dealit_user', JSON.stringify(res.data.data));
        }
      } catch (e) {
        console.log('Failed to sync global user state', e);
      }
    },
    onError: () => Alert.alert("Error", "Failed to save profile. Please try again."),
  });

  const handleEditSubmit = () => {
    if (editForm.pickupAddress.houseNo && !/\d/.test(editForm.pickupAddress.houseNo)) {
      Alert.alert("Invalid Input", "House No. must include at least one number (e.g., Flat 4B)");
      return;
    }
    editProfileMutation.mutate(editForm);
  };

  if (!user && !loading) {
    navigation.navigate('Auth');
    return null;
  }

  // ── Derived stats ──
  const swapsBadge = userStats?.swapsActive > 0 ? `${userStats.swapsActive} Active` : null;
  let swapsSubtitle = 'Your Trade Offers';
  if (userStats?.receivedSwaps > 0 || userStats?.sentSwaps > 0) {
    const parts = [
      userStats.receivedSwaps > 0 ? `${userStats.receivedSwaps} Received` : '',
      userStats.sentSwaps      > 0 ? `${userStats.sentSwaps} Sent`        : '',
    ].filter(Boolean);
    swapsSubtitle = parts.join(' · ');
  }
  const ordersBadge = userStats?.activeOrders > 0 ? `${userStats.activeOrders} Active` : null;

  // ── Menu config ──
  const menuGroups = [
    {
      title: 'My Activity',
      items: [
        { to: 'Dashboard',   icon: 'list-outline',   title: 'My Listings', subtitle: 'Manage your items',      badge: 'Active',      color: '#f3f0ff', iconColor: '#6B46C1' },
        { to: 'Orders',      icon: 'bag-outline',    title: 'My Orders',   subtitle: 'Past transactions',      badge: ordersBadge,   color: '#f3f0ff', iconColor: '#6B46C1' },
        { to: 'Swaps',       icon: 'swap-horizontal',title: 'My Swaps',    subtitle: swapsSubtitle,            badge: swapsBadge,    color: '#f3f0ff', iconColor: '#6B46C1' },
        { to: 'Wishlist',    icon: 'heart-outline',  title: 'Wishlist',    subtitle: 'Saved Items',                                  color: '#f3f0ff', iconColor: '#6B46C1' },
      ]
    },
    {
      title: 'Rewards & Payments',
      items: [
        { to: 'Offers',      icon: 'trophy-outline', title: 'Play & Earn', subtitle: 'Complete events',        color: '#f3f0ff', iconColor: '#6B46C1' },
        { to: 'Wallet',      icon: 'wallet-outline', title: 'My Wallet',   subtitle: 'Credits & Purchases',    color: '#f3f0ff', iconColor: '#6B46C1' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { to: 'Notifications',icon: 'notifications-outline', title: 'Notifications', subtitle: 'Alert Settings', color: '#f3f0ff', iconColor: '#6B46C1' },
        { to: 'HelpSupport', icon: 'headset-outline',title: 'Help & Support', subtitle: 'Get Assistance',     color: '#f3f0ff', iconColor: '#6B46C1' },
      ]
    }
  ];

  const avatarSrc = localPreview || profileData?.profilePic;

  const headerBg = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: ['rgba(107, 70, 193, 0)', 'rgba(107, 70, 193, 0.96)']
  });

  return (
    <View style={styles.container}>
      
      <LinearGradient colors={['#6B46C1', '#7c52d6', 'transparent']} style={styles.bgGradientTop} />

      <Animated.View style={[styles.header, { backgroundColor: headerBg }]}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          onPress={() => {
            AsyncStorage.removeItem('dealit_token');
            AsyncStorage.removeItem('dealit_user');
            if (onLogout) onLogout();
            navigation.navigate('Auth');
          }} 
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={16} color="#ffffff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 100, paddingBottom: 100 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        <View style={styles.contentContainer}>
          
          {/* ── Shimmer skeleton ── */}
          {loading ? (
            <View style={styles.skeletonContainer}>
              <View style={styles.skeletonCard}>
                <Sk w={96} h={96} borderRadius={48} style={{ marginBottom: 16 }} />
                <Sk w={160} h={22} style={{ marginBottom: 10 }} />
                <Sk w={200} h={15} style={{ marginBottom: 24 }} />
                <Sk w={120} h={36} borderRadius={100} style={{ marginBottom: 24 }} />
                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                  <Sk style={{ flex: 1, height: 68 }} />
                  <Sk style={{ flex: 1, height: 68 }} />
                </View>
              </View>
              <Sk h={56} style={{ marginTop: 24, borderRadius: 18 }} />
              <Sk h={220} style={{ marginTop: 24, borderRadius: 18 }} />
            </View>
          ) : (
            <View>
              {/* ── Profile card ── */}
              <View style={styles.profileCard}>
                
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarRing}>
                    <View style={styles.avatarInner}>
                      {uploadImageMutation.isPending && (
                        <View style={styles.avatarLoadingOverlay}>
                          <ActivityIndicator color="#6B46C1" size="large" />
                        </View>
                      )}
                      {avatarSrc ? (
                        <Image source={{ uri: avatarSrc }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="person" size={40} color="#d1d5db" />
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={handleImageUpload} style={styles.cameraBtn} disabled={uploadImageMutation.isPending}>
                    <Ionicons name="camera" size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.userName}>{profileData?.full_name}</Text>
                <Text style={styles.userEmail}>{profileData?.email}</Text>

                <TouchableOpacity onPress={openEditModal} style={styles.editBtn}>
                  <Ionicons name="create-outline" size={16} color="#374151" />
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>

                {/* Stats row */}
                <View style={styles.statsRow}>
                  {/* Credits */}
                  <View style={styles.statBox}>
                    <View style={[styles.statIconWrapper, { borderColor: '#FFF7A1' }]}>
                      <LinearGradient colors={['#FFE770', '#F5C341', '#D97706']} style={styles.statIconGradient}>
                        <Text style={styles.creditIconText}>C</Text>
                      </LinearGradient>
                    </View>
                    <View style={styles.statTexts}>
                      <Text style={styles.statLabel}>Credits</Text>
                      <Text style={styles.statValue}>{profileData?.account_credits ?? 0}</Text>
                    </View>
                  </View>
                  {/* Aura */}
                  <View style={styles.statBox}>
                    <View style={[styles.statIconWrapper, { borderColor: '#F3E8FF' }]}>
                      <LinearGradient colors={['#D8B4FE', '#A855F7', '#7E22CE']} style={styles.statIconGradient}>
                        <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
                      </LinearGradient>
                    </View>
                    <View style={styles.statTexts}>
                      <Text style={styles.statLabel}>Aura</Text>
                      <Text style={styles.statValue}>{profileData?.aura_points ?? 0}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Aura CTA */}
              <TouchableOpacity style={styles.auraCta} onPress={() => navigation.navigate('Aura')}>
                <LinearGradient colors={['#8b5cf6', '#6B46C1']} style={styles.auraCtaGradient}>
                  <View style={styles.auraCtaLeft}>
                    <View style={styles.auraCtaIcon}>
                      <Ionicons name="star" size={24} color="#ffffff" />
                    </View>
                    <View>
                      <Text style={styles.auraCtaTitle}>Level Up Your Aura</Text>
                      <Text style={styles.auraCtaSub}>Build trust to get better deals.</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
                </LinearGradient>
              </TouchableOpacity>

              {/* ── Menu groups ── */}
              {menuGroups.map((group, gIdx) => (
                <View key={gIdx} style={styles.menuGroup}>
                  <Text style={styles.menuGroupTitle}>{group.title}</Text>
                  <View style={styles.menuGroupCard}>
                    {group.items.map((item, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={[styles.menuItem, idx !== group.items.length - 1 && styles.menuItemBorder]}
                        onPress={() => navigation.navigate(item.to)}
                      >
                        <View style={styles.menuItemLeft}>
                          <View style={[styles.menuItemIcon, { backgroundColor: item.color }]}>
                            <Ionicons name={item.icon} size={18} color={item.iconColor} />
                          </View>
                          <View>
                            <View style={styles.menuItemTitleRow}>
                              <Text style={styles.menuItemTitle}>{item.title}</Text>
                              {item.badge && (
                                <View style={styles.badge}>
                                  <Text style={styles.badgeText}>{item.badge}</Text>
                                </View>
                              )}
                            </View>
                            {item.subtitle && <Text style={styles.menuItemSub}>{item.subtitle}</Text>}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              {/* Delete account */}
              <View style={[styles.menuGroupCard, { marginTop: 20 }]}>
                <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('DeleteAccount')}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuItemIcon, { backgroundColor: '#fef2f2' }]}>
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </View>
                    <View>
                      <Text style={[styles.menuItemTitle, { color: '#ef4444' }]}>Delete Account</Text>
                      <Text style={styles.menuItemSub}>Permanently remove your data</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                </TouchableOpacity>
              </View>

            </View>
          )}

        </View>
      </Animated.ScrollView>

      {/* ── Edit Profile Bottom Sheet ── */}
      <Modal visible={isEditModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsEditModalOpen(false)} />
          
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              
              <Text style={styles.formSectionTitle}>BASIC INFORMATION</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={editForm.full_name}
                  onChangeText={(val) => setEditForm({ ...editForm, full_name: val })}
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                  value={editForm.phone}
                  onChangeText={(val) => setEditForm({ ...editForm, phone: val })}
                />
              </View>

              <View style={styles.formSectionHeader}>
                <Text style={styles.formSectionTitle}>PICKUP ADDRESS</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Seller Required</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="home-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="House No. / Flat No."
                  value={editForm.pickupAddress.houseNo}
                  onChangeText={(val) => setEditForm({ ...editForm, pickupAddress: { ...editForm.pickupAddress, houseNo: val } })}
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Area, Street, Sector"
                  value={editForm.pickupAddress.areaStreet}
                  onChangeText={(val) => setEditForm({ ...editForm, pickupAddress: { ...editForm.pickupAddress, areaStreet: val } })}
                />
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={18} color="#d1d5db" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Landmark (Optional)"
                  value={editForm.pickupAddress.landmark}
                  onChangeText={(val) => setEditForm({ ...editForm, pickupAddress: { ...editForm.pickupAddress, landmark: val } })}
                />
              </View>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="City"
                  value={editForm.pickupAddress.city}
                  onChangeText={(val) => setEditForm({ ...editForm, city: val, pickupAddress: { ...editForm.pickupAddress, city: val } })}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="State"
                  value={editForm.pickupAddress.state}
                  onChangeText={(val) => setEditForm({ ...editForm, pickupAddress: { ...editForm.pickupAddress, state: val } })}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="pricetag-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { letterSpacing: 2 }]}
                  placeholder="Pincode (6 Digits)"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={editForm.pickupAddress.pincode}
                  onChangeText={(val) => setEditForm({ ...editForm, pickupAddress: { ...editForm.pickupAddress, pincode: val } })}
                />
              </View>

            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleEditSubmit} 
                disabled={editProfileMutation.isPending}
                style={[styles.saveBtn, editProfileMutation.isPending && styles.saveBtnDisabled]}
              >
                {editProfileMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomNav user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  bgGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    gap: 20,
  },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 20 },
      android: { elevation: 3 },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    backgroundColor: '#e9e3ff', 
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6B46C1',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#ffffff',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13.5,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 100,
    gap: 8,
    marginBottom: 24,
  },
  editBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 2,
  },
  statIconGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditIconText: {
    color: '#87590C',
    fontWeight: '900',
    fontSize: 16,
  },
  statTexts: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
  },
  auraCta: {
    marginTop: 16,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  auraCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  auraCtaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  auraCtaIcon: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
  },
  auraCtaTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  auraCtaSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  menuGroup: {
    marginTop: 24,
  },
  menuGroupTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 16,
  },
  menuGroupCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#f9fafb',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemIcon: {
    padding: 10,
    borderRadius: 12,
  },
  menuItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    backgroundColor: '#f3f0ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  badgeText: {
    color: '#6B46C1',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  menuItemSub: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginTop: 2,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalCloseBtn: {
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 20,
  },
  modalForm: {
    padding: 20,
    paddingBottom: 40,
  },
  formSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  formSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6B46C1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  requiredBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 100,
  },
  requiredBadgeText: {
    color: '#b45309',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#4b5563',
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#6B46C1',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#A388E1',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});