import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const coinGradients = [
  ['#FFF099', '#FBBF24', '#D97706'],
  ['#FEF08A', '#F59E0B', '#B45309'],
  ['#FDE047', '#EAB308', '#92400E']
];

const AnimatedParticle = ({ index }) => {
  const fallAnim = useRef(new Animated.Value(0)).current;
  
  const isSparkle = index % 5 === 0;
  const size = useMemo(() => Math.random() * 16 + 12, []);
  const leftPos = useMemo(() => Math.random() * width, []);
  
  const duration = useMemo(() => Math.random() * 2500 + 2000, []);
  const delay = useMemo(() => Math.random() * 500, []);
  const gradient = useMemo(() => coinGradients[Math.floor(Math.random() * coinGradients.length)], []);

  useEffect(() => {
    Animated.timing(fallAnim, {
      toValue: 1,
      duration: duration,
      delay: delay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [fallAnim, duration, delay]);

  const translateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, height + 100],
  });

  const rotateX = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg'],
  });

  const rotateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  const opacity = fallAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 1, 0],
  });

  const animatedStyle = {
    position: 'absolute',
    left: leftPos,
    transform: [
      { translateY },
      { rotateX },
      { rotateY }
    ],
    opacity,
  };

  if (isSparkle) {
    return (
      <Animated.View style={[animatedStyle, { width: size, height: size, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="sparkles" size={size} color="#FDE047" style={styles.sparkleShadow} />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <LinearGradient
        colors={gradient}
        style={[styles.coin, { width: size, height: size, borderRadius: size / 2 }]}
        start={{ x: 0.2, y: 0.2 }}
        end={{ x: 0.8, y: 1 }}
      />
    </Animated.View>
  );
};

export default function CoinCelebration({ coinCount = 40 }) {
  const particles = Array.from({ length: coinCount });

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((_, i) => (
        <AnimatedParticle key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    overflow: 'hidden',
  },
  coin: {
    borderWidth: 1,
    borderColor: '#D97706',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sparkleShadow: {
    textShadowColor: 'rgba(253,224,71,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  }
});