import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
  StyleSheet,
  ImageBackground,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import {
  fetchMenuItems,
  createCateringEvent,
  fetchCateringEvents,
} from "../../api/api";

/* ---------------------------
   Convert "5:32 PM" → "17:32"
---------------------------- */
const to24Hour = (timeString) => {
  if (!timeString) return "";
  const [time, modifier] = timeString.split(" ");
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, "0")}:${minutes}`;
};

export default function CateringTab() {
  const router = useRouter();
  const [cateringEvents, setCateringEvents] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState({ field: "", visible: false });
  const [eventTab, setEventTab] = useState("upcoming");

  const [scheduleForm, setScheduleForm] = useState({
    eventName: "",
    client: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    attendees: "",
    contactName: "",
    contactPhone: "",
    notes: "",
    selectedItems: [],
  });

  /* ------------------ Load Data ------------------ */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userData = await AsyncStorage.getItem("@sanaol/auth/user");
        const parsed = userData ? JSON.parse(userData) : null;

        if (!parsed || parsed.role !== "faculty") {
          setAllowed(false);
          return;
        }
        setAllowed(true);

        const clientName = parsed.name?.trim() || "";
        setScheduleForm((prev) => ({ ...prev, client: clientName }));

        const items = await fetchMenuItems();
        setMenuItems((items && Array.isArray(items) ? items : []).map((i) => ({ ...i, selectedQuantity: 1 })));

        const events = await fetchCateringEvents(clientName);
        const normalizedEvents = (events && Array.isArray(events) ? events : []).map((ev) => ({
          ...ev,
          client_name: ev.client_name?.trim() || "",
          items: Array.isArray(ev.items) ? ev.items : [],
          total_price:
            ev.total_price ??
            (Array.isArray(ev.items)
              ? ev.items.reduce((sum, item) => sum + ((item.unit_price || item.price || 0) * (item.quantity || 0)), 0)
              : 0),
          status: ev.status ?? "Pending Payment",
        }));

        setCateringEvents(normalizedEvents);
      } catch (err) {
        console.error("Error loading catering data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /* ------------------ Handlers ------------------ */
  const handleInputChange = (field, value) => {
    setScheduleForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMenuItem = (itemId) => {
    setScheduleForm((prev) => {
      const exists = prev.selectedItems.includes(itemId);
      return {
        ...prev,
        selectedItems: exists ? prev.selectedItems.filter((id) => id !== itemId) : [...prev.selectedItems, itemId],
      };
    });
  };

  const handleQuantityChange = (itemId, qty) => {
    setMenuItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, selectedQuantity: qty } : i)));
  };

  const handleScheduleSubmit = async () => {
    const required = [
      "eventName",
      "client",
      "date",
      "startTime",
      "endTime",
      "location",
      "attendees",
      "contactName",
      "contactPhone",
    ];
    const missing = required.filter((f) => !scheduleForm[f] || scheduleForm[f].toString().trim() === "");
    if (missing.length) {
      Alert.alert("Error", "Please fill all required fields.");
      return;
    }

    if (scheduleForm.selectedItems.length === 0) {
      Alert.alert("Error", "Please select at least one menu item.");
      return;
    }

    const selectedItemsData = scheduleForm.selectedItems.map((itemId) => {
      const item = menuItems.find((i) => i.id === itemId);
      return {
        menu_item: item.id,
        name: item.name,
        quantity: item.selectedQuantity,
        unit_price: item.price || 0,
        notes: item.notes || "",
        image: item.image || null,
      };
    });

    const totalPrice = selectedItemsData.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

    const newEvent = {
      id: Date.now(),
      name: scheduleForm.eventName,
      client_name: scheduleForm.client,
      contact_name: scheduleForm.contactName,
      contact_phone: scheduleForm.contactPhone,
      event_date: scheduleForm.date,
      start_time: to24Hour(scheduleForm.startTime),
      end_time: to24Hour(scheduleForm.endTime),
      location: scheduleForm.location,
      guest_count: Number(scheduleForm.attendees),
      notes: scheduleForm.notes,
      items: selectedItemsData,
      total_price: totalPrice,
      status: "Pending Payment",
    };

    try {
      await createCateringEvent(newEvent);
      setCateringEvents((prev) => [...prev, newEvent]);
      Alert.alert("Success", "Catering event scheduled! Please pay 50% to confirm.");
      setModalVisible(false);
      setScheduleForm({
        eventName: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        attendees: "",
        contactName: "",
        contactPhone: "",
        notes: "",
        selectedItems: [],
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to schedule event.");
    }
  };

  /* ------------------ Loading / Access ------------------ */
  if (loading || allowed === null) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={{ color: "red", fontSize: 16 }}>You are not allowed to access Catering.</Text>
      </View>
    );
  }

  /* ------------------ Filter events ------------------ */
  const today = new Date();
  const userEvents = cateringEvents.filter(
    (event) => event.client_name.toLowerCase() === scheduleForm.client.trim().toLowerCase()
  );

  const upcomingEvents = userEvents.filter((event) => new Date(event.event_date) >= today);
  const pastEvents = userEvents.filter((event) => new Date(event.event_date) < today);
  const displayedEvents = eventTab === "upcoming" ? upcomingEvents : pastEvents;

  /* ------------------ Render ------------------ */
  return (
    <View style={{ flex: 1, backgroundColor: "#fdfdfd" }}>
      <ImageBackground
        source={require("../../../assets/drop_1.png")}
        resizeMode="cover"
        style={styles.headerBackground}
      >
        <View style={styles.overlay} />
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ fontSize: 24, fontWeight: "700" }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Catering Events</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TouchableOpacity style={styles.scheduleBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.scheduleBtnText}>Schedule New Catering Event</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setEventTab("upcoming")}
            style={[{ padding: 8, borderRadius: 8 }, eventTab === "upcoming" && { backgroundColor: "#f97316" }]}
          >
            <Text style={{ color: eventTab === "upcoming" ? "#fff" : "#333", fontWeight: "600" }}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setEventTab("past")}
            style={[{ padding: 8, borderRadius: 8 }, eventTab === "past" && { backgroundColor: "#f97316" }]}
          >
            <Text style={{ color: eventTab === "past" ? "#fff" : "#333", fontWeight: "600" }}>Past</Text>
          </TouchableOpacity>
        </View>

        {displayedEvents.length === 0 && (
          <Text style={{ padding: 16, color: "#555", textAlign: "center" }}>
            No {eventTab === "upcoming" ? "upcoming" : "past"} events.
          </Text>
        )}

        {displayedEvents.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event.name}</Text>

            {/* STATUS */}
            <Text
              style={[
                styles.statusText,
                event.status === "Completed"
                  ? styles.statusCompleted
                  : event.status === "Accepted"
                  ? styles.statusAccepted
                  : styles.statusPending,
              ]}
            >
              📌 Status: {event.status}
            </Text>

            <Text style={styles.highlightedText}>📅 Date: {event.event_date}</Text>
            <Text style={styles.highlightedText}>⏰ Time: {event.start_time} - {event.end_time}</Text>
            <Text style={styles.highlightedText}>📍 Location: {event.location}</Text>
            <Text style={styles.highlightedText}>👥 Attendees: {event.guest_count}</Text>

            {/* TOTAL PRICE */}
            <Text style={[styles.highlightedText, { marginTop: 4, fontSize: 16 }]}>
              💰 Total Price: ₱{event.total_price?.toLocaleString() || 0}
            </Text>

            {event.notes && <Text style={styles.highlightedText}>📝 Notes: {event.notes}</Text>}

            <Text style={{ marginTop: 6, fontWeight: "700" }}>🍽 Menu Items:</Text>
            <View style={styles.menuGrid}>
              {event.items?.map((item, idx) => (
                <View key={idx} style={styles.menuCard}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.menuImage} />
                  ) : (
                    <View style={styles.menuImagePlaceholder} />
                  )}
                  <Text style={styles.menuCardText}>
                    {item.name} x {item.quantity} — ₱{(item.unit_price * item.quantity).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            {/* 50% Down Payment Button */}
            {event.status === "Pending Payment" && (
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: "#f97316",
                  padding: 10,
                  borderRadius: 8,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/payment",
                    params: {
                      orderId: event.id,
                      orderType: "Catering",
                      total: event.total_price / 2,
                      selectedTime: event.event_date,
                    },
                  })
                }
              >
                <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                  Pay 50% Down
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* MODAL: Schedule Event (unchanged) */}
        {/* ...keep your existing modal code here... */}

      </ScrollView>
    </View>
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
