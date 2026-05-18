import React, { useRef, useState, useEffect, useCallback } from 'react';
import { StyleSheet, StatusBar, BackHandler, View, Text, FlatList, Dimensions, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Welcome to DealIt',
    description: 'Trade what you have for what you want. Not every deal requires cash.',
    iconName: 'swap-horizontal-outline',
    color: '#4A90E2', 
  },
  {
    id: '2',
    title: 'Smart Barter & Credits',
    description: 'Exchange items directly or earn credits through successful deals to use later.',
    iconName: 'wallet-outline',
    color: '#F5A623', 
  },
  {
    id: '3',
    title: 'Safe & Secure',
    description: 'Connect with verified users. Chat, negotiate, and close deals with confidence.',
    iconName: 'shield-checkmark-outline',
    color: '#50E3C2', 
  },
  {
    id: '4',
    title: 'Ready to Deal?',
    description: 'Join the community and make your first trade today.',
    iconName: 'rocket-outline',
    color: '#E91E63', 
  }
];

const AnimatedLoader = ({ isReadyToHide }) => {
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const glowValue = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ]),
        Animated.sequence([
          Animated.timing(glowValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowValue, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          })
        ])
      ])
    );

    Animated.parallel([
      Animated.timing(opacityValue, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start(() => {
      pulseAnimation.start();
    });

    if (isReadyToHide) {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 500, 
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }

    return () => pulseAnimation.stop();
  }, [isReadyToHide]);

  return (
    <Animated.View style={[styles.loadingContainer, { opacity: containerOpacity }]} pointerEvents={isReadyToHide ? 'none' : 'auto'}>
      <LinearGradient
        colors={['#CBA4FA', '#7A43E6']}
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View style={[
        styles.logoGlow, 
        { 
          opacity: glowValue,
          transform: [{ scale: scaleValue }] 
        }
      ]} />
      <Animated.View style={{ 
        opacity: opacityValue, 
        transform: [{ scale: scaleValue }],
        alignItems: 'center'
      }}>
        <Image 
          source={require('./assets/applogo.png')} 
          style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: 16 }} 
        />
        <Text style={styles.loaderText}>DealIt</Text>
      </Animated.View>
    </Animated.View>
  );
};

const ICONS_LIST = ['cube-outline', 'watch-outline', 'headset-outline', 'game-controller-outline', 'phone-portrait-outline', 'laptop-outline'];

