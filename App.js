import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, StatusBar, BackHandler, View, Text, FlatList,
  Dimensions, TouchableOpacity, Animated, Easing, Image,
  PermissionsAndroid, Platform, Share
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import * as Speech from 'expo-speech';

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import AuthScreen from './AuthScreen';
import OfflineGameScreen from './OfflineGameScreen';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  { id: '1', title: 'Welcome to DealIt', description: 'Trade what you have for what you want. Not every deal requires cash.', iconName: 'swap-horizontal-outline', color: '#4A90E2' },
  { id: '2', title: 'Smart Barter & Credits', description: 'Exchange items directly or earn credits through successful deals to use later.', iconName: 'wallet-outline', color: '#F5A623' },
  { id: '3', title: 'Safe & Secure', description: 'Connect with verified users. Chat, negotiate, and close deals with confidence.', iconName: 'shield-checkmark-outline', color: '#50E3C2' },
  { id: '4', title: 'Ready to Deal?', description: 'Join the community and make your first trade today.', iconName: 'rocket-outline', color: '#E91E63' }
];

const AnimatedLoader = ({ isReadyToHide }) => {
  const [loaderType] = useState('premium');

  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const textWipeValue = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    let dotAnim1, dotAnim2, dotAnim3;
    let wipeAnim;
    let glowAnim;

    if (loaderType === 'classic') {
      const createBounceAnimation = (val, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(val, { toValue: -12, duration: 400, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
            Animated.timing(val, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
            Animated.delay(300 - delay)
          ])
        );
      };

      dotAnim1 = createBounceAnimation(dot1, 0);
      dotAnim2 = createBounceAnimation(dot2, 150);
      dotAnim3 = createBounceAnimation(dot3, 300);

      dotAnim1.start();
      dotAnim2.start();
      dotAnim3.start();
    } else {
      glowAnim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(glowScale, { toValue: 1.2, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.6, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
          ]),
          Animated.parallel([
            Animated.timing(glowScale, { toValue: 0.8, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.2, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
          ])
        ])
      );
      glowAnim.start();

      wipeAnim = Animated.timing(textWipeValue, {
        toValue: 1,
        duration: 3000,
        delay: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false 
      });
      
      wipeAnim.start();
    }

    Animated.parallel([
      Animated.timing(opacityValue, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleValue, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();

    if (isReadyToHide) {
      Animated.timing(containerOpacity, {
        toValue: 0, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true,
      }).start();
    }

    return () => {
      if (dotAnim1) dotAnim1.stop();
      if (dotAnim2) dotAnim2.stop();
      if (dotAnim3) dotAnim3.stop();
      if (wipeAnim) wipeAnim.stop();
      if (glowAnim) glowAnim.stop();
    };
  }, [isReadyToHide, loaderType]);

  return (
    <Animated.View style={[styles.loadingContainer, { opacity: containerOpacity }]} pointerEvents={isReadyToHide ? 'none' : 'auto'}>
      <LinearGradient colors={loaderType === 'classic' ? ['#CBA4FA', '#7A43E6'] : ['#0F0518', '#000000']} style={StyleSheet.absoluteFillObject} />
      
      <Animated.View style={{ opacity: opacityValue, transform: [{ scale: scaleValue }], alignItems: 'center', justifyContent: 'center' }}>
        
        {loaderType === 'classic' ? (
          <>
            <Image source={require('./assets/applogo.png')} style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: 16, zIndex: 2 }} />
            <Text style={styles.loaderText}>Dealit</Text>
            <View style={styles.loaderDotsContainer}>
              <Animated.View style={[styles.loaderDot, { transform: [{ translateY: dot1 }] }]} />
              <Animated.View style={[styles.loaderDot, { transform: [{ translateY: dot2 }] }]} />
              <Animated.View style={[styles.loaderDot, { transform: [{ translateY: dot3 }] }]} />
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[styles.breathingGlow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
            
            <View style={{ flexDirection: 'row', zIndex: 2 }}>
              {/* Base dull text */}
              <Text style={[styles.premiumText, { color: 'rgba(255, 255, 255, 0.1)' }]}>DealIt</Text>
              
              {/* Animated wipe fill text overlay */}
              <Animated.View style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                overflow: 'hidden',
                width: textWipeValue.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
              }}>
                <Text style={[styles.premiumText, { color: '#A78BFA', textShadowColor: 'rgba(167, 139, 250, 0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 }]} numberOfLines={1}>DealIt</Text>
              </Animated.View>
            </View>
          </View>
        )}

      </Animated.View>
    </Animated.View>
  );
};

