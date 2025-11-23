// app/(tabs/success.jsx)
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Success({ visible, orderId }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Navigate after 2 seconds
      const timer = setTimeout(() => {
        router.replace(`/order-tracking?orderId=${orderId}`);
      }, 2000);

      // Cleanup in case modal closes early
      return () => clearTimeout(timer);
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.successBox, { opacity: fadeAnim }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={50} color="#22c55e" />
          </View>
          <Text style={styles.successTitle}>Payment Successful!</Text>
          <Text style={styles.successMessage}>
            Thank you for your order #{orderId}! {'\n'}
            We’ll have it ready for pickup soon.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  successBox: { backgroundColor: '#fff', padding: 26, borderRadius: 24, alignItems: 'center', width: '80%' },
  checkCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 5, borderColor: '#22c55e' },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#16a34a', marginBottom: 10, textAlign: 'center' },
  successMessage: { fontSize: 16, color: '#374151', textAlign: 'center', marginBottom: 15, lineHeight: 22 },
});
