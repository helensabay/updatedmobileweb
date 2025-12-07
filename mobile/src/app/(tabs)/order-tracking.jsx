import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  ImageBackground,
  Modal,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchUserOrders } from '../../api/api';
import { useFonts, Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { LinearGradient } from 'expo-linear-gradient';

const BACKEND = "http://192.168.1.7:8000";

const statusSteps = ['Pending', 'Accepted', 'In Progress', 'Ready', 'Completed'];
const statusColors = ['#f39c12', '#3498db', '#8e44ad', '#27ae60', '#2ecc71'];
const statusMapping = {
  pending: 0,
  accepted: 1,
  in_progress: 2,
  ready: 3,
  completed: 4,
  cancelled: 0, // Cancelled treated as 0 for display purposes
};

export default function OrderTrackingScreen() {
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [cancelledOrders, setCancelledOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const translateY = useRef(new Animated.Value(0)).current;
  const panResponderRef = useRef(null);

  const loadOrders = async () => {
    try {
      const data = await fetchUserOrders();
      const list = Array.isArray(data) ? data : [];
      setOrders(list.filter(o => (o.status ?? '').toLowerCase() !== 'completed' && (o.status ?? '').toLowerCase() !== 'cancelled'));
      setCompletedOrders(list.filter(o => (o.status ?? '').toLowerCase() === 'completed'));
      setCancelledOrders(list.filter(o => (o.status ?? '').toLowerCase() === 'cancelled'));
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
      setCompletedOrders([]);
      setCancelledOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cancel Order
  const cancelOrder = (orderId) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(`${BACKEND}/orders/orders/${orderId}/cancel/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
              });
              await loadOrders(); // Refresh lists after cancel
              closeDetailModal();
              Alert.alert("Success", "Order canceled successfully!");
            } catch (err) {
              console.error("Cancel failed:", err);
              Alert.alert("Error", "Could not cancel order.");
            }
          },
        },
      ]
    );
  };

  // Reorder
  const reorderItems = async (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    try {
      await Promise.all(
        items.map((item) =>
          fetch(`${BACKEND}/cart/add/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              item_id: item.id,
              quantity: item.quantity ?? 1,
            }),
          })
        )
      );
      Alert.alert("Success", "Items added back to your cart!");
    } catch (err) {
      console.error("Reorder failed:", err);
      Alert.alert("Error", "Unable to reorder items.");
    }
  };

  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 120) {
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            closeDetailModal();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }

  const openDetailModal = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const closeDetailModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const renderStatusBar = (order) => {
    const statusIndex = statusMapping[(order.status || '').toLowerCase()] ?? 0;
    let partialProgress = 0;
    if ((order.status || '').toLowerCase() === 'in_progress' && order.total_items_cached > 0) {
      partialProgress = Math.min(
        (order.partial_ready_items || 0) / (order.total_items_cached || 1),
        1
      );
    }

    return (
      <View style={styles.statusContainer}>
        {statusSteps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor:
                    index < statusIndex
                      ? statusColors[index]
                      : index === statusIndex && partialProgress > 0
                      ? statusColors[index]
                      : '#ccc',
                  opacity: index === statusIndex && partialProgress > 0 ? partialProgress : 1,
                },
              ]}
            />
            {index < statusSteps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor:
                      index < statusIndex
                        ? statusColors[index]
                        : index === statusIndex && partialProgress > 0
                        ? statusColors[index]
                        : '#ccc',
                    opacity: index === statusIndex && partialProgress > 0 ? partialProgress : 1,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderOrderItem = (order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
      0
    );

    return (
      <LinearGradient
        colors={['#fff7f0', '#fff']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.orderCard}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>Order #{order.order_number}</Text>
          <Text
            style={[
              styles.statusText,
              { color: statusColors[statusMapping[(order.status || '').toLowerCase()] ?? 0] },
            ]}
          >
            {(order.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
        </View>

        {renderStatusBar(order)}

        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.noImage]}>
                <Text style={{ color: '#aaa' }}>No Image</Text>
              </View>
            )}
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name || 'Unnamed Item'}</Text>
              {item.size && <Text style={styles.itemDetail}>Size: {item.size}</Text>}
              {item.customize && <Text style={styles.itemDetail}>Customize: {item.customize}</Text>}
              <Text style={styles.itemDetail}>Qty: {item.quantity ?? 0}</Text>
            </View>
            <View style={styles.itemPriceContainer}>
              <Text style={styles.itemPrice}>
                ₱{(item.price || 0).toFixed(2)} × {item.quantity ?? 0}
              </Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.viewMoreButton} onPress={() => openDetailModal(order)}>
          <Text style={styles.viewMoreText}>View Details</Text>
        </TouchableOpacity>

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
        </View>
      </LinearGradient>
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!orders.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={80} color="#ccc" />
        <Text style={styles.emptyText}>No orders found</Text>
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
            <Ionicons name="arrow-back" size={26} color="black" />
            <Text style={styles.headerTitle}>My Orders</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowCompleted(true)}>
                <Ionicons name="list-outline" size={26} color="black" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCancelled(true)}>
                <Ionicons name="trash-outline" size={26} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>

      <FlatList
        data={orders}
        keyExtractor={(order) => (order.order_number || order.id || Math.random()).toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => renderOrderItem(item)}
      />

      {/* COMPLETED ORDERS MODAL */}
      {showCompleted && (
        <Modal
          visible={showCompleted}
          animationType="slide"
          onRequestClose={() => setShowCompleted(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontFamily: 'Roboto_700Bold' }}>Completed Orders</Text>
              <TouchableOpacity onPress={() => setShowCompleted(false)}>
                <Ionicons name="close" size={28} color="black" />
              </TouchableOpacity>
            </View>
            {completedOrders.length > 0 ? (
              <FlatList
                data={completedOrders}
                keyExtractor={(order) => (order.order_number || order.id || Math.random()).toString()}
                renderItem={({ item }) => renderOrderItem(item)}
                contentContainerStyle={{ padding: 16 }}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={80} color="#ccc" />
                <Text style={{ fontSize: 18, color: '#999', marginTop: 10 }}>No completed orders yet</Text>
              </View>
            )}
          </View>
        </Modal>
      )}

      {/* CANCELLED ORDERS MODAL */}
      {showCancelled && (
        <Modal
          visible={showCancelled}
          animationType="slide"
          onRequestClose={() => setShowCancelled(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontFamily: 'Roboto_700Bold' }}>Cancelled Orders</Text>
              <TouchableOpacity onPress={() => setShowCancelled(false)}>
                <Ionicons name="close" size={28} color="black" />
              </TouchableOpacity>
            </View>
            {cancelledOrders.length > 0 ? (
              <FlatList
                data={cancelledOrders}
                keyExtractor={(order) => (order.order_number || order.id || Math.random()).toString()}
                renderItem={({ item }) => renderOrderItem(item)}
                contentContainerStyle={{ padding: 16 }}
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close-circle-outline" size={80} color="#ccc" />
                <Text style={{ fontSize: 18, color: '#999', marginTop: 10 }}>No cancelled orders</Text>
              </View>
            )}
          </View>
        </Modal>
      )}

      {/* ORDER DETAILS MODAL */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalBackground}>
          <Animated.View
            {...panResponderRef.current.panHandlers}
            style={[styles.modalContainer, { transform: [{ translateY }] }]}
          >
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Details</Text>
                <TouchableOpacity onPress={closeDetailModal}>
                  <Ionicons name="close" size={26} color="#333" />
                </TouchableOpacity>
              </View>

              {selectedOrder ? (
                <>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Order #</Text>
                    <Text style={styles.modalValue}>{selectedOrder.order_number}</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Status</Text>
                    <Text
                      style={[styles.modalValue, { color: statusColors[statusMapping[(selectedOrder.status || '').toLowerCase()] ?? 0] }]}
                    >
                      {(selectedOrder.status || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  </View>

                  <View style={{ marginVertical: 8 }}>{renderStatusBar(selectedOrder)}</View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.modalLabel, { marginBottom: 6 }]}>Items</Text>
                    {Array.isArray(selectedOrder.items) &&
                      selectedOrder.items.map((it, idx) => (
                        <View key={idx} style={styles.modalItemRow}>
                          {it.image ? (
                            <Image source={{ uri: it.image }} style={styles.modalItemImage} />
                          ) : (
                            <View style={[styles.modalItemImage, styles.noImage]}>
                              <Text style={{ color: '#aaa' }}>No Image</Text>
                            </View>
                          )}
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.modalItemName}>{it.name}</Text>
                            <Text style={styles.modalItemSmall}>Qty: {it.quantity ?? 0}</Text>
                            {it.size && <Text style={styles.modalItemSmall}>Size: {it.size}</Text>}
                          </View>
                          <Text style={styles.modalItemPrice}>
                            ₱{((it.price || 0) * (it.quantity || 1)).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Payment</Text>
                    <Text style={styles.modalValue}>
                      {selectedOrder.payment_method || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Order Date</Text>
                    <Text style={styles.modalValue}>
                      {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.modalTotals}>
                    <Text style={styles.modalTotalLabel}>Total</Text>
                    <Text style={styles.modalTotalValue}>
                      ₱
                      {(
                        Array.isArray(selectedOrder.items)
                          ? selectedOrder.items.reduce(
                              (s, it) => s + (it.price || 0) * (it.quantity || 1),
                              0
                            )
                          : 0
                      ).toFixed(2)}
                    </Text>
                  </View>

                  {/* --- BUTTONS --- */}
                  <View style={styles.buttonRow}>
                    {selectedOrder.status.toLowerCase() !== 'completed' &&
                     selectedOrder.status.toLowerCase() !== 'cancelled' && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#d9534f' }]}
                        onPress={() => cancelOrder(selectedOrder.order_number)}
                      >
                        <Text style={styles.actionButtonText}>Cancel Order</Text>
                      </TouchableOpacity>
                    )}

                  
                  </View>
                </>
              ) : (
                <View style={{ padding: 20 }}>
                  <Text style={{ textAlign: 'center' }}>No order selected</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// --- STYLES REMAIN THE SAME ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 5, fontSize: 18, fontFamily: 'Roboto_400Regular', color: '#999' },

  headerBackground: { width: '100%', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden', paddingBottom: 8 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(254,192,117,0.5)' },
  headerContainer: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 14 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 30, fontFamily: 'Roboto_700Bold', color: 'black' },

  orderCard: { padding: 20, marginBottom: 20, borderRadius: 20, shadowColor: '#f97316', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  orderId: { fontSize: 20, fontFamily: 'Roboto_700Bold', color: '#111' },
  statusText: { fontSize: 16, fontFamily: 'Roboto_700Bold' },

  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  itemImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  noImage: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#333' },
  itemDetail: { fontSize: 14, fontFamily: 'Roboto_400Regular', color: '#555' },
  itemPriceContainer: { alignItems: 'flex-end' },
  itemPrice: { fontSize: 14, fontFamily: 'Roboto_400Regular', color: '#888' },

  statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'center' },
  stepContainer: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 16, height: 16, borderRadius: 8 },
  stepLine: { width: 30, height: 4, marginHorizontal: 4, borderRadius: 2 },

  totalContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
  totalText: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#111' },
  totalAmount: { fontSize: 18, fontFamily: 'Roboto_700Bold', color: '#f97316' },

  viewMoreButton: { marginTop: 10, padding: 8, borderRadius: 10, backgroundColor: '#f97316', width: '48%', alignSelf: 'center' },
  viewMoreText: { color: '#fff', textAlign: 'center', fontFamily: 'Roboto_700Bold' },

  modalBackground: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalContainer: { width: '100%', maxHeight: '85%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 22, fontFamily: 'Roboto_700Bold' },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  modalLabel: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#444' },
  modalValue: { fontSize: 16, fontFamily: 'Roboto_400Regular', color: '#333' },

  modalItemRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  modalItemImage: { width: 55, height: 55, borderRadius: 10 },
  modalItemName: { fontSize: 15, fontFamily: 'Roboto_700Bold', color: '#444' },
  modalItemSmall: { fontSize: 13, fontFamily: 'Roboto_400Regular', color: '#777' },
  modalItemPrice: { fontSize: 15, fontFamily: 'Roboto_700Bold', color: '#444' },

  modalTotals: { marginTop: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  modalTotalLabel: { fontSize: 18, fontFamily: 'Roboto_700Bold', color: '#111' },
  modalTotalValue: { fontSize: 20, fontFamily: 'Roboto_700Bold', color: '#f97316', marginTop: 4 },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, gap: 10 },
  actionButton: { flex: 1, padding: 12, borderRadius: 10 },
  actionButtonText: { color: '#fff', textAlign: 'center', fontFamily: 'Roboto_700Bold', fontSize: 16 },
});
