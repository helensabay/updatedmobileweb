import React, { useState, useCallback } from 'react';
import {
View,
Text,
Image,
ActivityIndicator,
Alert,
ScrollView,
StyleSheet,
TouchableOpacity,
TextInput,
Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getValidToken } from '../../api/api';

export default function AccountProfile() {
const [profile, setProfile] = useState(null);
const [creditPoints, setCreditPoints] = useState(0);
const [loading, setLoading] = useState(true);
const [editingName, setEditingName] = useState(false);
const [newName, setNewName] = useState('');
const [passwordModal, setPasswordModal] = useState(false);
const [newPassword, setNewPassword] = useState('');
const router = useRouter();

const loadProfile = useCallback(async () => {
try {
setLoading(true);

  const userData = await AsyncStorage.getItem('@sanaol/auth/user');
  if (!userData) {
    setProfile(null);
    setCreditPoints(0);
    return;
  }
  const parsed = JSON.parse(userData);
  setProfile(parsed);

  const token = await getValidToken();
  if (!token) throw new Error('No access token');

  const res = await api.get('/orders/user-credit-points/', {
    headers: { Authorization: `Bearer ${token}` },
  });
  setCreditPoints(res.data.credit_points ?? 0);
} catch (err) {
  console.error('loadProfile error:', err.response?.data || err.message);
  Alert.alert('Error', 'Failed to load profile or credit points.');
  setProfile(null);
  setCreditPoints(0);
} finally {
  setLoading(false);
}

}, []);

useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

const safeString = val => (val != null ? String(val) : 'N/A');

const handleLogout = () => {
Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
{ text: 'Cancel', style: 'cancel' },
{
text: 'Logout',
style: 'destructive',
onPress: async () => {
await AsyncStorage.clear();
router.replace('/account-login');
},
},
]);
};

const updateName = async () => {
try {
const token = await getValidToken();
await api.patch(`/accounts/update-name/`, { name: newName }, { headers: { Authorization: `Bearer ${token}` } });
setProfile(prev => ({ ...prev, name: newName }));
setEditingName(false);
Alert.alert('Success', 'Name updated successfully!');
} catch (err) {
Alert.alert('Error', 'Failed to update name.');
}
};

const changePassword = async () => {
try {
const token = await getValidToken();
await api.patch(`/accounts/change-password/`, { password: newPassword }, { headers: { Authorization: `Bearer ${token}` } });
setPasswordModal(false);
setNewPassword('');
Alert.alert('Success', 'Password changed successfully!');
} catch {
Alert.alert('Error', 'Failed to change password.');
}
};

const pickAvatar = async () => {
try {
const result = await ImagePicker.launchImageLibraryAsync({
mediaTypes: ImagePicker.MediaTypeOptions.Images,
allowsEditing: true,
aspect: [1, 1],
quality: 0.8,
});

  if (!result.cancelled) {
    const token = await getValidToken();
    const formData = new FormData();
    formData.append('image', {
      uri: result.uri,
      name: `avatar_${profile.id}.jpg`,
      type: 'image/jpeg',
    });

    await api.patch('/accounts/update-avatar/', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    setProfile(prev => ({ ...prev, image: result.uri }));
    Alert.alert('Success', 'Avatar updated successfully!');
  }
} catch (err) {
  console.log(err);
  Alert.alert('Error', 'Failed to update avatar.');
}

};

if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#f97316" /></View>;
if (!profile) return <View style={styles.centered}><Text style={styles.message}>No profile data available.</Text></View>;

return ( <ScrollView contentContainerStyle={styles.container}> <View style={styles.header}>
<Image source={{ uri: profile.image || '[https://cdn-icons-png.flaticon.com/512/847/847969.png](https://cdn-icons-png.flaticon.com/512/847/847969.png)' }} style={styles.avatar} /> <TouchableOpacity onPress={pickAvatar}> <Text style={styles.editText}>Change Avatar</Text> </TouchableOpacity>

    <Text style={styles.name}>{safeString(profile.name)}</Text>
    <TouchableOpacity onPress={() => { setNewName(profile.name); setEditingName(true); }}>
      <Text style={styles.editText}>Edit Name</Text>
    </TouchableOpacity>
  </View>

  <View style={styles.infoContainer}>
    <View style={styles.infoCard}>
      <Ionicons name="id-card-outline" size={22} color="#f97316" />
      <Text style={styles.infoText}>ID: {safeString(profile.id)}</Text>
    </View>
    <View style={styles.infoCard}>
      <Ionicons name="person-outline" size={22} color="#f97316" />
      <Text style={styles.infoText}>Role: {safeString(profile.role)}</Text>
    </View>
    <View style={styles.infoCard}>
      <Ionicons name="checkmark-circle-outline" size={22} color="#f97316" />
      <Text style={styles.infoText}>Status: {safeString(profile.status)}</Text>
    </View>
    <View style={styles.infoCard}>
      <Ionicons name="mail-outline" size={22} color="#f97316" />
      <Text style={styles.infoText}>Email: {safeString(profile.email)}</Text>
    </View>
    <View style={styles.infoCard}>
      <Ionicons name="cash-outline" size={22} color="#f97316" />
      <Text style={styles.infoText}>Credit Points: {Number(creditPoints).toFixed(2)}</Text>
    </View>

    <TouchableOpacity style={styles.passwordBtn} onPress={() => setPasswordModal(true)}>
      <Ionicons name="key-outline" size={20} color="#fff" />
      <Text style={styles.passwordText}>Change Password</Text>
    </TouchableOpacity>
  </View>

  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
    <Ionicons name="log-out-outline" size={20} color="#fff" />
    <Text style={styles.logoutText}>Logout</Text>
  </TouchableOpacity>

  {/* Edit Name Modal */}
  <Modal visible={editingName} transparent animationType="slide">
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Edit Name</Text>
        <TextInput style={styles.input} value={newName} onChangeText={setNewName} />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.modalBtn} onPress={() => setEditingName(false)}><Text>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={updateName}><Text style={{ color: '#fff' }}>Save</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>

  {/* Change Password Modal */}
  <Modal visible={passwordModal} transparent animationType="slide">
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Change Password</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.modalBtn} onPress={() => setPasswordModal(false)}><Text>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={changePassword}><Text style={{ color: '#fff' }}>Save</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
</ScrollView>

);
}

const styles = StyleSheet.create({
container: { padding: 16, backgroundColor: '#fff7ed', flexGrow: 1 },
centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff7ed' },
header: { alignItems: 'center', marginBottom: 24, marginTop: 20 },
avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 8, borderWidth: 2, borderColor: '#f97316' },
name: { fontSize: 22, fontWeight: '700', color: '#111827' },
editText: { color: '#f97316', marginBottom: 10, fontWeight: '600' },
infoContainer: { marginVertical: 16 },
infoCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: '#fff', padding: 12, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
infoText: { marginLeft: 8, fontSize: 16, color: '#111827' },
passwordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f97316', padding: 10, borderRadius: 8, marginTop: 16 },
passwordText: { color: '#fff', marginLeft: 8, fontWeight: '700' },
logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f97316', padding: 12, borderRadius: 8, marginTop: 20 },
logoutText: { color: '#fff', marginLeft: 8, fontWeight: '700' },
message: { fontSize: 16, color: '#555' },
modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '85%' },
modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 12 },
modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
modalBtn: { paddingVertical: 8, paddingHorizontal: 16, marginLeft: 8, borderRadius: 6 },
saveBtn: { backgroundColor: '#f97316' },
});
