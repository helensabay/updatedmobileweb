import React, { useState, useRef, useEffect } from 'react';
import {
View,
Text,
TouchableOpacity,
StyleSheet,
ImageBackground,
Image,
ScrollView,
Animated,
Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import {
useFonts,
Roboto_400Regular,
Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { Ionicons } from '@expo/vector-icons';
import { confirmPayment, fetchOrderDetails, fetchGcashQR } from '../../api/api';
import Success from './success';

export default function Payment() {
const router = useRouter();
const { orderType, total, selectedTime, orderId } = useLocalSearchParams();

const [selectedPayment, setSelectedPayment] = useState(null);
const [showSuccess, setShowSuccess] = useState(false);
const [loading, setLoading] = useState(false);
const [orderItems, setOrderItems] = useState([]);
const [gcashQR, setGcashQR] = useState(null);

const fadeAnim = useRef(new Animated.Value(0)).current;

// Load order items
useEffect(() => {
if (!orderId) return;
const loadOrder = async () => {
try {
const data = await fetchOrderDetails(orderId);
setOrderItems(data.items || []);
} catch (err) {
console.log('Failed to fetch order items', err);
}
};
loadOrder();
}, [orderId]);

// Load GCash QR when payment selected
useEffect(() => {
if (!orderId || selectedPayment !== 'gcash') return;
const loadQR = async () => {
try {
const res = await fetchGcashQR(orderId);
if (res.success) setGcashQR(res.qr_url);
} catch (err) {
console.log('Failed to fetch GCash QR', err);
Alert.alert('Error', 'Unable to fetch GCash QR. Please try again.');
}
};
loadQR();
}, [orderId, selectedPayment]);

// Animate success popup
useEffect(() => {
if (showSuccess) {
Animated.timing(fadeAnim, {
toValue: 1,
duration: 400,
useNativeDriver: true,
}).start();
} else {
fadeAnim.setValue(0);
}
}, [showSuccess]);

let [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });
if (!fontsLoaded) return null;

if (!orderType || !total || !selectedTime || !orderId) {
return ( <View style={styles.container}> <Text style={styles.errorText}>
Missing order details. Go back to the cart. </Text>
<TouchableOpacity style={styles.backBtn} onPress={() => router.back()}> <Text style={styles.backBtnText}>Back to Cart</Text> </TouchableOpacity> </View>
);
}

// Poll payment status
const pollPaymentStatus = async (method, interval = 3000, timeout = 30000) => {
return new Promise((resolve) => {
let elapsed = 0;
const timer = setInterval(async () => {
elapsed += interval;
try {
const res = await confirmPayment(orderId, method);
if (res.success) {
clearInterval(timer);
resolve(true);
} else if (elapsed >= timeout) {
clearInterval(timer);
resolve(false);
}
} catch {
clearInterval(timer);
resolve(false);
}
}, interval);
});
};

// Handle payment selection
const handlePaymentSelect = async (method) => {
setSelectedPayment(method);
if (loading) return;
setLoading(true);

if (method === 'gcash') {
  if (!gcashQR) {
    Alert.alert('Error', 'Unable to fetch GCash QR. Please try again.');
    setLoading(false);
    return;
  }

  // Show QR and poll payment
  const success = await pollPaymentStatus(method);
  setLoading(false);
  if (success) setShowSuccess(true);
  else Alert.alert('Payment Failed', 'GCash payment not confirmed.');
} else if (method === 'counter') {
  try {
    const res = await confirmPayment(orderId, method);
    setLoading(false);
    if (res.success) setShowSuccess(true);
    else Alert.alert('Payment Failed', res.message || 'Cannot confirm counter payment.');
  } catch {
    setLoading(false);
    Alert.alert('Error', 'Failed to confirm payment. Try again.');
  }
}

};

return ( <ScrollView style={styles.container}>
{/* Header */}
<ImageBackground
source={require('../../../assets/drop_1.png')}
resizeMode="cover"
style={styles.headerBackground}
> <View style={styles.overlay} /> <View style={styles.headerContainer}> <View style={styles.headerTopRow}>
<TouchableOpacity onPress={() => router.back()}> <Ionicons name="arrow-back" size={26} color="black" /> </TouchableOpacity> <Text style={styles.headerTitle}>Payment Page</Text> <Ionicons name="card-outline" size={26} color="black" /> </View> </View> </ImageBackground>

  {/* Receipt */}
  <View style={styles.receiptCard}>
    <Text style={styles.receiptHeader}>Order Receipt</Text>
    <View style={styles.line} />
    <View style={styles.receiptRow}>
      <Text style={styles.label}>Order Type</Text>
      <Text style={styles.value}>{orderType.toUpperCase()}</Text>
    </View>
    <View style={styles.receiptRow}>
      <Text style={styles.label}>Pickup Time</Text>
      <Text style={styles.value}>{selectedTime}</Text>
    </View>
    <View style={styles.line} />

    {orderItems.length > 0 &&
      orderItems.map((item, index) => (
        <View key={index} style={styles.receiptRow}>
          <Text style={styles.label}>
            {item.name} x {item.quantity}
          </Text>
          <Text style={styles.value}>₱{(item.price * item.quantity).toFixed(2)}</Text>
        </View>
      ))}

    <View style={styles.line} />
    <View style={styles.receiptRow}>
      <Text style={[styles.label, { fontWeight: 'bold' }]}>Total</Text>
      <Text style={[styles.value, { fontWeight: 'bold' }]}>₱{parseFloat(total).toFixed(2)}</Text>
    </View>
  </View>

  {/* Payment Buttons */}
  <TouchableOpacity
    style={[styles.paymentBtn, selectedPayment === 'gcash' ? styles.selectedBtn : {}]}
    onPress={() => handlePaymentSelect('gcash')}
  >
    <Image
      source={require('../../../assets/gcash.png')}
      style={styles.icon}
      resizeMode="contain"
    />
    <Text style={styles.paymentText}>Pay with GCash</Text>
  </TouchableOpacity>

  {/* GCash QR */}
  {selectedPayment === 'gcash' && gcashQR && (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
        Scan this QR in your GCash app
      </Text>
      <QRCode value={gcashQR} size={200} />
    </View>
  )}

  <TouchableOpacity
    style={[styles.paymentBtn, selectedPayment === 'counter' ? styles.selectedBtn : {}]}
    onPress={() => handlePaymentSelect('counter')}
  >
    <Image
      source={require('../../../assets/cash.png')}
      style={styles.icon}
      resizeMode="contain"
    />
    <Text style={styles.paymentText}>Pay at Counter</Text>
  </TouchableOpacity>

  {loading && (
    <Text style={{ textAlign: 'center', marginTop: 10, color: '#f97316' }}>
      Waiting for payment confirmation...
    </Text>
  )}

  {/* Success Popup */}
  <Success visible={showSuccess} orderId={orderId} />
</ScrollView>

);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#fdfdfd' },
headerBackground: { width: '100%', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden', paddingBottom: 8 },
overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(254,192,117,0.5)' },
headerContainer: { paddingTop: 50, paddingBottom: 12, paddingHorizontal: 12 },
headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
headerTitle: { fontSize: 28, fontFamily: 'Roboto_700Bold', color: '#1F2937' },
receiptCard: { width: '90%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ccc', padding: 16, marginVertical: 20, alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
receiptHeader: { fontSize: 20, fontFamily: 'Roboto_700Bold', marginBottom: 12, color: '#333' },
receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
label: { fontSize: 16, fontFamily: 'Roboto_400Regular', color: '#555' },
value: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#333' },
line: { borderBottomColor: '#ccc', borderBottomWidth: 1, marginVertical: 8 },
paymentBtn: { flexDirection: 'row', alignItems: 'center', width: '85%', paddingVertical: 14, borderRadius: 16, justifyContent: 'center', marginVertical: 8, alignSelf: 'center', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 4 },
selectedBtn: { backgroundColor: '#f0fdf4', borderColor: '#22c55e', borderWidth: 2 },
paymentText: { color: '#333', fontFamily: 'Roboto_700Bold', fontSize: 16, marginLeft: 12 },
icon: { width: 60, height: 40 },
errorText: { fontSize: 18, color: '#C00F0C', fontFamily: 'Roboto_700Bold', textAlign: 'center', marginBottom: 20 },
backBtn: { backgroundColor: '#f97316', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: '#e67e22', alignSelf: 'center' },
backBtnText: { color: '#fff', fontFamily: 'Roboto_700Bold', fontSize: 16 },
});