async function registerForPushNotificationsAsync() {
  let token;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#7A43E6',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return null;
      }
      
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    }
  } catch (e) {
    console.log(`Token generation failed: ${e.message}`);
  }

  return token;
}

export default function App() {
  const WEBSITE_URL = 'https://dealiit.com';
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef(null);

  const [isWebLoaded, setIsWebLoaded] = useState(false);
  const [minLoadTimePassed, setMinLoadTimePassed] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [appIsReady, setAppIsReady] = useState(false);
  
  const [nativeUser, setNativeUser] = useState(null);
  const [nativeToken, setNativeToken] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [expoPushToken, setExpoPushToken] = useState('');
  const [pendingUrl, setPendingUrl] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '332398615342-4qo2qrmbipvvrp4i4nmpllg4fnfs0um9.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }, []);

  useEffect(() => {
    const requestAllPermissionsSequentially = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) setExpoPushToken(token);

        await Location.requestForegroundPermissionsAsync();
        
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: "Microphone Permission",
              message: "DealIt needs access to your microphone for AI voice chat.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
        }
      } catch (err) {
        console.log(`Permission Error: ${err.message}`);
      }
    };

    requestAllPermissionsSequentially();
  }, []);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data && data.url) {
        if (isWebLoaded && webViewRef.current) {
          injectRouteToWebView(data.url);
        } else {
          setPendingUrl(data.url);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isWebLoaded]);

  const injectRouteToWebView = (url) => {
    if (webViewRef.current) {
      const script = `
        try {
          const data = JSON.stringify({ type: 'ROUTE_CHANGE', url: '${url}' });
          window.postMessage(data, '*');
          document.dispatchEvent(new MessageEvent('message', { data: data }));
        } catch(e) {}
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };

  const notifyWebUI = (actionType) => {
    if (webViewRef.current) {
      const script = `
        try {
          window.dispatchEvent(new CustomEvent('NATIVE_APP_EVENT', { detail: { type: '${actionType}' } }));
        } catch(e) {}
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };

  const downloadAndSharePDF = async (base64Data, filename) => {
    try {
      if (!base64Data) {
        throw new Error('Empty file data received from website.');
      }

      const fileUri = `${FileSystem.documentDirectory}${filename}`;
  
      const cleanBase64 = String(base64Data).replace(/\s/g, '');

      await FileSystem.writeAsStringAsync(fileUri, cleanBase64, {
  
        encoding: 'base64',
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download Statement',
          UTI: 'com.adobe.pdf' 
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
  
  
      if (webViewRef.current) {
        const errorMessage = error.message || 'Unknown Native Error';
        const script = `
          try {
            window.dispatchEvent(new CustomEvent('NATIVE_APP_ERROR', { detail: ${JSON.stringify(errorMessage)} }));
          } catch(e) {}
          true;
        `;
        webViewRef.current.injectJavaScript(script);
      }
    }
  };

  useEffect(() => {
    const syncPushTokenToBackend = async () => {
      if (nativeToken && expoPushToken) {
        try {
          await axios.post(
            'https://api.dealiit.com/api/notifications/subscribe',
            {
              endpoint: expoPushToken,
              type: 'expo'
            },
            {
              headers: {
                Authorization: `Bearer ${nativeToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (error) {
          console.log(`Backend Sync Failed: ${error.response?.data?.message || error.message}`);
        }
      }
    };

    syncPushTokenToBackend();
  }, [nativeToken, expoPushToken]);

  useEffect(() => {
    if (isWebLoaded && pendingUrl) {
      injectRouteToWebView(pendingUrl);
      setPendingUrl(null); 
    }
  }, [isWebLoaded, pendingUrl]);

  useEffect(() => {
    (async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        setIsFirstLaunch(hasLaunched === null ? true : false);
        
        const userStr = await AsyncStorage.getItem('dealit_user');
        const token = await AsyncStorage.getItem('dealit_token');
        if (userStr && token) {
          setNativeUser(userStr);
          setNativeToken(token);
        }

      } catch {
        setIsFirstLaunch(false);
      } finally {
        setIsAuthChecking(false);
        setAppIsReady(true);
      }
    })();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) await SplashScreen.hideAsync();
  }, [appIsReady]);

  useEffect(() => {
    if (isFirstLaunch === false) {
      const timer = setTimeout(() => setMinLoadTimePassed(true), 3500);
      return () => clearTimeout(timer);
    }
  }, [isFirstLaunch]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const currentConnection = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(currentConnection);
    });
    return () => unsubscribe();
  }, []);

  const handleRetry = () => {
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
      if (state.isConnected && webViewRef.current) webViewRef.current.reload();
    });
  };

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) { webViewRef.current.goBack(); return true; }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  const completeOnboarding = async () => {
    try { await AsyncStorage.setItem('hasLaunched', 'true'); } catch {}
    setIsFirstLaunch(false);
  };

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length > 0) setCurrentIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const authInjectionScript = `
    window.localStorage.setItem('is_dealit_app', 'true');
    ${nativeToken ? `window.localStorage.setItem('dealit_token', '${nativeToken}');` : ''}
    ${nativeUser ? `window.localStorage.setItem('dealit_user', '${nativeUser.replace(/'/g, "\\'")}');` : ''}
    true;
  `;

  const catchErrorsScript = `
    (function() {
      window.onerror = function(message, source, lineno, colno, error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WINDOW_ERROR', message: message, line: lineno, col: colno,
          errorStack: error ? error.stack : 'No stack trace'
        }));
        return true;
      };
      window.addEventListener('unhandledrejection', function(event) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'PROMISE_REJECTION',
          message: event.reason ? event.reason.toString() : 'Unknown Promise Rejection',
          stack: event.reason && event.reason.stack ? event.reason.stack : 'No stack trace'
        }));
      });
      const originalConsoleError = console.error;
      console.error = function(...args) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'CONSOLE_ERROR',
          message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')
        }));
        originalConsoleError.apply(console, args);
      };
    })();
    true;
  `;

  if (!appIsReady || isFirstLaunch === null || isAuthChecking) return null;

  if (isFirstLaunch === true) {
    const buttonBackgroundColor = scrollX.interpolate({
      inputRange: ONBOARDING_DATA.map((_, i) => i * width),
      outputRange: ONBOARDING_DATA.map(item => item.color),
      extrapolate: 'clamp'
    });

    return (
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <View style={styles.skipContainer}>
            <TouchableOpacity onPress={completeOnboarding}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={ONBOARDING_DATA}
            renderItem={({ item, index }) => {
              const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
              const iconScale = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });
              const textTranslateY = scrollX.interpolate({ inputRange, outputRange: [60, 0, 60], extrapolate: 'clamp' });
              const contentOpacity = scrollX.interpolate({ inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp' });
              return (
                <View style={styles.slide}>
                  <Animated.View style={[styles.glowRing, { backgroundColor: item.color, opacity: contentOpacity, transform: [{ scale: iconScale }] }]} />
                  <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
                    <Ionicons name={item.iconName} size={46} color="#ffffff" />
                  </Animated.View>
                  <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: textTranslateY }], alignItems: 'center' }}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                  </Animated.View>
                </View>
              );
            }}
            horizontal showsHorizontalScrollIndicator={false} pagingEnabled bounces={false}
            keyExtractor={(item) => item.id}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
            scrollEventThrottle={32}
            onViewableItemsChanged={viewableItemsChanged}
            viewabilityConfig={viewConfig}
            ref={slidesRef}
          />
          <View style={styles.footer}>
            <View style={styles.indicatorContainer}>
              {ONBOARDING_DATA.map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 32, 8], extrapolate: 'clamp' });
                const opacity = scrollX.interpolate({ inputRange, outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' });
                const dotColor = scrollX.interpolate({ inputRange, outputRange: ['#ffffff', ONBOARDING_DATA[i].color, '#ffffff'], extrapolate: 'clamp' });
                return <Animated.View style={[styles.dot, { width: dotWidth, opacity, backgroundColor: dotColor }]} key={i.toString()} />;
              })}
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={() => {
              if (currentIndex < ONBOARDING_DATA.length - 1) {
                slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
              } else { completeOnboarding(); }
            }}>
              <Animated.View style={[styles.button, { backgroundColor: buttonBackgroundColor }]}>
                <Text style={styles.buttonText}>{currentIndex === ONBOARDING_DATA.length - 1 ? "Let's Deal!" : "Continue"}</Text>
                <Ionicons name={currentIndex === ONBOARDING_DATA.length - 1 ? "checkmark-circle-outline" : "arrow-forward"} size={24} color="#ffffff" style={{ marginLeft: 8 }} />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!isConnected) {
    return (
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          <OfflineGameScreen onRetry={handleRetry} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!nativeToken) {
    return (
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#3A1078' }}>
          <StatusBar barStyle="light-content" backgroundColor="#3A1078" />
          <AuthScreen 
            onLoginSuccess={(user, token) => {
              setNativeUser(JSON.stringify(user));
              setNativeToken(token);
            }} 
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const isReadyToHideLoader = minLoadTimePassed && isWebLoaded;

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#7A43E6" />
        <AnimatedLoader isReadyToHide={isReadyToHideLoader} />
        <WebView
          ref={webViewRef}
          source={{ uri: WEBSITE_URL }}
          style={{ flex: 1, backgroundColor: '#000000' }}
          onLoadEnd={() => {
            setIsWebLoaded(true);
          }}
          onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
          renderError={() => <OfflineGameScreen onRetry={handleRetry} />}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          mixedContentMode="always"
          webviewDebuggingEnabled={true}
          
          injectedJavaScriptBeforeContentLoaded={authInjectionScript}
          injectedJavaScript={catchErrorsScript}
          originWhitelist={['*']}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          onMessage={(event) => {
            try {
              const parsedData = JSON.parse(event.nativeEvent.data);

              if (parsedData.type === 'LOGOUT_REQUEST') {
                AsyncStorage.removeItem('dealit_user');
                AsyncStorage.removeItem('dealit_token');
                setNativeToken(null);
                setNativeUser(null);
                return;
              }

              if (parsedData.type === 'DOWNLOAD_PDF') {
                downloadAndSharePDF(parsedData.base64, parsedData.filename);
                return;
              }

           if (parsedData.type === 'NATIVE_SHARE') {
                
                Share.share({
                  title: parsedData.title,
                  message: Platform.OS === 'android' ? `${parsedData.message}\n${parsedData.url}` : parsedData.message,
                  url: Platform.OS === 'ios' ? parsedData.url : undefined
                });
                return;
              }

              if (parsedData.type === 'START_NATIVE_SPEECH') {
                Speech.speak(parsedData.text, {
                  pitch: 1,
                  rate: 0.95,
                  onDone: () => notifyWebUI('SPEECH_FINISHED'),
                  onStopped: () => notifyWebUI('SPEECH_FINISHED'),
                  onError: () => notifyWebUI('SPEECH_FINISHED')
                });
                return;
              }

              if (parsedData.type === 'STOP_NATIVE_SPEECH') {
                Speech.stop();
                return;
              }

              if (['WINDOW_ERROR', 'PROMISE_REJECTION', 'CONSOLE_ERROR'].includes(parsedData.type)) {
                console.log(`[WEB ${parsedData.type}] ${parsedData.message}`);
              }
            } catch (e) {
            }
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loadingContainer: {
    position: 'absolute', height: '100%', width: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'transparent', zIndex: 999,
  },
  loaderText: { color: '#ffffff', fontSize: 24, fontWeight: '800', letterSpacing: 2 },
  
  premiumText: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: 2,
  },
  breathingGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(167, 139, 250, 0.4)',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 10,
  },

  loaderDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  loaderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    marginHorizontal: 5,
    opacity: 0.9,
  },
  
  slide: {
    width, flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 30, paddingBottom: 80,
  },
  glowRing: {
    position: 'absolute', width: width * 0.7, height: width * 0.7,
    borderRadius: width, top: height * 0.15, opacity: 0.15, filter: [{ blur: 50 }],
  },
  iconContainer: {
    width: 100, height: 100, borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 50,
  },
  title: { color: '#ffffff', fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 16, letterSpacing: 0.5 },
  description: { color: '#888888', fontSize: 16, textAlign: 'center', lineHeight: 26, paddingHorizontal: 20, fontWeight: '400' },
  footer: { paddingHorizontal: 24, paddingBottom: 40 },
  indicatorContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  dot: { height: 6, borderRadius: 3, marginHorizontal: 4 },
  button: {
    flexDirection: 'row', paddingVertical: 18, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ffffff', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 5,
  },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  skipContainer: { alignItems: 'flex-end', paddingRight: 24, paddingTop: 10, zIndex: 10 },
  skipText: { color: '#666666', fontSize: 16, fontWeight: '600' }
});