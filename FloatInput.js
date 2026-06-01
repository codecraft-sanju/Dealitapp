import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

const styles = StyleSheet.create({
  inputContainer: { height: 56, backgroundColor: '#f8f6ff', borderWidth: 1.5, borderColor: '#e9d8ff', borderRadius: 14, marginBottom: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  inputContainerFocused: { borderColor: '#6B46C1', backgroundColor: '#ffffff' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: '100%', paddingTop: 16, fontSize: 15, color: '#1f2937', fontWeight: '600' },
  eyeIcon: { padding: 8 }
});

export default FloatInput;