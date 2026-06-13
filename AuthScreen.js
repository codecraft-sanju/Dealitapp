
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const { width, height } = Dimensions.get('window');

const API_URL = 'https://api.dealiit.com/api';

const FALLBACK_AVATARS = [
  'https://i.pravatar.cc/100?img=47',
  'https://i.pravatar.cc/100?img=12',
  'https://i.pravatar.cc/100?img=32',
  'https://i.pravatar.cc/100?img=16'
];

export default function AuthScreen({ navigation, onLoginSuccess }) {
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState([]);
  
  const otpInputs = useRef([]);

  useEffect(() => {
    const fetchAvatars = async () => {
      try {
        const res = await axios.get(`${API_URL}/users/random-avatars`);
        if (res.data.success && res.data.data) {
          setAvatars(res.data.data.slice(0, 4));
        }
      } catch (err) {
        console.log('Failed to fetch avatars, using fallbacks');
      }
    };
    fetchAvatars();
  }, []);

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpInputs.current[index + 1].focus();
  };

  const handleModeSwitch = (mode) => {
    setIsSignUpMode(mode === 'signup');
    setError('');
    setShowOtp(false);
    setEmail('');
    setOtp(['', '', '', '', '', '']);
  };

  const storeSession = async (user, token) => {
    try {
      await AsyncStorage.setItem('dealit_user', JSON.stringify(user));
      if (token) await AsyncStorage.setItem('dealit_token', token);
      if (onLoginSuccess) onLoginSuccess(user, token);
    } catch (e) {
      console.log('Error storing session:', e);
    }
  };

  const handleAuthSubmit = async () => {
    if (!email) return;
    setError(''); setLoading(true);
    
    const endpoint = isSignUpMode ? `${API_URL}/users/register` : `${API_URL}/users/login`;
    
    try {
      const res = await axios.post(endpoint, { email });
      
      if (res.data.success) {
        setShowOtp(true);
      }
    } catch (err) {
      if (err.response) setError(err.response.data.message || 'Something went wrong.');
      else setError('Network Error: Cannot reach server.');
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) return;
    
    setError(''); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/users/verify-otp`, { email, otp: otpValue });
      if (res.data.success) {
        await AsyncStorage.setItem('showWelcomeBonus', 'true');
        await storeSession(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally { 
      setLoading(false); 
    }
  };

  const handleGoogleLogin = async () => {
    setError(''); setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();

      if (idToken) {
        const res = await axios.post(`${API_URL}/users/google-login`, { token: idToken });
        if (res.data.success) {
          await storeSession(res.data.user, res.data.token);
        }
      }
    } catch (error) {
      Alert.alert("Google Sign-In Failed 🚨", `Code: ${error.code || 'N/A'}\nMessage: ${error.message || 'Unknown error'}`);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        setError('Google Sign-In was cancelled.');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        setError('Google Sign-In is already in progress.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available.');
      } else {
        setError(error.response?.data?.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const displayAvatars = avatars.length === 4 ? avatars : FALLBACK_AVATARS;

  return (
    <View style={styles.awRoot}>
      
      {/* HERO SECTION */}
      <LinearGradient colors={['#3A1078', '#2A0463', '#1A0042']} style={styles.newHeroSection}>
        <View style={styles.newHeroHeader}>
          <View style={styles.mbBrand}>
            <Image source={require('./assets/applogo.png')} style={styles.brandLogo} />
            <Text style={styles.brandText}>dealit</Text>
          </View>
          <TouchableOpacity 
            style={styles.topToggleBtn} 
            onPress={() => handleModeSwitch(isSignUpMode ? 'login' : 'signup')}
          >
            <Text style={styles.topToggleBtnText}>
              {isSignUpMode ? 'Login' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.newHeroContent}>
          <Text style={styles.heroMainTitle}>
            {isSignUpMode ? 'Join Dealit &\n' : 'Welcome Back to\n'}
            <Text style={styles.textYellow}>
              {isSignUpMode ? 'Get 100 Credits' : 'Dealit'}
            </Text>
            {isSignUpMode ? '\nInstantly!' : ''}
          </Text>
          
          <View style={styles.heroBenefits}>
            <View style={styles.benefitRow}>
              <Ionicons name="pricetag" size={14} color="#e9d8ff" />
              <Text style={styles.benefitText}>{isSignUpMode ? 'List items, earn credits' : 'Check new offers'}</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="bag-handle" size={14} color="#e9d8ff" />
              <Text style={styles.benefitText}>{isSignUpMode ? 'Buy anything with credits' : 'Spend your credits'}</Text>
            </View>
            <View style={styles.benefitRow}>
              <Ionicons name="flash" size={14} color="#e9d8ff" />
              <Text style={styles.benefitText}>{isSignUpMode ? 'No hidden charges' : 'Complete your trades'}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* STATS BANNER */}
      <View style={styles.statsBannerWrap}>
        <View style={styles.statsBanner}>
          <View style={styles.avatarsContainer}>
            {displayAvatars.map((src, i) => {
              const finalSrc = src.includes('ui-avatars.com') ? FALLBACK_AVATARS[i] : src;
              return (
                <Image 
                  key={i} 
                  source={{ uri: finalSrc }} 
                  style={[styles.avatar, i > 0 && { marginLeft: -8 }]} 
                />
              );
            })}
          </View>
          <Text style={styles.statsText}>
            <Text style={{ fontWeight: 'bold' }}>5000+ </Text>
            happy users already earning & saving
          </Text>
        </View>
      </View>

      {/* BOTTOM SHEET */}
      <View style={styles.mbSheet}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            
            {!showOtp ? (
              /* --- LOGIN / SIGNUP FLOW --- */
              <View style={styles.formStep}>
                <View style={styles.formHeader}>
                  <Text style={styles.awHeading}>{isSignUpMode ? 'Create your account' : 'Welcome back'}</Text>
                  <Text style={styles.awSub}>{isSignUpMode ? 'It takes less than 10 seconds!' : 'Sign in to continue'}</Text>
                  {error !== '' && <Text style={styles.awError}>{error}</Text>}
                </View>

                <View style={styles.awForm}>
                  <View style={styles.emailInputWrapper}>
                    <View style={styles.emailIconBox}>
                      <Ionicons name="mail" size={20} color="#6B46C1" />
                    </View>
                    <TextInput 
                      style={styles.emailInput} 
                      placeholder="Enter your email address" 
                      placeholderTextColor="#9ca3af"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address" 
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  
                  <View style={styles.verifyBadge}>
                    <Ionicons name="shield-checkmark" size={14} color="#7c3aed" />
                    <Text style={styles.verifyBadgeText}>We'll send you an OTP to verify</Text>
                  </View>

                  <TouchableOpacity activeOpacity={0.8} onPress={handleAuthSubmit} disabled={loading || !email}>
                    <View style={[styles.awBtn, (loading || !email) && styles.awBtnDisabled]}>
                      {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                          <Text style={styles.awBtnText}>Continue</Text>
                          <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerSection}>
                  <View style={styles.googleDivider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <TouchableOpacity style={styles.googleOutlinedBtn} onPress={handleGoogleLogin} disabled={loading}>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleOutlinedBtnText}>Continue with Google</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.trustBadges}>
                  <View style={styles.badgeItem}>
                    <View style={styles.badgeIcon}><Ionicons name="shield-checkmark" size={18} color="#6B46C1" /></View>
                    <Text style={styles.badgeTitle}>100% Free</Text>
                    <Text style={styles.badgeSub}>No hidden fees</Text>
                  </View>
                  <View style={styles.badgeItem}>
                    <View style={styles.badgeIcon}><Ionicons name="checkmark-circle" size={18} color="#6B46C1" /></View>
                    <Text style={styles.badgeTitle}>Safe & Secure</Text>
                    <Text style={styles.badgeSub}>Your data is protected</Text>
                  </View>
                  <View style={styles.badgeItem}>
                    <View style={styles.badgeIcon}><Ionicons name="people" size={18} color="#6B46C1" /></View>
                    <Text style={styles.badgeTitle}>For Everyone</Text>
                    <Text style={styles.badgeSub}>Buy, sell & save</Text>
                  </View>
                </View>
                
                <Text style={styles.footerTerms}>
                  By continuing, you agree to Dealit's{'\n'}
                  <Text style={styles.footerLink}>Terms of Service</Text> and <Text style={styles.footerLink}>Privacy Policy</Text>
                </Text>
              </View>
            ) : (
              /* --- OTP SCREEN --- */
              <View style={styles.formStep}>
                <View style={styles.formHeader}>
                  <Text style={styles.awHeading}>Verify email</Text>
                  <Text style={styles.awSubOtp}>
                    Code sent to{'\n'}<Text style={{fontWeight: 'bold', color: '#111827'}}>{email}</Text>
                  </Text>
                  {error !== '' && <Text style={styles.awError}>{error}</Text>}
                </View>

                <View style={styles.awForm}>
                  <View style={styles.otpGrid}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => otpInputs.current[index] = ref}
                        style={[styles.otpBox, digit !== '' && styles.otpBoxFilled]}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(val) => handleOtpChange(val, index)}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace' && digit === '' && index > 0) {
                            otpInputs.current[index - 1].focus();
                          }
                        }}
                      />
                    ))}
                  </View>

                  <TouchableOpacity activeOpacity={0.8} onPress={handleVerifyOtp} disabled={loading || otp.join('').length < 6}>
                    <View style={[styles.awBtn, (loading || otp.join('').length < 6) && styles.awBtnDisabled]}>
                      {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                          <Text style={styles.awBtnText}>Verify & Login</Text>
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.backBtnContainer}>
                  <TouchableOpacity onPress={() => setShowOtp(false)}>
                    <Text style={styles.awSwitchBtn}>Wrong email? Go back</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={{ flex: 1 }} />
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  awRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  newHeroSection: {
    flex: 0.38,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 24,
    zIndex: 1,
  },
  newHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  mbBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
    marginRight: 6,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  topToggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  topToggleBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  newHeroContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  heroMainTitle: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  textYellow: {
    color: '#FCD34D',
  },
  heroBenefits: {
    marginTop: 5,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  benefitText: {
    color: '#e9d8ff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  statsBannerWrap: {
    position: 'absolute',
    top: '38%',
    transform: [{ translateY: -25 }],
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  statsBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
    width: '100%',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#f3f4f6',
  },
  statsText: {
    fontSize: 11,
    color: '#4b5563',
    flex: 1,
    flexWrap: 'wrap',
  },
  mbSheet: {
    flex: 0.62,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 45, // Clears the overlap banner
    paddingHorizontal: 24,
    zIndex: 10,
  },
  sheetContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  formStep: {
    flex: 1,
    justifyContent: 'space-between',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  awHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  awSub: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '600',
  },
  awSubOtp: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  awError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    color: '#ef4444',
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    width: '100%',
    textAlign: 'center',
  },
  awForm: {
    width: '100%',
  },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: '#6B46C1',
    borderRadius: 12,
    marginTop: 10,
  },
  emailIconBox: {
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  verifyBadgeText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '600',
    marginLeft: 6,
  },
  awBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B46C1',
    height: 52,
    borderRadius: 12,
  },
  awBtnDisabled: {
    opacity: 0.7,
  },
  awBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  dividerSection: {
    width: '100%',
    marginVertical: 15,
  },
  googleDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '600',
  },
  googleOutlinedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },
  googleOutlinedBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 10,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  badgeItem: {
    alignItems: 'center',
    flex: 1,
  },
  badgeIcon: {
    backgroundColor: '#f5f3ff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  badgeSub: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
  },
  footerTerms: {
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 16,
    marginTop: 10,
  },
  footerLink: {
    color: '#6B46C1',
    fontWeight: '600',
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    backgroundColor: '#faf8ff',
    color: '#1f2937',
  },
  otpBoxFilled: {
    borderColor: '#6B46C1',
    backgroundColor: '#f5f3ff',
  },
  backBtnContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  awSwitchBtn: {
    color: '#6B46C1',
    fontSize: 13,
    fontWeight: '600',
  }
});