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
  Switch,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import { useRouter } from 'expo-router';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getValidToken, createOrder } from '../../api/api';

export default function CustomerCartScreen() {
  const router = useRouter();
  const { cart, removeFromCart, increaseQuantity, decreaseQuantity } = useCart();

  const [selectedTime, setSelectedTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [creditPoints, setCreditPoints] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [savedAmount, setSavedAmount] = useState(0);
  const [showSavedAnim] = useState(new Animated.Value(0));

  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });

  const total = cart.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 0;
    return sum + price * qty;
  }, 0);

  const discount = useCredit && total >= 100 ? Math.min(creditPoints, total) : 0;
  const finalTotal = Math.max(total - discount, 0);

  const pickupTimes = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'];

  // ------------------------------
  // FETCH USER & CREDIT POINTS
  // ------------------------------
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = await getValidToken();
        if (!token) throw new Error('No valid token found. Please log in again.');

        // Fetch user profile
        const userRes = await api.get('/accounts/profile/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = userRes.data;
        if (user) setCustomerName(user.name || '');

        // Fetch credit points
        const pointsRes = await api.get('/orders/user-credit-points/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const points = pointsRes.data?.credit_points ?? 0;
        setCreditPoints(points);

        await AsyncStorage.setItem('@sanaol/auth/points', String(points));
      } catch (err) {
        console.error('Failed to fetch user data or credit points:', err.response?.data || err.message);
        Alert.alert('Error', 'Failed to fetch user info. Please log in again.');
      }
    };

    fetchUserData();
  }, []);

  const toggleUseCredit = () => {
    if (useCredit) {
      setUseCredit(false);
      return;
    }
    if (total < 100) {
      Alert.alert('Not eligible', 'Orders must be ₱100 or more to use credit points.');
      return;
    }
    if (!creditPoints || creditPoints <= 0) {
      Alert.alert('No credit points', 'You have no credit points to use.');
      return;
    }
    setUseCredit(true);
  };

  const startSavedAnimation = () => {
    setSavedAmount(discount);
    Animated.sequence([
      Animated.timing(showSavedAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(showSavedAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSavedAmount(0));
  };

  // ------------------------------
  // HANDLE ORDER & PAYMENT
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
    // 1️⃣ Get latest token
    const token = await getValidToken();
    if (!token) throw new Error('No valid token found. Please log in again.');

    // 2️⃣ Fetch latest credit points from backend
    const pointsRes = await api.get('/orders/user-credit-points/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const availablePoints = parseFloat(pointsRes.data?.credit_points ?? 0);

    // 3️⃣ Determine discount to apply
    let discountUsed = 0;
    if (useCredit && total >= 100) {
      discountUsed = Math.min(availablePoints, total); // clamp to available points
      if (discountUsed <= 0) {
        Alert.alert('Insufficient credit points', 'You do not have enough points to use.');
        setLoading(false);
        return;
      }
    }

    // 4️⃣ Convert selectedTime to ISO format
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

    // 5️⃣ Build payload for backend
    const payload = {
      customer_name: customerName,
      order_type: 'pickup',
      total_amount: total, // send full total to backend
      promised_time: pickupDate.toISOString(),
      credit_points_used: parseFloat(discountUsed.toFixed(2)),
      items: cart.map((item) => ({
        menu_item_id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: Number(item.quantity),
        size: item.size || null,
        customize: item.customize || null,
      })),
    };

    console.log('Order payload:', payload);

    // 6️⃣ Create order in backend
    const res = await createOrder(payload);
    if (!res.success) {
      Alert.alert('Order Error', res.message || 'Failed to create order');
      setLoading(false);
      return;
    }

    // 7️⃣ Update local credit points
    if (discountUsed > 0) {
      const remainingPoints = Math.max(availablePoints - discountUsed, 0);
      setCreditPoints(remainingPoints);
      await AsyncStorage.setItem('@sanaol/auth/points', String(remainingPoints));
      startSavedAnimation();
    }

    // 8️⃣ Navigate to Payment page with discount
    router.push({
      pathname: '/cart/payment',
      params: {
        orderType: 'pickup',
        total: total.toFixed(2),
        selectedTime,
        orderId: res.order_number,
        discountUsed: discountUsed.toFixed(2), // pass discount here
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
  // RENDER FUNCTIONS
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
      <TouchableOpacity style={styles.addMoreBtn} onPress={() => router.back()}>
        <Text style={styles.addMoreText}>+ Add more items</Text>
      </TouchableOpacity>

      <View style={styles.pickupContainer}>
        <Text style={styles.pickupLabel}>Select Pickup Time:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {pickupTimes.map((time) => (
            <TouchableOpacity
              key={time}
              style={[styles.pickupTimeBtn, selectedTime === time && styles.pickupTimeSelected]}
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

      <View style={{ paddingHorizontal: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={styles.discountText}>Credit Points: {creditPoints}</Text>
          <Text style={{ fontFamily: 'Roboto_400Regular', color: '#666', fontSize: 13 }}>
            {total >= 100 ? 'You may use your points for discount' : 'Orders must be ₱100+ to use points'}
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Roboto_700Bold', marginBottom: 6 }}>{useCredit ? 'Using' : 'Use'}</Text>
          <Switch
            value={useCredit}
            onValueChange={toggleUseCredit}
            trackColor={{ false: '#ccc', true: '#f1c40f' }}
            thumbColor={useCredit ? '#f39c12' : '#fff'}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 12, marginTop: 14 }}>
        {discount > 0 && <Text style={styles.discountApplied}>Discount Applied: -₱{discount}</Text>}
        <Text style={styles.finalTotal}>Final Total: ₱{finalTotal}</Text>
      </View>
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

      {savedAmount > 0 && (
        <Animated.View style={[styles.savedToast, { opacity: showSavedAnim }]}>
          <Text style={styles.savedText}>You saved ₱{savedAmount} 🎉</Text>
        </Animated.View>
      )}
    </View>
  );
}

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
  addMoreBtn: { backgroundColor: '#f97316', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'stretch', marginVertical: 12, justifyContent: 'center', alignItems: 'center' },
  addMoreText: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#fff' },
  pickupContainer: { paddingHorizontal: 12, marginVertical: 10 },
  pickupLabel: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#333', marginBottom: 6 },
  pickupTimeBtn: { borderWidth: 1, borderColor: '#f97316', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12, marginRight: 10, marginBottom: 10 },
  pickupTimeSelected: { backgroundColor: '#f97316' },
  pickupTimeText: { fontSize: 14, fontFamily: 'Roboto_400Regular', color: '#333' },
  discountText: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#444' },
  discountApplied: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#c0392b' },
  finalTotal: { fontSize: 20, fontFamily: 'Roboto_700Bold', color: '#27ae60', marginTop: 8 },
  proceedBtn: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#27ae60', paddingVertical: 14, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  proceedText: { color: '#fff', fontFamily: 'Roboto_700Bold', fontSize: 16 },
  savedToast: { position: 'absolute', bottom: 110, left: 40, right: 40, paddingVertical: 10, backgroundColor: '#fff7ed', borderRadius: 12, borderWidth: 1, borderColor: '#f5b041', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  savedText: { fontFamily: 'Roboto_700Bold', color: '#d35400', fontSize: 16 },
});
