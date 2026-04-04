import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, StatusBar, BackHandler, ActivityIndicator, View, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const WEBSITE_URL = 'https://dealit-phase2.vercel.app';
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    (async () => {
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);

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

  const LoadingIndicatorView = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator color="#ffffff" size="large" />
      <Text style={{marginTop: 10, color: '#ffffff'}}>Loading DealIt...</Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <WebView
          ref={webViewRef}
          source={{ uri: WEBSITE_URL }}
          style={{ flex: 1, backgroundColor: '#000000' }}
          startInLoadingState={true}
          renderLoading={LoadingIndicatorView}
          onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
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
    backgroundColor: '#000000',
    zIndex: 999,
  }
});