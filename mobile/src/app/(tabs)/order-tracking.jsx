import React, { useEffect, useState } from 'react';
import {
View,
Text,
StyleSheet,
FlatList,
Image,
ActivityIndicator,
ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchUserOrders } from '../../api/api';
import { useFonts, Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { LinearGradient } from 'expo-linear-gradient';

const statusSteps = ['Pending', 'Preparing', 'Ready for Pickup'];
const statusColors = ['#f39c12', '#3498db', '#27ae60'];

export default function OrderTrackingScreen() {
const [orders, setOrders] = useState([]);
const [loading, setLoading] = useState(true);
const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });

const statusMapping = { pending: 0, preparing: 1, ready: 2 };

const loadOrders = async () => {
try {
const data = await fetchUserOrders();
setOrders(data);
} catch (err) {
console.error('Error fetching orders:', err.message);
setOrders([]);
} finally {
setLoading(false);
}
};

useEffect(() => {
loadOrders();
const interval = setInterval(loadOrders, 5000);
return () => clearInterval(interval);
}, []);

const renderStatusBar = (statusIndex) => ( <View style={styles.statusContainer}>
{statusSteps.map((step, index) => ( <View key={index} style={styles.stepContainer}>
<View
style={[
styles.stepCircle,
{ backgroundColor: index <= statusIndex ? statusColors[index] : '#ccc' },
]}
/>
{index < statusSteps.length - 1 && (
<View
style={[
styles.stepLine,
{ backgroundColor: index < statusIndex ? statusColors[index] : '#ccc' },
]}
/>
)} </View>
))} </View>
);

const renderOrderItem = (order) => {
const numericStatus = statusMapping[order.status?.toLowerCase()] ?? 0;
const totalAmount = order.items.reduce(
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
      <Text style={[styles.statusText, { color: statusColors[numericStatus] }]}>
        {statusSteps[numericStatus]}
      </Text>
    </View>

    {renderStatusBar(numericStatus)}

    {order.items.map((item, index) => (
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
          <Text style={styles.itemLineTotal}>
          </Text>
        </View>
      </View>
    ))}

    {/* Total Amount */}
    <View style={styles.totalContainer}>
      <Text style={styles.totalText}>Total</Text>
      <Text style={styles.totalAmount}>₱{totalAmount.toFixed(2)}</Text>
    </View>
  </LinearGradient>
);

};

if (!fontsLoaded || loading) {
return ( <View style={styles.loader}> <ActivityIndicator size="large" color="#f97316" /> </View>
);
}

if (!orders.length) {
return ( <View style={styles.emptyContainer}> <Ionicons name="cart-outline" size={80} color="#ccc" /> <Text style={styles.emptyText}>No orders found</Text> </View>
);
}

return ( <View style={styles.container}>
<ImageBackground
source={require('../../../assets/drop_1.png')}
resizeMode="cover"
style={styles.headerBackground}
> <View style={styles.overlay} /> <View style={styles.headerContainer}> <View style={styles.headerTopRow}> <Ionicons name="arrow-back" size={26} color="black" /> <Text style={styles.headerTitle}>My Orders</Text> <Ionicons name="list-outline" size={26} color="black" /> </View> </View> </ImageBackground>

  <FlatList
    data={orders}
    keyExtractor={(order) => order.order_number.toString()}
    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
    renderItem={({ item }) => renderOrderItem(item)}
  />
</View>


);
}

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
borderWidth: 0,
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
itemLineTotal: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#f97316' },
statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'center' },
stepContainer: { flexDirection: 'row', alignItems: 'center' },
stepCircle: { width: 16, height: 16, borderRadius: 8 },
stepLine: { width: 30, height: 4, marginHorizontal: 4, borderRadius: 2 },
totalContainer: {
flexDirection: 'row',
justifyContent: 'space-between',
marginTop: 12,
borderTopWidth: 1,
borderTopColor: '#eee',
paddingTop: 8,
},
totalText: { fontSize: 16, fontFamily: 'Roboto_700Bold', color: '#111' },
totalAmount: { fontSize: 18, fontFamily: 'Roboto_700Bold', color: '#f97316' },
});
