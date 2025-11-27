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
  Alert,
  ScrollView,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchUserOrders } from '../../api/api';
import { useFonts, Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Full OrderTrackingScreen with:
 * - Completed Orders modal (header icon)
 * - Advanced Order Details modal (images, progress, date, payment, cancel, reorder)
 * - Cancel tries common endpoints (POST/PATCH/DELETE) when none known
 * - Reorder tries common endpoints (POST)
 * - Swipe-down to close the detail modal (basic implementation)
 */

const statusSteps = ['Pending', 'Accepted', 'In Progress', 'Ready', 'Completed'];
const statusColors = ['#f39c12', '#3498db', '#8e44ad', '#27ae60', '#2ecc71'];
const statusMapping = {
  pending: 0,
  accepted: 1,
  in_progress: 2,
  ready: 3,
  completed: 4,
};

export default function OrderTrackingScreen() {
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });

  // Completed orders modal (list)
  const [showCompleted, setShowCompleted] = useState(false);

  // Advanced order details modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Animated swipe down
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponderRef = useRef(null);

  // Load orders
  const loadOrders = async () => {
    try {
      const data = await fetchUserOrders();
      // Defensive: ensure array
      const list = Array.isArray(data) ? data : [];
      // Separate active vs completed
      const active = list.filter((o) => (o.status ?? '').toLowerCase() !== 'completed');
      const completed = list.filter((o) => (o.status ?? '').toLowerCase() === 'completed');
      setOrders(active);
      setCompletedOrders(completed);
    } catch (err) {
      console.error('Error fetching orders:', err?.message ?? err);
      setOrders([]);
      setCompletedOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, []);

  // PanResponder for swipe-to-close modal (downwards)
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward movement
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 120) {
          // close
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            closeDetailModal();
          });
        } else {
          // return to top
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

  // Try common cancel endpoints when backend doesn't have a dedicated known endpoint.
  // Replace these with your real endpoint(s) if you have them.
  const tryCancelEndpoints = [
    { method: 'POST', url: (id) => `/api/orders/${id}/cancel/` },
    { method: 'PATCH', url: (id) => `/api/orders/${id}/cancel/` },
    { method: 'DELETE', url: (id) => `/api/orders/${id}/cancel/` },
    // fallback generic update
    { method: 'PATCH', url: (id) => `/api/orders/${id}/` }, // with body { status: 'cancelled' }
  ];

  const cancelOrder = async (order) => {
    if (!order) return;
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel order #${order.order_number}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          onPress: async () => {
            try {
              let success = false;
              let responseData = null;

              for (const ep of tryCancelEndpoints) {
                const url = typeof ep.url === 'function' ? ep.url(order.order_number || order.id || order.order_id) : ep.url;
                const options = {
                  method: ep.method,
                  headers: { 'Content-Type': 'application/json' },
                };

                // If using the fallback PATCH /api/orders/:id/ we will send body {status: 'cancelled'}
                if (ep.method === 'PATCH' && url.endsWith('/orders/') ) {
                  options.body = JSON.stringify({ status: 'cancelled' });
                }

                try {
                  const res = await fetch(url, options);
                  // treat 2xx as success
                  if (res.ok) {
                    success = true;
                    // try parse json
                    try {
                      responseData = await res.json();
                    } catch (e) {
                      responseData = null;
                    }
                    break;
                  } else if (res.status === 404) {
                    // endpoint not present, try next
                    continue;
                  } else {
                    // some servers return 400 or 403 - bubble up error message if available
                    try {
                      const errJson = await res.json();
                      console.warn('Cancel attempt returned non-OK:', errJson);
                    } catch (e) {
                      console.warn('Cancel attempt returned non-OK status', res.status);
                    }
                    // try next endpoint
                    continue;
                  }
                } catch (err) {
                  // network-level or fetch error -> try next
                  console.warn('Fetch error trying endpoint', url, err);
                  continue;
                }
              }

              if (success) {
                // optimistic update: remove from active orders
                setOrders((prev) => prev.filter((o) => (o.order_number || o.id) !== (order.order_number || order.id)));
                setCompletedOrders((prev) => [ ...(prev || []), { ...order, status: 'cancelled' } ]);
                Alert.alert('Cancelled', `Order #${order.order_number} was cancelled.`);
                closeDetailModal();
              } else {
                Alert.alert('Cancel failed', 'Could not find a cancel endpoint on the server. Please implement a cancel endpoint or provide its URL.');
              }
            } catch (err) {
              console.error('Cancel order error', err);
              Alert.alert('Error', 'Something went wrong while cancelling. See console for details.');
            }
          },
        },
      ]
    );
  };

  // Try reorder - similar approach
  const tryReorderEndpoints = [
    { method: 'POST', url: (id) => `/api/orders/${id}/reorder/` },
    { method: 'POST', url: (id) => `/api/orders/${id}/duplicate/` },
  ];

  const reorderOrder = async (order) => {
    if (!order) return;
    try {
      let success = false;
      for (const ep of tryReorderEndpoints) {
        const url = typeof ep.url === 'function' ? ep.url(order.order_number || order.id) : ep.url;
        try {
          const res = await fetch(url, { method: ep.method, headers: { 'Content-Type': 'application/json' } });
          if (res.ok) {
            success = true;
            break;
          }
        } catch (err) {
          // try next
        }
      }
      if (success) {
        Alert.alert('Reorder placed', 'We placed your reorder. Check your orders list.');
        // optional: reload orders
        loadOrders();
        closeDetailModal();
      } else {
        Alert.alert('Reorder unavailable', 'No reorder endpoint found. Implement /api/orders/:id/reorder/ or use backend to support reorder.');
      }
    } catch (err) {
      console.error('Reorder error', err);
      Alert.alert('Error', 'Something went wrong while reordering.');
    }
  };

  const renderStatusBar = (order) => {
    const statusIndex = statusMapping[(order.status || '').toLowerCase()] ?? 0;

    let partialProgress = 0;
    if ((order.status || '').toLowerCase() === 'in_progress' && order.total_items_cached > 0) {
      partialProgress = Math.min((order.partial_ready_items || 0) / (order.total_items_cached || 1), 1);
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
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
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
            {statusSteps[statusMapping[(order.status || '').toLowerCase()] ?? 0]}
          </Text>
        </View>

        {renderStatusBar(order)}

        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.itemImage} />
            ) : (
              <View
                style={[
                  styles.itemImage,
                  { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
                ]}
              >
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

        <TouchableOpacity
          style={styles.viewMoreButton}
          onPress={() => openDetailModal(order)}
        >
          <Text style={styles.viewMoreText}>View Details</Text>
        </TouchableOpacity>

        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
        </View>
      </LinearGradient>
    );
  };

  // --- UI rendering ----------
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

            {/* Completed orders button */}
            <TouchableOpacity onPress={() => setShowCompleted(true)}>
              <Ionicons name="list-outline" size={26} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <FlatList
        data={orders}
        keyExtractor={(order) => (order.order_number || order.id || Math.random()).toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item }) => renderOrderItem(item)}
      />

      {/* --- Completed Orders Modal (list) --- */}
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
                <Text style={{ fontSize: 18, color: '#999', marginTop: 10 }}>
                  No completed orders yet
                </Text>
              </View>
            )}
          </View>
        </Modal>
      )}

      {/* --- Advanced Order Details Modal with swipe-down --- */}
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
                    <Text style={[styles.modalValue, { color: statusColors[statusMapping[(selectedOrder.status || '').toLowerCase()] ?? 0] }]}>
                      { (selectedOrder.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }
                    </Text>
                  </View>

                  <View style={{ marginVertical: 8 }}>
                    {renderStatusBar(selectedOrder)}
                  </View>

                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.modalLabel, { marginBottom: 6 }]}>Items</Text>
                    {Array.isArray(selectedOrder.items) && selectedOrder.items.map((it, idx) => (
                      <View key={idx} style={styles.modalItemRow}>
                        {it.image ? (
                          <Image source={{ uri: it.image }} style={styles.modalItemImage} />
                        ) : (
                          <View style={[styles.modalItemImage, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{ color: '#aaa' }}>No Image</Text>
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.modalItemName}>{it.name}</Text>
                          <Text style={styles.modalItemSmall}>Qty: {it.quantity ?? 0}</Text>
                          {it.size && <Text style={styles.modalItemSmall}>Size: {it.size}</Text>}
                        </View>
                        <Text style={styles.modalItemPrice}>₱{((it.price || 0) * (it.quantity || 1)).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Payment</Text>
                    <Text style={styles.modalValue}>{selectedOrder.payment_method || 'N/A'}</Text>
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
                      ₱{(Array.isArray(selectedOrder.items) ? selectedOrder.items.reduce((s, it) => s + ((it.price || 0) * (it.quantity || 1)), 0) : 0).toFixed(2)}
                    </Text>
                  </View>

                  {/* action buttons */}
                  <View style={styles.modalActions}>
                    {/* Cancel only if pending (case-insensitive) */}
                    {((selectedOrder.status || '').toLowerCase() === 'pending') && (
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ff4d4f' }]} onPress={() => cancelOrder(selectedOrder)}>
                        <Text style={styles.actionBtnText}>Cancel</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2ecc71' }]} onPress={() => reorderOrder(selectedOrder)}>
                      <Text style={styles.actionBtnText}>Reorder</Text>
                    </TouchableOpacity>
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

// --- styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 5, fontSize: 18, fontFamily: 'Roboto_400Regular', color: '#999' },
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
  orderCard: {
    padding: 20,
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#f97316',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  orderId: { fontSize: 20, fontFamily: 'Roboto_700Bold', color: '#111' },
  statusText: { fontSize: 16, fontFamily: 'Roboto_700Bold' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  itemImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
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

  // view details button inside card
  viewMoreButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#f97316',
    width: '48%',
    alignSelf: 'center',
  },
  viewMoreText: {
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Roboto_700Bold',
  },

  // modal styles
  modalBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContainer: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Roboto_700Bold',
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: 'Roboto_700Bold',
    color: '#333',
  },
  modalValue: {
    fontSize: 14,
    fontFamily: 'Roboto_400Regular',
    color: '#333',
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
  },
  modalItemImage: { width: 58, height: 58, borderRadius: 8 },
  modalItemName: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#222' },
  modalItemSmall: { fontSize: 13, color: '#666', fontFamily: 'Roboto_400Regular' },
  modalItemPrice: { fontSize: 14, fontFamily: 'Roboto_700Bold', color: '#333' },

  modalTotals: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  modalTotalLabel: { fontSize: 16, fontFamily: 'Roboto_700Bold' },
  modalTotalValue: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#f97316' },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontFamily: 'Roboto_700Bold',
  },
});
