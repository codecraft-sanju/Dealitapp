import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

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
    Animated.timing(timerAnim, { toValue: 0, duration, easing: Easing.linear, useNativeDriver: false })
      .start(({ finished }) => { if (finished) setGameOver(true); });
  };

  useEffect(() => { if (!gameOver) startTimer(score); }, [gameOver]);

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
    setCurrentIcon(ICONS_LIST[Math.floor(Math.random() * ICONS_LIST.length)]);
    const randomX = Math.max(20, Math.random() * (width - 90));
    const randomY = Math.max(20, Math.random() * (height - 400));
    Animated.sequence([
      Animated.timing(targetScale, { toValue: 0.5, duration: 50, useNativeDriver: true }),
      Animated.spring(targetScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    Animated.spring(position, { toValue: { x: randomX, y: randomY }, friction: 6, tension: 60, useNativeDriver: true }).start();
    startTimer(newScore);
  };

  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const timerColor = timerAnim.interpolate({ inputRange: [0, 0.3, 1], outputRange: ['#FF4B4B', '#F5A623', '#50E3C2'] });

  return (
    <View style={styles.offlineContainer}>
      <View style={styles.offlineHeader}>
        <Text style={styles.offlineTitle}>You're Offline!</Text>
        <Text style={styles.offlineDescription}>Time Attack: Catch the deals before time runs out!</Text>
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
          <Animated.View style={[styles.gameTargetContainer, { transform: [{ translateX: position.x }, { translateY: position.y }, { scale: targetScale }] }]}>
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

const styles = StyleSheet.create({
  offlineContainer: { flex: 1, backgroundColor: '#000000' },
  offlineHeader: { paddingTop: 40, paddingHorizontal: 30, alignItems: 'center', zIndex: 10 },
  offlineTitle: { color: '#ffffff', fontSize: 26, fontWeight: '900', marginBottom: 4 },
  offlineDescription: { color: '#888888', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  scoreBoard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20,
    gap: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  timerContainer: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 30, marginTop: 20, borderRadius: 3, overflow: 'hidden',
  },
  timerBar: { height: '100%', borderRadius: 3 },
  gameArea: { flex: 1, position: 'relative', overflow: 'hidden' },
  gameTargetContainer: { position: 'absolute', top: 0, left: 0 },
  gameTargetBox: {
    width: 75, height: 75, backgroundColor: '#A991E4', borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#A991E4', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.6, shadowRadius: 15, elevation: 8,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  gameOverContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gameOverText: { color: '#ffffff', fontSize: 32, fontWeight: '900', marginBottom: 8 },
  finalScoreText: { color: '#888888', fontSize: 18, marginBottom: 24 },
  playAgainButton: {
    flexDirection: 'row', backgroundColor: '#A991E4',
    paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center',
  },
  playAgainText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  offlineFooter: { padding: 30, paddingBottom: 50, alignItems: 'center', zIndex: 10 },
  retryButton: {
    flexDirection: 'row', backgroundColor: '#333333',
    paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#555555',
  },
  retryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});

export default OfflineGameScreen;