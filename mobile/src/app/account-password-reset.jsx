import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_700Bold,
  Roboto_900Black,
} from '@expo-google-fonts/roboto';

import { requestPasswordReset, confirmPasswordReset } from '../api/api';

export default function AccountPasswordResetScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1 = enter email, 2 = enter code + new password
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load fonts
  let [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
    Roboto_900Black,
  });
  if (!fontsLoaded) return null;

  // Step 1: Request reset code
  const handleRequestReset = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await requestPasswordReset({ email: email.trim() });
      if (response?.data?.message) {
        Alert.alert('Reset Email Sent', `A reset code has been sent to ${email}`);
        setResetStep(2); // Move to next step
      } else {
        Alert.alert('Error', response?.data?.message || 'Email not found');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error or server unreachable');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm code & set new password
  const handleConfirmReset = async () => {
    if (!resetCode || !newPassword) {
      setError('Please fill all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await confirmPasswordReset({
        email: email.trim(),
        reset_code: resetCode.trim(),
        new_password: newPassword,
      });
      if (response?.data?.message) {
        Alert.alert('Success', response.data.message);
          router.push('/account-login');
      } else {
        Alert.alert('Error', response?.data?.message || 'Reset failed');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error or server unreachable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/drop_3.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.3)']}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContainer}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>
            {resetStep === 1
              ? 'Enter your email to reset your password'
              : 'Enter the code sent to your email and your new password'}
          </Text>

          <View style={styles.card}>
            {resetStep === 1 ? (
              <>
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="email-outline" size={20} color="#888" />
                  <TextInput
                    placeholder="Email Address"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Reset Button */}
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleRequestReset}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Reset Code Input */}
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="key-outline" size={20} color="#888" />
                  <TextInput
                    placeholder="Reset Code"
                    value={resetCode}
                    onChangeText={setResetCode}
                    style={styles.input}
                  />
                </View>
                {/* New Password Input */}
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="lock-outline" size={20} color="#888" />
                  <TextInput
                    placeholder="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    style={styles.input}
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Confirm Button */}
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleConfirmReset}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Submitting...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Back to Login */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                marginTop: 20,
              }}
            >
              <Text style={{ color: '#666' }}>Remembered your password? </Text>
              <TouchableOpacity onPress={() => router.push('/account-login')}>
                <Text style={{ color: '#FF8C00', fontFamily: 'Roboto_700Bold' }}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 40,
  },
  container: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontFamily: 'Roboto_900Black',
    color: '#333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Roboto_400Regular',
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 5,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Roboto_400Regular',
  },
  errorText: { color: 'red', marginBottom: 5, marginLeft: 5 },
  button: {
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontFamily: 'Roboto_700Bold', fontSize: 16 },
});
