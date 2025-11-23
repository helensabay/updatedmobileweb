import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Image,
  Pressable,
  Alert,
} from 'react-native';
import { useFonts, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LogOut,
  User,
  Settings as Gear,
  HelpCircle,
  MessageCircle,
  Bell,
} from 'lucide-react-native';
import CategoryItem from '../../components/CategoryItem';
import Recommended from '../../components/Recommended';
import { fetchMenuItems, fetchNotifications } from '../../api/api';
import { useCart } from '../../context/CartContext';

const CATEGORY_IMAGES = {
  combo: require('../../../assets/choices/combo.png'),
  meals: require('../../../assets/choices/meals.png'),
  snacks: require('../../../assets/choices/snacks.png'),
  drinks: require('../../../assets/choices/drinks.png'),
};

export default function HomeDashboardScreen() {
  const [fontsLoaded] = useFonts({ Roboto_700Bold });
  const router = useRouter();
  const { cart, addToCart, decreaseQuantity } = useCart();

  const [menuItems, setMenuItems] = useState([]);
  const [prevMenuItems, setPrevMenuItems] = useState([]);
  const [menuNotifications, setMenuNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  const FIXED_CATEGORIES = [
    { key: 'combo', title: 'Combo Meals', image: CATEGORY_IMAGES.combo },
    { key: 'meals', title: 'Meals', image: CATEGORY_IMAGES.meals },
    { key: 'snacks', title: 'Snacks', image: CATEGORY_IMAGES.snacks },
    { key: 'drinks', title: 'Drinks', image: CATEGORY_IMAGES.drinks },
  ];

  const CATEGORY_MAP = {
    combo: 'Combo Meals',
    meals: 'Meals',
    snacks: 'Snacks',
    drinks: 'Drinks',
  };

  // ----------------------
  // Load menu items & notifications
  // ----------------------
  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const items = await fetchMenuItems(); // fetch all items from DB
      setMenuItems(items); // store all items
      setPrevMenuItems(items);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBackendNotifications = async () => {
    try {
      const backend = await fetchNotifications();
      setMenuNotifications(prev => {
        const merged = [...prev];
        backend.forEach(n => {
          if (!prev.find(p => p.item.id === n.id && p.type === 'backend')) {
            merged.push({ type: 'backend', item: n });
          }
        });
        return merged;
      });
    } catch (err) {
      console.error('Failed to fetch backend notifications:', err);
    }
  };

  const loadAllData = async () => {
    await loadMenuItems();
    await loadBackendNotifications();
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData().finally(() => setRefreshing(false));
  }, []);

  // ----------------------
  // Category & item filtering
  // ----------------------
  const categoriesData = useMemo(() => {
    return FIXED_CATEGORIES.map(cat => {
      const itemCount = menuItems.filter(
        item => (item.category || '') === CATEGORY_MAP[cat.key]
      ).length;
      return { ...cat, itemCount };
    });
  }, [menuItems]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categoriesData;
    return categoriesData.filter(cat =>
      cat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categoriesData, searchQuery]);

  const allItemsFiltered = useMemo(() => {
    if (!searchQuery) return menuItems;
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menuItems, searchQuery]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={{ marginTop: 8, color: '#f97316', fontFamily: 'Roboto_700Bold' }}>
          Loading Menu...
        </Text>
      </View>
    );
  }

  // ----------------------
  // Handlers
  // ----------------------
  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@sanaol/auth/accessToken',
        '@sanaol/auth/refreshToken',
        '@sanaol/auth/user',
      ]);
      setOpenDropdown(null);
      router.replace('/account-login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };
  const handleCheckout = () => router.push('/customer-cart');
  const handleAddMoreItems = () => router.push('/(tabs)');

  const DropdownItem = ({ icon, label, onPress, color }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8 }}
      onPress={onPress}
    >
      <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <Text style={{ marginLeft: 8, fontSize: 14, color: color || '#374151', fontWeight: '500' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderCategoriesHeader = () => (
    <View style={{ marginBottom: 8, paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Categories</Text>
      <View style={{ marginTop: 4, width: 48, height: 3, borderRadius: 2, backgroundColor: '#f97316' }} />
    </View>
  );

  const renderDropdownContainer = (children) => (
    <View style={{ position: 'absolute', top: 56, right: 16, width: 220, zIndex: 150 }}>
      <View style={{
        width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 10,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'white',
        alignSelf: 'flex-end', marginRight: 8
      }} />
      <View style={{
        backgroundColor: 'white', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 8,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 5
      }}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fef3c7' }}>
      {/* Top Search & Buttons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, zIndex: 200 }}>
        <TextInput
          placeholder="Search menu..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{
            flex: 1, height: 40, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 12,
            fontSize: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2
          }}
        />

        {/* Bell with badge */}
        <TouchableOpacity onPress={() => setOpenDropdown(openDropdown === 'notifications' ? null : 'notifications')}>
          <Bell size={20} color={menuNotifications.length > 0 ? '#f97316' : '#374151'} />
          {menuNotifications.length > 0 && (
            <View style={{
              position: 'absolute', top: -4, right: -4, width: 16, height: 16,
              borderRadius: 8, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center'
            }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{menuNotifications.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setOpenDropdown(openDropdown === 'settings' ? null : 'settings')}>
          <Gear size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#f97316']} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        <Recommended items={menuItems.slice(0, 6)} />

        {renderCategoriesHeader()}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 8 }}>
          {filteredCategories.map(item => (
            <CategoryItem
              key={item.key}
              image={item.image}
              title={item.title}
              onPress={() => router.push(`/categories/${item.title.replace(' ', '')}`)}
            />
          ))}
        </View>

        <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 }}>All Menu Items</Text>
          {allItemsFiltered.length > 0 ? allItemsFiltered.map(item => {
            const qty = cart.find(i => i.id === item.id)?.quantity || 0;
            return (
              <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white', borderRadius: 12, marginBottom: 8 }}>
                {item.image && <Image source={{ uri: item.image }} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 12 }} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#111827' }}>
                    {item.name} {item.available === false && <Text style={{ color:'#ef4444' }}> (Sold Out)</Text>}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>{item.description}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#f97316' }}>₱{item.price}</Text>
                {item.available && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                    <TouchableOpacity onPress={() => decreaseQuantity(item.id)} style={{ backgroundColor: '#e67e22', padding: 6, borderRadius: 20, marginHorizontal: 4 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>-</Text>
                    </TouchableOpacity>
                    <Text style={{ minWidth: 20, textAlign: 'center', fontWeight: '700' }}>{qty}</Text>
                    <TouchableOpacity onPress={() => addToCart(item)} style={{ backgroundColor: '#e67e22', padding: 6, borderRadius: 20, marginHorizontal: 4 }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }) : (
            <Text style={{ fontFamily: 'Roboto_700Bold', color: '#555' }}>No items found.</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Checkout & Add More */}
      {total > 0 && (
        <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, gap: 10 }}>
          <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF8C00', paddingVertical: 14, borderRadius: 30, elevation: 4 }} onPress={handleCheckout}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginLeft: 8 }}>₱{total} • Checkout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#27ae60', paddingVertical: 12, borderRadius: 30, width: '100%', alignItems: 'center', elevation: 3 }} onPress={handleAddMoreItems}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>+ Add More Items</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dropdown Overlay */}
      <>
        {openDropdown && <Pressable style={{ position: 'absolute', inset: 0 }} onPress={() => setOpenDropdown(null)} />}
        {openDropdown === 'settings' && renderDropdownContainer(
          <>
            <DropdownItem icon={<User size={16} color="#374151" />} label="Profile" onPress={() => router.push('/tabs/account-profile')} />
            <DropdownItem icon={<Gear size={16} color="#374151" />} label="App Settings" onPress={() => router.push('/screens/Settings')} />
            <DropdownItem icon={<HelpCircle size={16} color="#374151" />} label="Help" onPress={() => router.push('/screens/FAQs')} />
            <DropdownItem icon={<MessageCircle size={16} color="#374151" />} label="Feedback" onPress={() => router.push('/screens/Feedback')} />
            <DropdownItem icon={<LogOut size={16} color="red" />} label="Logout" onPress={handleLogout} color="red" />
          </>
        )}

        {openDropdown === 'notifications' && renderDropdownContainer(
          <>
            {menuNotifications.length === 0 ? (
              <Text style={{ color:'#6B7280', textAlign:'center', padding:8 }}>No updates</Text>
            ) : (
              <>
                {(showAllNotifications ? menuNotifications : menuNotifications.slice(-5)).map((n, idx) => (
                  <View key={idx} style={{ paddingVertical: 4 }}>
                    <Text style={{
                      color: n.type === 'new' ? '#16a34a' : n.type === 'soldout' ? '#ef4444' : n.type === 'deleted' ? '#9ca3af' : '#374151',
                      fontWeight: '500'
                    }}>
                      {n.type === 'new' ? 'New:' : n.type === 'soldout' ? 'Sold Out:' : n.type === 'deleted' ? 'Removed:' : ''} {n.item.name || n.item.title}
                    </Text>
                  </View>
                ))}
                {menuNotifications.length > 5 && (
                  <TouchableOpacity onPress={() => setShowAllNotifications(!showAllNotifications)} style={{ marginTop: 4, padding: 6 }}>
                    <Text style={{ color:'#f97316', fontWeight:'700', textAlign:'center' }}>
                      {showAllNotifications ? 'Show Less' : 'See More'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </>
    </View>
  );
}
