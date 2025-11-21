import React, { useState } from 'react';
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
  Modal,
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
import { createOrder } from '../../api/api'; // ✅ added import

export default function CustomerCartScreen() {
  const router = useRouter();
  const { cart, removeFromCart, increaseQuantity, decreaseQuantity } = useCart();

  const [selectedTime, setSelectedTime] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [orderType, setOrderType] = useState(null);
  const [loading, setLoading] = useState(false);

  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const pickupTimes = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM'];

  // Proceed to show modal
  const handleProceed = () => {
    if (!selectedTime) {
      Alert.alert('Pickup Time Required', 'Please select a pickup time before proceeding.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Cart is empty', 'Please add items to your cart.');
      return;
    }
    setShowModal(true);
  };

  // ✅ Create order and go to payment
  const goToPayment = async (type) => {
    try {
      setLoading(true);
      const res = await createOrder(type, total, selectedTime, cart);
      setLoading(false);

      if (res.success) {
        setShowModal(false);
        router.push({
          pathname: '/cart/payment',
          params: {
            orderType: type,
            total: total,
            selectedTime: selectedTime,
            orderId: res.order_id, // ✅ backend order ID
          },
        });
      } else {
        Alert.alert('Order Error', res.error || 'Failed to create order.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Something went wrong while creating your order.');
    }
  };

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
    </View>
  );

  if (!fontsLoaded) {
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

      {/* Modal for Dine-in / Takeout */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={{ alignItems: 'center' }}>
            <View style={styles.circleChoiceContainer}>
              <TouchableOpacity
                onPress={() => goToPayment('dinein')}
                style={[styles.circleBtn, orderType === 'dinein' && styles.circleBtnSelected]}
              >
                <Image source={require('../../../assets/dinein.png')} style={styles.circleImage} />
                <Text style={[styles.circleText, orderType === 'dinein' && styles.circleTextSelected]}>
                  DINE-IN
                </Text>
              </TouchableOpacity>

              <Text style={styles.orText}>OR</Text>

              <TouchableOpacity
                onPress={() => goToPayment('takeout')}
                style={[styles.circleBtn, orderType === 'takeout' && styles.circleBtnSelected]}
              >
                <Image source={require('../../../assets/takeout.png')} style={styles.circleImage} />
                <Text style={[styles.circleText, orderType === 'takeout' && styles.circleTextSelected]}>
                  TAKEOUT
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={{ color: '#fff', marginTop: 8 }}>Creating your order...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  headerBackground: {
    width: '100%',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(254,192,117,0.5)' },
  headerContainer: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 14 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 30, fontFamily: 'Roboto_700Bold', color: 'black' },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: '#f97316',
  },
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

  addMoreBtn: {
    backgroundColor: '#f97316',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'stretch',
    marginVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMoreText: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#fff' },

  pickupContainer: { paddingHorizontal: 12, marginVertical: 10 },
  pickupLabel: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#333', marginBottom: 6 },
  pickupTimeBtn: {
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  pickupTimeSelected: { backgroundColor: '#f97316' },
  pickupTimeText: { fontSize: 14, fontFamily: 'Roboto_400Regular', color: '#333' },

  proceedBtn: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  proceedText: { color: '#fff', fontFamily: 'Roboto_700Bold', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleChoiceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 10,
  },
  circleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 12,
    elevation: 4,
    borderWidth: 4,
    borderColor: 'black',
  },
  circleBtnSelected: { borderColor: '#f97316', backgroundColor: '#fff7f2' },
  circleImage: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 3, transform: [{ scale: 1.1 }] },
  circleText: { fontSize: 14, fontFamily: 'Roboto_700Bold', color: '#333' },
  circleTextSelected: { color: '#f97316' },
  orText: { fontSize: 24, fontFamily: 'Roboto_700Bold', color: 'white', marginHorizontal: 3, alignSelf: 'center' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
