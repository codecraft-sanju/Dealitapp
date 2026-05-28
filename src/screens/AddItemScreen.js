import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, 
  StyleSheet, Platform, ActivityIndicator, KeyboardAvoidingView, Modal, Alert, Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://dealiit.com/api';
// const API_URL = 'http://192.168.31.109:5000/api';
const CLOUDINARY_CLOUD_NAME = 'your_cloudinary_name_here';
const CLOUDINARY_UPLOAD_PRESET = 'your_preset_here';

const DRAFT_STORAGE_KEY = 'dealit_add_item_draft';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', ' तेलंगाना', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

export const getOptimizedCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com') || url.includes('q_auto')) return url;
  return url.replace('/upload/', '/upload/q_auto,f_auto,w_800/');
};

// ─── Custom Dropdown Component ───────────────────────────────────────────────
const CustomDropdown = ({ label, options, value, onChange, placeholder, icon, disabled, hasError }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <View style={styles.dropdownContainer}>
      <Text style={styles.inputLabel}>
        {icon && <Ionicons name={icon} size={14} color="#553c9a" />} {label}
      </Text>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => setIsOpen(!isOpen)}
        style={[
          styles.dropdownBtn,
          hasError && styles.dropdownBtnError,
          disabled && styles.dropdownBtnDisabled
        ]}
      >
        <Text style={[styles.dropdownBtnText, !value && { color: '#9ca3af' }]} numberOfLines={1}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={isOpen ? "#805ad5" : "#9ca3af"} />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                onPress={() => { onChange(opt.value); setIsOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]}>{opt.label}</Text>
                {isSelected && <Ionicons name="checkmark" size={16} color="#6B46C1" />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AddItemScreen({ user, setUser }) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // ── Form state
  const [formData, setFormData] = useState({
    title: '', description: '', category: '', condition: '', preferred_item: '',
    estimated_value: '', weightCategory: '0.5', exactWeight: '',
    dimensions: { length: 10, width: 10, height: 10 }
  });
  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({ category: false, condition: false });
  const [aiFilledFields, setAiFilledFields] = useState([]);

  // ── Address modal
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    houseNo: '', areaStreet: '', landmark: '', city: '', state: '', pincode: ''
  });
  const [stateSearch, setStateSearch] = useState('');
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);

  // ── AI processing
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const progressIntervalRef = useRef(null);
  const draftTimerRef = useRef(null);

  // ── Sync user address
  useEffect(() => {
    if (user?.pickupAddress) {
      setAddressForm({
        houseNo: user.pickupAddress.houseNo || '',
        areaStreet: user.pickupAddress.areaStreet || '',
        landmark: user.pickupAddress.landmark || '',
        city: user.pickupAddress.city || '',
        state: user.pickupAddress.state || '',
        pincode: user.pickupAddress.pincode || ''
      });
      setStateSearch(user.pickupAddress.state || '');
    }
  }, [user, isAddressModalOpen]);

  // ── Load & Save Draft
  useEffect(() => {
    const loadDraft = async () => {
      const savedDraft = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (!savedDraft) return;
      try {
        const { formData: savedFormData, images: savedImages } = JSON.parse(savedDraft);
        if (savedFormData) setFormData(savedFormData);
        if (savedImages) setImages(savedImages);
      } catch (e) {
        AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    };
    loadDraft();
  }, []);

  useEffect(() => {
    if (formData.title === '' && images.length === 0) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ formData, images }));
    }, 800);
  }, [formData, images]);

  // ── Queries
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('dealit_token');
      const res = await axios.get(`${API_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data?.data || [];
    }
  });

  const { data: systemSettings = {
    isCreditSystemEnabled: true, creditsPerListing: 50, maxListingsRewarded: 3, maxAllowedListings: 5, minImagesRequired: 3
  } } = useQuery({
    queryKey: ['creditSettings'],
    queryFn: async () => {
      const token = await AsyncStorage.getItem('dealit_token');
      const res = await axios.get(`${API_URL}/admin/public-settings`, { headers: { Authorization: `Bearer ${token}` } });
      return res.data?.data || systemSettings;
    }
  });

  const activeListedCount = user?.listedProductsCount || 0;
  const rewardedCount = user?.rewardedListingsCount || 0;
  const isLimitReached = activeListedCount >= systemSettings.maxAllowedListings;
  const minImages = systemSettings.minImagesRequired || 3;

  // ── Image Upload (Native Image Picker)
  const uploadImageMutation = useMutation({
    mutationFn: async (imageUri) => {
      const data = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      
      data.append('file', { uri: imageUri, name: filename, type });
      data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      
      const response = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.secure_url;
    },
    onSuccess: (originalUrl) => {
      setImages(prev => [...prev, originalUrl]);
    },
    onError: () => Alert.alert('Error', 'Failed to upload image.')
  });

  const handleImageSelect = async () => {
    if (images.length >= 5) { Alert.alert('Limit Reached', 'Maximum 5 images allowed.'); return; }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Native Cropping!
      aspect: [1, 1],
      quality: 0.8, // Native Compression!
    });

    if (!result.canceled) {
      uploadImageMutation.mutate(result.assets[0].uri);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  // ── AI Auto-fill
  const autoFillMutation = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem('dealit_token');
      const response = await axios.post(`${API_URL}/ai/analyze-images`, { imageUrls: images.slice(0, 3) }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    onSuccess: (data) => {
      setAnalyzeProgress(100);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      if (data.success && data.data) {
        const { title, category, description } = data.data;
        const filled = [];
        setTimeout(() => {
          setFormData(prev => {
            if (title && !prev.title) filled.push('title');
            if (category && !prev.category) filled.push('category');
            if (description && !prev.description) filled.push('description');
            return {
              ...prev,
              title: title || prev.title,
              category: category || prev.category,
              description: description || prev.description,
            };
          });
          setAiFilledFields(filled);
          setTimeout(() => setAiFilledFields([]), 2000);
          setAnalyzeProgress(0);
        }, 600);
      }
    },
    onError: () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setAnalyzeProgress(0);
      Alert.alert('AI Error', 'Could not analyze images right now.');
    }
  });

  const handleAutoFillFromImages = () => {
    if (images.length === 0) { Alert.alert('Images Required', 'Upload at least 1 image.'); return; }
    setAnalyzeProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setAnalyzeProgress(prev => {
        if (prev >= 92) { clearInterval(progressIntervalRef.current); return prev; }
        return Math.min(92, prev + Math.floor(Math.random() * 8) + 4);
      });
    }, 350);
    autoFillMutation.mutate();
  };

  const generateDescMutation = useMutation({
    mutationFn: async () => {
      const token = await AsyncStorage.getItem('dealit_token');
      const response = await axios.post(`${API_URL}/ai/generate-description`, 
        { title: formData.title, category: formData.category, condition: formData.condition },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
        setAiFilledFields(['description']);
        setTimeout(() => setAiFilledFields([]), 2000);
      }
    },
    onError: () => Alert.alert("Error", "Failed to generate description.")
  });

  // ── Address
  const updateAddressMutation = useMutation({
    mutationFn: async (updatedAddress) => {
      const token = await AsyncStorage.getItem('dealit_token');
      const payload = { full_name: user?.full_name, phone: user?.phone, city: user?.city, pickupAddress: updatedAddress };
      return axios.put(`${API_URL}/users/profile`, payload, { headers: { Authorization: `Bearer ${token}` } });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries(['profile']);
      setIsAddressModalOpen(false);
      Alert.alert('Success', 'Pickup address updated!');
    },
  });

  const handleAddressSubmit = () => {
    if (addressForm.houseNo && !/\d/.test(addressForm.houseNo)) {
      Alert.alert('Invalid Input', 'House No. must include at least one digit.');
      return;
    }
    if (!/^\d{6}$/.test(addressForm.pincode)) {
      Alert.alert('Invalid Input', 'Pincode must be exactly 6 digits.');
      return;
    }
    updateAddressMutation.mutate({ ...addressForm, state: stateSearch });
  };

  // ── Create Item
  const createItemMutation = useMutation({
    mutationFn: async (payload) => {
      const token = await AsyncStorage.getItem('dealit_token');
      const response = await axios.post(`${API_URL}/items`, payload, { headers: { Authorization: `Bearer ${token}` } });
      return response.data;
    },
    onSuccess: () => {
      AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      Alert.alert('Success', 'Product listed successfully! Credits will be added once admin approves it.');
      navigation.navigate('Dashboard');
    },
    onError: (err) => Alert.alert('Error', err.response?.data?.message || 'Failed to list item.')
  });

  const handleSubmit = () => {
    const errors = { category: !formData.category, condition: !formData.condition };
    setFieldErrors(errors);
    if (errors.category || errors.condition) { Alert.alert('Error', 'Please select both Category and Condition.'); return; }
    if (!user?.pickupAddress?.houseNo) { Alert.alert('Address Required', 'Please add your pickup address.'); setIsAddressModalOpen(true); return; }
    if (images.length < minImages) { Alert.alert('Images Required', `Please upload at least ${minImages} image(s).`); return; }
    if (formData.weightCategory === 'custom') {
      const parsedWeight = parseFloat(formData.exactWeight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) { Alert.alert('Error', 'Enter a valid custom weight.'); return; }
    }
    const estimatedVal = parseFloat(formData.estimated_value);
    if (!estimatedVal || estimatedVal <= 0) { Alert.alert('Error', 'Enter a valid price greater than 0.'); return; }

    const finalWeight = formData.weightCategory === 'custom' ? parseFloat(formData.exactWeight) : parseFloat(formData.weightCategory);

    createItemMutation.mutate({
      ...formData,
      images,
      weight: finalWeight,
    });
  };

  // ── Options
  const categoryOptions = [...categories.map(cat => ({ label: cat.name, value: cat.name })), { label: 'Other', value: 'Other' }];
  const conditionOptions = [
    { label: 'Brand New', value: 'New' }, { label: 'Like New', value: 'Like New' },
    { label: 'Used - Good', value: 'Used' }, { label: 'Fair', value: 'Fair' }
  ];
  const weightOptions = [
    { label: 'Up to 500g', value: '0.5' }, { label: '500g to 1 Kg', value: '1' },
    { label: '1 Kg to 2 Kg', value: '2' }, { label: '2 Kg to 5 Kg', value: '5' },
    { label: 'Custom Weight', value: 'custom' }
  ];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List an Item</Text>
        <TouchableOpacity 
          onPress={() => setIsAddressModalOpen(true)} 
          style={[styles.pickupBtn, user?.pickupAddress?.houseNo ? styles.pickupBtnActive : styles.pickupBtnInactive]}
        >
          <Ionicons name="location" size={14} color="#ffffff" />
          <Text style={styles.pickupBtnText}>Pickup</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Banner */}
        {!isLimitReached ? (
          <View style={styles.banner}>
            <View style={styles.bannerIcon}><Ionicons name="gift" size={20} color="#6B46C1" /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.bannerHeader}>
                <Text style={styles.bannerTitle}>
                  {rewardedCount < systemSettings.maxListingsRewarded ? `Earn ${systemSettings.creditsPerListing} Credits! 🪙` : 'Free Listing Available 📦'}
                </Text>
                <View style={styles.bannerBadge}><Text style={styles.bannerBadgeText}>{activeListedCount}/{systemSettings.maxAllowedListings}</Text></View>
              </View>
              <Text style={styles.bannerSub}>
                {rewardedCount < systemSettings.maxListingsRewarded 
                  ? `Reward valid for next ${systemSettings.maxListingsRewarded - rewardedCount} approval(s).` 
                  : `List ${systemSettings.maxAllowedListings - activeListedCount} more items for free.`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.bannerTitle, { color: '#b91c1c' }]}>Listing Limit Reached</Text>
              <Text style={[styles.bannerSub, { color: '#dc2626' }]}>Maximum {systemSettings.maxAllowedListings} items allowed.</Text>
            </View>
          </View>
        )}

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.inputLabel}>Add at least {minImages} image(s)*</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {images.map((url, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri: getOptimizedCloudinaryUrl(url) }} style={styles.imagePreview} />
                <TouchableOpacity onPress={() => removeImage(idx)} style={styles.removeImageBtn}>
                  <Ionicons name="close" size={14} color="#ffffff" />
                </TouchableOpacity>
                {idx === 0 && <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>Cover</Text></View>}
              </View>
            ))}
            {images.length < 5 && !isLimitReached && (
              <TouchableOpacity onPress={handleImageSelect} style={styles.addImageBtn} disabled={uploadImageMutation.isPending}>
                {uploadImageMutation.isPending ? <ActivityIndicator color="#805ad5" /> : <Ionicons name="add" size={32} color="#805ad5" />}
                <Text style={styles.addImageText}>{images.length}/{minImages} min</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* AI Auto-fill */}
        {images.length > 0 && !isLimitReached && (
          <LinearGradient colors={['#f5f3ff', '#ffffff']} style={styles.aiCard}>
            <View style={styles.aiCardLeft}>
              <Text style={styles.aiCardTitle}>Lazy to type? <Ionicons name="color-wand" size={16} color="#805ad5" /></Text>
              <Text style={styles.aiCardSub}>Let AI fill details from your photos.</Text>
            </View>
            {autoFillMutation.isPending ? (
              <View style={styles.aiProgressContainer}>
                <Text style={styles.aiProgressText}>Analyzing... {analyzeProgress}%</Text>
                <View style={styles.aiProgressBarBg}>
                  <View style={[styles.aiProgressBarFill, { width: `${analyzeProgress}%` }]} />
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={handleAutoFillFromImages} style={styles.aiBtn}>
                <Ionicons name="sparkles" size={14} color="#ffffff" />
                <Text style={styles.aiBtnText}>Auto-Fill</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        )}

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Title of Your Item</Text>
          <TextInput
            style={[styles.input, aiFilledFields.includes('title') && styles.inputHighlight]}
            value={formData.title}
            onChangeText={(val) => setFormData({ ...formData, title: val })}
            placeholder="Enter item title"
            editable={!isLimitReached}
          />
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <CustomDropdown 
              label="Choose Category" placeholder="Select" 
              options={categoryOptions} value={formData.category} 
              onChange={(val) => { setFormData({ ...formData, category: val }); setFieldErrors({ ...fieldErrors, category: false }); }}
              disabled={isLimitReached} hasError={fieldErrors.category}
            />
          </View>
          <View style={{ flex: 1 }}>
            <CustomDropdown 
              label="Item Condition" placeholder="Select" 
              options={conditionOptions} value={formData.condition} 
              onChange={(val) => { setFormData({ ...formData, condition: val }); setFieldErrors({ ...fieldErrors, condition: false }); }}
              disabled={isLimitReached} hasError={fieldErrors.condition}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Set Your Price (Credits)</Text>
            <TextInput
              style={styles.input}
              value={formData.estimated_value}
              onChangeText={(val) => setFormData({ ...formData, estimated_value: val })}
              placeholder="Credits"
              keyboardType="numeric"
              editable={!isLimitReached}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Preferred Item</Text>
            <TextInput
              style={styles.input}
              value={formData.preferred_item}
              onChangeText={(val) => setFormData({ ...formData, preferred_item: val })}
              placeholder="Optional"
              editable={!isLimitReached}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}><Ionicons name="cube" size={16} /> Shipping Details</Text>
          
          <CustomDropdown 
            label="Item Weight (Approx)" icon="scale-outline" placeholder="Select Weight" 
            options={weightOptions} value={formData.weightCategory} 
            onChange={(val) => setFormData({ ...formData, weightCategory: val })}
            disabled={isLimitReached}
          />

          {formData.weightCategory === 'custom' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              value={formData.exactWeight}
              onChangeText={(val) => setFormData({ ...formData, exactWeight: val })}
              placeholder="e.g. 1.5 (Kg)"
              keyboardType="numeric"
              editable={!isLimitReached}
            />
          )}

          <Text style={[styles.inputLabel, { marginTop: 12 }]}>Box Dimensions (L × W × H in cm)</Text>
          <View style={styles.row}>
            {['length', 'width', 'height'].map((dim, i) => (
              <TextInput
                key={dim}
                style={[styles.input, { flex: 1, textAlign: 'center' }]}
                value={String(formData.dimensions[dim])}
                onChangeText={(val) => setFormData({ ...formData, dimensions: { ...formData.dimensions, [dim]: val } })}
                placeholder={['L', 'W', 'H'][i]}
                keyboardType="numeric"
              />
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.descHeader}>
            <Text style={styles.inputLabel}>Description</Text>
            <TouchableOpacity onPress={generateDescMutation.mutate} disabled={generateDescMutation.isPending || isLimitReached} style={styles.aiWriteBtn}>
              <Ionicons name="sparkles" size={12} color="#6B46C1" />
              <Text style={styles.aiWriteText}>{generateDescMutation.isPending ? 'Writing...' : 'Write with AI'}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.textArea, aiFilledFields.includes('description') && styles.inputHighlight]}
            value={formData.description}
            onChangeText={(val) => setFormData({ ...formData, description: val })}
            placeholder="Describe your item..."
            multiline
            numberOfLines={4}
            editable={!isLimitReached}
          />
        </View>

        <TouchableOpacity 
          onPress={handleSubmit} 
          disabled={createItemMutation.isPending || uploadImageMutation.isPending || isLimitReached}
          style={[styles.submitBtn, (createItemMutation.isPending || isLimitReached) && styles.submitBtnDisabled]}
        >
          {createItemMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Sell Item</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Address Modal */}
      <Modal visible={isAddressModalOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsAddressModalOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pickup Details</Text>
              <TouchableOpacity onPress={() => setIsAddressModalOpen(false)} style={styles.modalCloseBtn}><Ionicons name="close" size={20} color="#6b7280" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalForm}>
              <TextInput style={styles.inputModal} placeholder="House No. / Flat No." value={addressForm.houseNo} onChangeText={(val) => setAddressForm({ ...addressForm, houseNo: val })} />
              <TextInput style={styles.inputModal} placeholder="Area, Street, Sector" value={addressForm.areaStreet} onChangeText={(val) => setAddressForm({ ...addressForm, areaStreet: val })} />
              <TextInput style={styles.inputModal} placeholder="Landmark (Optional)" value={addressForm.landmark} onChangeText={(val) => setAddressForm({ ...addressForm, landmark: val })} />
              <View style={styles.row}>
                <TextInput style={[styles.inputModal, { flex: 1 }]} placeholder="City" value={addressForm.city} onChangeText={(val) => setAddressForm({ ...addressForm, city: val })} />
                <View style={{ flex: 1 }}>
                  <TextInput 
                    style={styles.inputModal} placeholder="State" value={stateSearch} 
                    onChangeText={(val) => { setStateSearch(val); setShowStateSuggestions(true); }}
                    onFocus={() => setShowStateSuggestions(true)}
                  />
                  {showStateSuggestions && stateSearch.length > 0 && (
                    <View style={styles.suggestionsDropdown}>
                      {INDIAN_STATES.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase())).slice(0,4).map(st => (
                        <TouchableOpacity key={st} style={styles.suggestionItem} onPress={() => { setStateSearch(st); setShowStateSuggestions(false); }}>
                          <Text style={styles.suggestionText}>{st}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
              <TextInput style={styles.inputModal} placeholder="Pincode (6 Digits)" keyboardType="numeric" maxLength={6} value={addressForm.pincode} onChangeText={(val) => setAddressForm({ ...addressForm, pincode: val })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={handleAddressSubmit} disabled={updateAddressMutation.isPending} style={styles.saveBtn}>
                {updateAddressMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Confirm Address</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfbff' },
  header: {
    backgroundColor: '#6B46C1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  pickupBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, gap: 4 },
  pickupBtnActive: { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(134, 239, 172, 0.4)' },
  pickupBtnInactive: { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)' },
  pickupBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  banner: { flexDirection: 'row', backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#e9d8ff', padding: 12, borderRadius: 16, marginBottom: 20, alignItems: 'flex-start', gap: 10 },
  bannerIcon: { backgroundColor: '#e9d8ff', padding: 6, borderRadius: 20 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerTitle: { fontSize: 12, fontWeight: 'bold', color: '#553c9a' },
  bannerBadge: { backgroundColor: '#e9d8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  bannerBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#553c9a' },
  bannerSub: { fontSize: 11, color: '#805ad5', marginTop: 4 },

  section: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#553c9a', marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#553c9a', marginBottom: 8 },
  
  imageWrapper: { width: 80, height: 80, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 12 },
  coverBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: '#6B46C1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  coverBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  addImageBtn: { width: 80, height: 80, borderRadius: 16, backgroundColor: '#f8f6ff', borderWidth: 2, borderColor: '#e9d8ff', alignItems: 'center', justifyContent: 'center' },
  addImageText: { fontSize: 10, color: '#805ad5', marginTop: 4, fontWeight: '600' },

  aiCard: { flexDirection: 'row', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#e9d8ff', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  aiCardLeft: { flex: 1 },
  aiCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#6B46C1' },
  aiCardSub: { fontSize: 11, color: '#805ad5', marginTop: 2 },
  aiBtn: { flexDirection: 'row', backgroundColor: '#6B46C1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', gap: 6 },
  aiBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  aiProgressContainer: { width: 100 },
  aiProgressText: { fontSize: 10, color: '#6B46C1', fontWeight: 'bold', marginBottom: 4 },
  aiProgressBarBg: { height: 6, backgroundColor: '#e9d8ff', borderRadius: 4, overflow: 'hidden' },
  aiProgressBarFill: { height: '100%', backgroundColor: '#6B46C1' },

  formGroup: { marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 14, color: '#1f2937' },
  inputHighlight: { borderColor: '#4ade80', borderWidth: 2 },
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  
  descHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  aiWriteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f0ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  aiWriteText: { fontSize: 10, color: '#6B46C1', fontWeight: 'bold' },

  dropdownContainer: { marginBottom: 12 },
  dropdownBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownBtnError: { borderColor: '#f87171' },
  dropdownBtnDisabled: { backgroundColor: '#f9fafb' },
  dropdownBtnText: { fontSize: 14, color: '#1f2937' },
  dropdownList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb', flexDirection: 'row', justifyContent: 'space-between' },
  dropdownItemSelected: { backgroundColor: '#f3f0ff' },
  dropdownItemText: { fontSize: 14, color: '#4b5563' },
  dropdownItemTextSelected: { color: '#6B46C1', fontWeight: 'bold' },

  submitBtn: { backgroundColor: '#6B46C1', height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  submitBtnDisabled: { backgroundColor: '#A388E1' },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalCloseBtn: { padding: 4 },
  modalForm: { padding: 20 },
  inputModal: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, height: 50, marginBottom: 12 },
  suggestionsDropdown: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, zIndex: 100 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  suggestionText: { fontSize: 14 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  saveBtn: { backgroundColor: '#6B46C1', height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});