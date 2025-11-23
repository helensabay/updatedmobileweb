// app/(tabs)/OrderStatus.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchOrderStatus } from '../../api/api'; // Add this in your API.js

export default function OrderStatus() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Steps in order process
  const steps = [
    'Order Placed',
    'Order Accepted',
    'Preparing Order',
    'Completed',
  ];

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const statusIndex = await fetchOrderStatus(orderId); // fetches step index from backend
        setCurrentStep(statusIndex);
      } catch (err) {
        console.error('Failed to fetch order status:', err);
        setError('Unable to load order status.');
      } finally {
        setLoading(false);
      }
    };
    if (orderId) loadStatus();
  }, [orderId]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <ActivityIndicator size="large" color="#b91c1c" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>
          Loading order status...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: '#b91c1c', fontSize: 16 }}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="black" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Order Status</Text>
        <Ionicons name="receipt-outline" size={26} color="black" />
      </View>

      {/* Order ID */}
      <Text style={styles.orderId}>Order ID: {orderId}</Text>

      {/* Status Steps */}
      <ScrollView contentContainerStyle={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isActive = index <= currentStep;
          return (
            <View key={index} style={styles.stepRow}>
              <View
                style={[
                  styles.circle,
                  { backgroundColor: isActive ? '#b91c1c' : '#e5e7eb' },
                ]}
              >
                <Ionicons
                  name={isActive ? 'checkmark' : 'ellipse-outline'}
                  size={16}
                  color="white"
                />
              </View>
              <Text
                style={[
                  styles.stepText,
                  { color: isActive ? '#b91c1c' : '#6b7280' },
                ]}
              >
                {step}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 20,
    color: '#374151',
  },
  stepsContainer: { paddingVertical: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepText: { fontSize: 16, fontWeight: '600' },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
});