import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import api, { getValidToken, createOrder } from '../../api/api';

export default function CustomerCartScreen() {
  const router = useRouter();
  const { cart, removeFromCart, increaseQuantity, decreaseQuantity } = useCart();

  const [selectedTime, setSelectedTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });

  const [orderStatus, setOrderStatus] = useState(null); // live status

  const total = cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

  const finalTotal = total;

  const pickupTimes = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'];

  // ------------------------------
  // FETCH USER
  // ------------------------------
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await getValidToken();
        if (!token) throw new Error('No valid token found.');

        const userRes = await api.get('/accounts/profile/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = userRes.data;
        if (user) setCustomerName(user.name || '');
      } catch (err) {
        console.error('Failed to fetch user data:', err.response?.data || err.message);
        Alert.alert('Error', 'Failed to fetch user info. Please log in again.');
      }
    };
    fetchUserData();
  }, []);

  // ------------------------------
  // HANDLE ORDER
  // ------------------------------
  const handleProceed = () => {
    if (!customerName) {
      Alert.alert('User not loaded', 'Please log in first.');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Pickup Time Required', 'Please select a pickup time before proceeding.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Please add items to your cart.');
      return;
    }
    goToPayment();
  };

  const goToPayment = async () => {
    setLoading(true);
    try {
      const token = await getValidToken();
      if (!token) throw new Error('No valid token found.');

      // Convert selectedTime to ISO
      const [hour, minutePart] = selectedTime.split(':');
      let [minute, ampm] = minutePart.split(' ');
      let hour24 = parseInt(hour, 10);
      if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
      if (ampm === 'AM' && hour24 === 12) hour24 = 0;
      const now = new Date();
      const pickupDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour24,
        parseInt(minute, 10),
        0
      );

      // Calculate subtotal
      const subtotal = cart.reduce(
        (sum, item) => sum + parseFloat(item.price) * Number(item.quantity),
        0
      );

      const payload = {
        customer_name: customerName,
        order_type: 'pickup',
        subtotal: subtotal,
        total_amount: finalTotal,
        payment_method: 'pending',
        promised_time: pickupDate.toISOString(),
        items: cart.map((item) => ({
          menu_item_id: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: Number(item.quantity),
          size: item.size || null,
          customize: item.customize || null,
        })),
      };

      const res = await createOrder(payload);
      if (!res.success) {
        Alert.alert('Order Error', res.message || 'Failed to create order');
        setLoading(false);
        return;
      }

      setOrderStatus('pending');

      router.push({
        pathname: '/cart/payment',
        params: {
          orderType: 'pickup',
          total: finalTotal.toFixed(2),
          selectedTime,
          orderId: res.order_number,
        },
      });
    } catch (err) {
      console.error('Create Order Error:', err);
      Alert.alert('Order Error', err.message || 'Unable to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // STATUS TRACKER
  // ------------------------------
  const statusSteps = ['pending', 'in_prep', 'in_progress', 'ready', 'completed'];

  const renderStatusTracker = () => {
    if (!orderStatus) return null;

    return (
      <View style={styles.statusContainer}>
        {statusSteps.map((step, index) => {
          const active = statusSteps.indexOf(orderStatus) >= index;
          return (
            <View key={step} style={styles.statusStep}>
              <View
                style={[
                  styles.statusCircle,
                  { backgroundColor: active ? '#27ae60' : '#ccc' },
                ]}
              />
              <Text style={[styles.statusText, { color: active ? '#27ae60' : '#999' }]}>
                {step.replace('_', ' ').toUpperCase()}
              </Text>
              {index < statusSteps.length - 1 && (
                <View style={[styles.statusLine, { backgroundColor: active ? '#27ae60' : '#ccc' }]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // ------------------------------
  // CART ITEM RENDER
  // ------------------------------
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={item.image} style={styles.image} />
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>₱{item.price}</Text>
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => decreaseQuantity(item.id)} style={styles.controlBtn}>
            <Ionicons name="remove" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.qty}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => increaseQuantity(item.id)} style={styles.controlBtn}>
            <Ionicons name="add" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.trashBtn}>
        <Ionicons name="trash-outline" size={22} color="#f97316" />
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => (
    <View>
      <View style={{ paddingHorizontal: 12, marginTop: 14 }}>
        <Text style={styles.finalTotal}>Final Total: ₱{finalTotal}</Text>
      </View>

      <View style={styles.pickupContainer}>
        <Text style={styles.pickupLabel}>Select Pickup Time:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {pickupTimes.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.pickupTimeBtn,
                selectedTime === time && styles.pickupTimeSelected,
              ]}
              onPress={() => setSelectedTime(time)}
            >
              <Text
                style={[
                  styles.pickupTimeText,
                  selectedTime === time && { color: '#fff', fontFamily: 'Roboto_700Bold' },
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {renderStatusTracker()}
    </View>
  );

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/drop_1.png')}
        resizeMode="cover"
        style={styles.headerBackground}
      >
        <View style={styles.overlay} />
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={26} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Cart</Text>
            <Ionicons name="cart-outline" size={26} color="black" />
          </View>
        </View>
      </ImageBackground>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Your cart is empty</Text>
        </View>
      ) : (
        <FlatList
          data={cart}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 150 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={renderFooter}
        />
      )}

      {total > 0 && (
        <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed}>
          <Text style={styles.proceedText}>Proceed to Payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ------------------------------
// STYLES
// ------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  headerBackground: { width: '100%', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden', paddingBottom: 8 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(254,192,117,0.5)' },
  headerContainer: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 14 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 30, fontFamily: 'Roboto_700Bold', color: 'black' },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginVertical: 6, marginHorizontal: 8, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, borderWidth: 2, borderColor: '#f97316' },
  image: { width: 60, height: 60, borderRadius: 10, marginRight: 14 },
  details: { flex: 1 },
  name: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#333' },
  price: { fontSize: 14, fontFamily: 'Roboto_400Regular', color: '#777', marginVertical: 6 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  controlBtn: { backgroundColor: '#e67e22', padding: 6, borderRadius: 20, marginHorizontal: 6 },
  qty: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#333', minWidth: 20, textAlign: 'center' },
  trashBtn: { padding: 8, borderRadius: 10, backgroundColor: '#fff5eb' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 5, fontSize: 18, fontFamily: 'Roboto_400Regular', color: '#999' },
  pickupContainer: { paddingHorizontal: 12, marginVertical: 10 },
  pickupLabel: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#333', marginBottom: 6 },
  pickupTimeBtn: { borderWidth: 1, borderColor: '#f97316', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, marginRight: 10, marginBottom: 10 },
  pickupTimeSelected: { backgroundColor: '#f97316' },
  pickupTimeText: { fontSize: 14, fontFamily: 'Roboto_400Regular', color: '#333' },
  finalTotal: { fontSize: 20, fontFamily: 'Roboto_700Bold', color: '#27ae60', marginTop: 8, paddingHorizontal: 12 },
  proceedBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#27ae60', paddingVertical: 14, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  proceedText: { color: '#fff', fontFamily: 'Roboto_700Bold', fontSize: 16 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 12 },
  statusStep: { flexDirection: 'row', alignItems: 'center' },
  statusCircle: { width: 16, height: 16, borderRadius: 8 },
  statusText: { fontSize: 12, marginHorizontal: 4 },
  statusLine: { width: 24, height: 2, marginHorizontal: 2 },
});