const OfflineGameScreen = ({ onRetry }) => {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentIcon, setCurrentIcon] = useState(ICONS_LIST[0]);
  const position = useRef(new Animated.ValueXY({ x: width / 2 - 40, y: height / 3 })).current;
  const targetScale = useRef(new Animated.Value(1)).current;
  const timerAnim = useRef(new Animated.Value(1)).current;

  const startTimer = (currentScore) => {
    timerAnim.setValue(1);
    const duration = Math.max(600, 2000 - (currentScore * 50));

    Animated.timing(timerAnim, {
      toValue: 0,
      duration: duration,
      easing: Easing.linear,
      useNativeDriver: false, 
    }).start(({ finished }) => {
      if (finished) {
        setGameOver(true);
      }
    });
  };

  useEffect(() => {
    if (!gameOver) {
      startTimer(score);
    }
  }, [gameOver]);

  const startGame = () => {
    setScore(0);
    setGameOver(false);
    position.setValue({ x: width / 2 - 40, y: height / 3 });
  };

  const handleCatch = () => {
    if (gameOver) return;

    timerAnim.stopAnimation();

    const newScore = score + 1;
    setScore(newScore);
    if (newScore > highScore) setHighScore(newScore);

    const randomIcon = ICONS_LIST[Math.floor(Math.random() * ICONS_LIST.length)];
    setCurrentIcon(randomIcon);

    const maxX = width - 90; 
    const maxY = height - 400; 

    const randomX = Math.max(20, Math.random() * maxX);
    const randomY = Math.max(20, Math.random() * maxY);

    Animated.sequence([
      Animated.timing(targetScale, { toValue: 0.5, duration: 50, useNativeDriver: true }),
      Animated.spring(targetScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();

    Animated.spring(position, {
      toValue: { x: randomX, y: randomY },
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();

    startTimer(newScore);
  };

  const timerWidth = timerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  const timerColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#FF4B4B', '#F5A623', '#50E3C2']
  });

  return (
    <View style={styles.offlineContainer}>
      <View style={styles.offlineHeader}>
        <Text style={styles.offlineTitle}>You're Offline!</Text>
        <Text style={styles.offlineDescription}>
          Time Attack: Catch the deals before time runs out!
        </Text>
        <View style={styles.scoreBoard}>
          <Text style={styles.scoreText}>Score: <Text style={{ color: '#A991E4', fontWeight: '900', fontSize: 20 }}>{score}</Text></Text>
          <Text style={styles.scoreText}>Best: {highScore}</Text>
        </View>
      </View>

      <View style={styles.timerContainer}>
        <Animated.View style={[styles.timerBar, { width: timerWidth, backgroundColor: timerColor }]} />
      </View>

      <View style={styles.gameArea}>
        {!gameOver ? (
          <Animated.View
            style={[
              styles.gameTargetContainer,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { scale: targetScale }
                ]
              }
            ]}
          >
            <TouchableOpacity activeOpacity={0.7} onPress={handleCatch} style={styles.gameTargetBox}>
              <Ionicons name={currentIcon} size={38} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.gameOverContainer}>
            <Ionicons name="sad-outline" size={60} color="#FF4B4B" style={{ marginBottom: 10 }} />
            <Text style={styles.gameOverText}>Time's Up!</Text>
            <Text style={styles.finalScoreText}>You caught {score} deals</Text>
            <TouchableOpacity style={styles.playAgainButton} onPress={startGame}>
              <Ionicons name="play-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.playAgainText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.offlineFooter}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Check Connection</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

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

  useEffect(() => {
    (async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (hasLaunched === null) {
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch (error) {
        setIsFirstLaunch(false);
      } finally {
        setAppIsReady(true);
      }
    })();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  useEffect(() => {
    if (isFirstLaunch === false) {
      const timer = setTimeout(() => {
        setMinLoadTimePassed(true);
      }, 2500); 
      
      return () => clearTimeout(timer);
    }
  }, [isFirstLaunch]);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  const handleRetry = () => {
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected && state.isInternetReachable !== false);
      if (state.isConnected && webViewRef.current) {
        webViewRef.current.reload();
      }
    });
  };

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false; 
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      setIsFirstLaunch(false);
    } catch (error) {
      setIsFirstLaunch(false);
    }
  };

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Injection script to forcefully catch Next.js/React frontend errors inside WebView
  const catchErrorsScript = `
    (function() {
      window.onerror = function(message, source, lineno, colno, error) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WINDOW_ERROR',
          message: message,
          line: lineno,
          col: colno,
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

  if (!appIsReady || isFirstLaunch === null) {
    return null;
  }

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
              
              const iconScale = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4],
                extrapolate: 'clamp',
              });

              const textTranslateY = scrollX.interpolate({
                inputRange,
                outputRange: [60, 0, 60],
                extrapolate: 'clamp',
              });

              const contentOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              });

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
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            bounces={false}
            keyExtractor={(item) => item.id}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
              useNativeDriver: false,
            })}
            scrollEventThrottle={32}
            onViewableItemsChanged={viewableItemsChanged}
            viewabilityConfig={viewConfig}
            ref={slidesRef}
          />

          <View style={styles.footer}>
            <View style={styles.indicatorContainer}>
              {ONBOARDING_DATA.map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                const dotWidth = scrollX.interpolate({
                  inputRange,
                  outputRange: [8, 32, 8], 
                  extrapolate: 'clamp',
                });
                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.2, 1, 0.2],
                  extrapolate: 'clamp',
                });
                const dotColor = scrollX.interpolate({
                  inputRange,
                  outputRange: ['#ffffff', ONBOARDING_DATA[i].color, '#ffffff'],
                  extrapolate: 'clamp',
                });

                return <Animated.View style={[styles.dot, { width: dotWidth, opacity, backgroundColor: dotColor }]} key={i.toString()} />;
              })}
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                if (currentIndex < ONBOARDING_DATA.length - 1) {
                  slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
                } else {
                  completeOnboarding();
                }
              }}
            >
              <Animated.View style={[styles.button, { backgroundColor: buttonBackgroundColor }]}>
                <Text style={styles.buttonText}>
                  {currentIndex === ONBOARDING_DATA.length - 1 ? "Let's Deal!" : "Continue"}
                </Text>
                <Ionicons 
                  name={currentIndex === ONBOARDING_DATA.length - 1 ? "checkmark-circle-outline" : "arrow-forward"} 
                  size={24} 
                  color="#ffffff" 
                  style={{marginLeft: 8}}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const isReadyToHideLoader = minLoadTimePassed && isWebLoaded;

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

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#7A43E6" />
        
        <AnimatedLoader isReadyToHide={isReadyToHideLoader} />

        <WebView
          ref={webViewRef}
          source={{ uri: WEBSITE_URL }}
          style={{ flex: 1, backgroundColor: '#000000' }}
          onLoadEnd={() => setIsWebLoaded(true)}
          onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
          renderError={() => (
            <OfflineGameScreen onRetry={handleRetry} />
          )}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          mixedContentMode="always"
          webviewDebuggingEnabled={true}
          injectedJavaScript={catchErrorsScript}
          onMessage={(event) => {
            try {
              const errorData = JSON.parse(event.nativeEvent.data);
              console.log('====================================');
              console.log('🚨 DEALIIT WEBSITE CRASH LOG 🚨');
              console.log('Error Type:', errorData.type);
              console.log('Message:', errorData.message);
              if (errorData.line) console.log('Line Number:', errorData.line);
              console.log('====================================');
            } catch (e) {
              // Ignore non-JSON messages
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
    position: 'absolute',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', 
    zIndex: 999, 
  },
  logoGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ffffff',
    opacity: 0.1,
    filter: [{ blur: 30 }],
  },
  loaderText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 80, 
  },
  glowRing: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width,
    top: height * 0.15,
    opacity: 0.15, 
    filter: [{ blur: 50 }], 
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30, 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  description: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 20, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: {
    color: '#ffffff', 
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipContainer: {
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingTop: 10,
    zIndex: 10, 
  },
  skipText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  offlineHeader: {
    paddingTop: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
    zIndex: 10,
  },
  offlineTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 4,
  },
  offlineDescription: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreBoard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    gap: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  timerContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 30,
    marginTop: 20,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerBar: {
    height: '100%',
    borderRadius: 3,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  gameTargetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gameTargetBox: {
    width: 75,
    height: 75,
    backgroundColor: '#A991E4',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A991E4',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gameOverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
  },
  finalScoreText: {
    color: '#888888',
    fontSize: 18,
    marginBottom: 24,
  },
  playAgainButton: {
    flexDirection: 'row',
    backgroundColor: '#A991E4',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  offlineFooter: {
    padding: 30,
    paddingBottom: 50,
    alignItems: 'center',
    zIndex: 10,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#333333',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#555555',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  }
});