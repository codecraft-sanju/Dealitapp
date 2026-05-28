import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

const { width, height } = Dimensions.get('window');

const API_URL = 'https://api.dealiit.com/api';

const FloatInput = ({ icon, label, secureTextEntry, value, onChangeText, keyboardType, autoCapitalize }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPass, setShowPass] = useState(secureTextEntry);
  const animatedIsFocused = useRef(new Animated.Value(value === '' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(animatedIsFocused, {
      toValue: isFocused || value !== '' ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, value]);

  const labelStyle = {
    position: 'absolute',
    left: 45,
    top: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [18, 5],
    }),
    fontSize: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 10],
    }),
    color: animatedIsFocused.interpolate({
      inputRange: [0, 1],
      outputRange: ['#9ca3af', '#6B46C1'],
    }),
    fontWeight: '600'
  };

  return (
    <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
      <Ionicons name={icon} size={20} color={isFocused ? '#6B46C1' : '#9ca3af'} style={styles.inputIcon} />
      <Animated.Text style={labelStyle}>{label}</Animated.Text>
      <TextInput
        style={styles.input}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        secureTextEntry={showPass}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {secureTextEntry && (
        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPass(!showPass)}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function AuthScreen({ navigation, onLoginSuccess }) {
  // Main Auth States
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showOtp, setShowOtp] = useState(false);
  
  // Forgot Password States
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const resetOtpInputs = useRef([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', phone: '', city: '', referralCode: ''
  });
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const otpInputs = useRef([]);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleOtpChange = (value, index, isReset = false) => {
    if (isReset) {
      const newOtp = [...resetOtp];
      newOtp[index] = value;
      setResetOtp(newOtp);
      if (value && index < 5) resetOtpInputs.current[index + 1].focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 5) otpInputs.current[index + 1].focus();
    }
  };

  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setSuccessMsg('');
    setShowOtp(false);
    setIsForgotMode(false);
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

  // --- Login / Register Logic ---
  const handleAuth = async () => {
    setError(''); setLoading(true);
    try {
      const endpoint = isLoginMode ? '/users/login' : '/users/register';
      const payload = isLoginMode 
        ? { email: formData.email, password: formData.password }
        : formData;

      const res = await axios.post(`${API_URL}${endpoint}`, payload);

      if (res.data.success) {
        if (res.data.requiresOtp) {
          setRegisteredEmail(res.data.email || formData.email);
          setShowOtp(true);
        } else {
          await storeSession(res.data.user, res.data.token);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) return;
    setError(''); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/users/verify-otp`, { 
        email: registeredEmail, otp: otpValue 
      });
      if (res.data.success) {
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

  // --- Forgot Password Logic ---
  const handleSendResetOtp = async () => {
    if (!resetEmail) return;
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/users/forgotpassword`, { email: resetEmail });
      if (res.data.success) {
        setSuccessMsg('OTP sent to your email!');
        setForgotStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const otpValue = resetOtp.join('');
    if (otpValue.length < 6 || !newPassword) return;
    setError(''); setSuccessMsg(''); setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/users/resetpassword`, { 
        email: resetEmail, otp: otpValue, newPassword 
      });
      if (res.data.success) {
        await storeSession(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP or Password.');
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setIsForgotMode(false);
    setForgotStep(1);
    setResetEmail('');
    setResetOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setError('');
    setSuccessMsg('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.background}>
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* --- FORGOT PASSWORD FLOW --- */}
        {isForgotMode ? (
          <>
            <View style={styles.header}>
              <View style={styles.brandContainer}>
                <Ionicons name="swap-horizontal" size={28} color="#6B46C1" />
                <Text style={styles.brandText}>dealit</Text>
              </View>
              <Text style={styles.title}>{forgotStep === 1 ? 'Reset Password' : 'Secure Account'}</Text>
              <Text style={styles.subtitle}>
                {forgotStep === 1 
                  ? 'Enter your registered email address' 
                  : `Code sent to ${resetEmail}`}
              </Text>
            </View>

            {error !== '' && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
            {successMsg !== '' && <View style={styles.successBox}><Text style={styles.successText}>{successMsg}</Text></View>}

            {forgotStep === 1 ? (
              <View style={styles.formContainer}>
                <FloatInput icon="mail-outline" label="Email address" value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none" />
                
                <TouchableOpacity activeOpacity={0.8} onPress={handleSendResetOtp} disabled={loading || !resetEmail}>
                  <LinearGradient colors={['#805ad5', '#6B46C1']} style={styles.submitBtn}>
                    {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.submitBtnText}>Send OTP</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={backToLogin}>
                  <Text style={styles.switchAction}>← Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.otpContainer}>
                <View style={styles.otpGrid}>
                  {resetOtp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => resetOtpInputs.current[index] = ref}
                      style={[styles.otpBox, digit !== '' && styles.otpBoxFilled]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(val) => handleOtpChange(val, index, true)}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace' && digit === '' && index > 0) {
                          resetOtpInputs.current[index - 1].focus();
                        }
                      }}
                    />
                  ))}
                </View>

                <View style={{ width: '100%', marginTop: 20, marginBottom: 14 }}>
                  <FloatInput icon="lock-closed-outline" label="New Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                </View>

                <TouchableOpacity activeOpacity={0.8} onPress={handleResetPassword} disabled={loading || resetOtp.join('').length < 6 || !newPassword} style={{ width: '100%' }}>
                  <LinearGradient colors={['#805ad5', '#6B46C1']} style={styles.submitBtn}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Reset & Login</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 24, alignItems: 'center' }} onPress={() => {setForgotStep(1); setError(''); setSuccessMsg('');}}>
                  <Text style={styles.switchAction}>Wrong email? Go back</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* --- LOGIN / SIGNUP FLOW --- */
          <>
            <View style={styles.header}>
              <View style={styles.brandContainer}>
                <Ionicons name="swap-horizontal" size={28} color="#6B46C1" />
                <Text style={styles.brandText}>dealit</Text>
              </View>
              <Text style={styles.title}>
                {showOtp ? 'Verify email' : (isLoginMode ? 'Welcome back' : 'Create account')}
              </Text>
              <Text style={styles.subtitle}>
                {showOtp 
                  ? `Code sent to ${registeredEmail}` 
                  : (isLoginMode ? 'Sign in to your account' : 'Join and start trading smarter')}
              </Text>
            </View>

            {error !== '' && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            {!showOtp ? (
              <View style={styles.formContainer}>
                <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin} disabled={loading}>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or {isLoginMode ? 'sign in' : 'register'} with email</Text>
                  <View style={styles.dividerLine} />
                </View>

                {!isLoginMode && (
                  <FloatInput icon="person-outline" label="Full name" value={formData.full_name} onChangeText={(v) => handleChange('full_name', v)} />
                )}
                
                <FloatInput icon="mail-outline" label="Email address" value={formData.email} onChangeText={(v) => handleChange('email', v)} keyboardType="email-address" autoCapitalize="none" />
                <FloatInput icon="lock-closed-outline" label="Password" value={formData.password} onChangeText={(v) => handleChange('password', v)} secureTextEntry />

                {!isLoginMode && (
                  <>
                    <FloatInput icon="call-outline" label="Phone number" value={formData.phone} onChangeText={(v) => handleChange('phone', v)} keyboardType="phone-pad" />
                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <FloatInput icon="location-outline" label="City" value={formData.city} onChangeText={(v) => handleChange('city', v)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <FloatInput icon="gift-outline" label="Refer code" value={formData.referralCode} onChangeText={(v) => handleChange('referralCode', v)} autoCapitalize="characters" />
                      </View>
                    </View>
                  </>
                )}

                {isLoginMode && (
                  <TouchableOpacity style={styles.forgotBtn} onPress={() => setIsForgotMode(true)}>
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity activeOpacity={0.8} onPress={handleAuth} disabled={loading}>
                  <LinearGradient colors={['#805ad5', '#6B46C1']} style={styles.submitBtn}>
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>{isLoginMode ? 'Sign In' : 'Create Account'}</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.switchContainer}>
                  <Text style={styles.switchText}>{isLoginMode ? "Don't have an account? " : "Already have an account? "}</Text>
                  <TouchableOpacity onPress={switchMode}>
                    <Text style={styles.switchAction}>{isLoginMode ? 'Sign Up' : 'Sign In'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.otpContainer}>
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
                  <LinearGradient colors={['#805ad5', '#6B46C1']} style={[styles.submitBtn, { marginTop: 20 }]}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Verify & Login</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => setShowOtp(false)}>
                  <Text style={styles.switchAction}>Go back</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f2f9' },
  background: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', zIndex: 0 },
  orb: { position: 'absolute', borderRadius: 300, opacity: 0.4 },
  orb1: { width: 400, height: 400, backgroundColor: '#d6bcfa', top: -100, left: -100 },
  orb2: { width: 350, height: 350, backgroundColor: '#e9d8ff', bottom: -50, right: -100 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, zIndex: 1 },
  header: { marginBottom: 30, alignItems: 'center' },
  brandContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  brandText: { fontSize: 24, fontWeight: '800', color: '#6B46C1', marginLeft: 8 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  errorBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca', marginBottom: 20 },
  errorText: { color: '#ef4444', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  successBox: { backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0', marginBottom: 20 },
  successText: { color: '#059669', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  formContainer: { width: '100%' },
  googleBtn: { flexDirection: 'row', backgroundColor: '#ffffff', height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#374151', marginLeft: 10 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' },
  inputContainer: { height: 56, backgroundColor: '#f8f6ff', borderWidth: 1.5, borderColor: '#e9d8ff', borderRadius: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  inputContainerFocused: { borderColor: '#6B46C1', backgroundColor: '#ffffff' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', paddingTop: 16, fontSize: 15, color: '#1f2937', fontWeight: '600' },
  eyeIcon: { padding: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#805ad5', fontWeight: '700', fontSize: 13 },
  submitBtn: { height: 56, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#6B46C1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginRight: 8 },
  switchContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
  switchAction: { color: '#6B46C1', fontSize: 14, fontWeight: '700' },
  otpContainer: { width: '100%', alignItems: 'center' },
  otpGrid: { flexDirection: 'row', justifyContent: 'center', width: '100%', gap: 10 },
  otpBox: { width: 45, height: 55, backgroundColor: '#f8f6ff', borderWidth: 1.5, borderColor: '#e9d8ff', borderRadius: 12, textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#1f2937' },
  otpBoxFilled: { borderColor: '#6B46C1', backgroundColor: '#f5f0ff', color: '#6B46C1' }
});