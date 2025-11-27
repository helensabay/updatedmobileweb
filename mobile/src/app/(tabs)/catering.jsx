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
import { fetchMenuItems, createCateringEvent } from "../../api/api";

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

export default function CateringTab({ navigation }) {
  const [cateringEvents, setCateringEvents] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState({ field: "", visible: false });

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

  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await AsyncStorage.getItem("@sanaol/auth/user");
        const parsed = userData ? JSON.parse(userData) : null;
        if (parsed?.role !== "faculty") {
          setAllowed(false);
          return;
        }
        setAllowed(true);

        const items = await fetchMenuItems();
        const itemsWithQty = items.map((i) => ({ ...i, selectedQuantity: 1 }));
        setMenuItems(itemsWithQty);

        // Here you can fetch existing events from API if available
        setCateringEvents([]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleInputChange = (field, value) => {
    setScheduleForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMenuItem = (itemId) => {
    setScheduleForm((prev) => {
      const exists = prev.selectedItems.includes(itemId);
      return {
        ...prev,
        selectedItems: exists
          ? prev.selectedItems.filter((id) => id !== itemId)
          : [...prev.selectedItems, itemId],
      };
    });
  };

  const handleQuantityChange = (itemId, qty) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, selectedQuantity: qty } : i))
    );
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

    const missing = required.filter(
      (f) => !scheduleForm[f] || scheduleForm[f].toString().trim() === ""
    );

    if (missing.length) {
      Alert.alert("Error", `Please fill all required fields.`);
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
    };

    try {
      await createCateringEvent(newEvent);

      // Update local state to display reserved event
      setCateringEvents((prev) => [...prev, newEvent]);

      Alert.alert("Success", "Catering event scheduled!");
      setModalVisible(false);

      setScheduleForm({
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
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to schedule event.");
    }
  };

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
        <Text style={{ color: "red", fontSize: 16 }}>
          You are not allowed to access Catering.
        </Text>
      </View>
    );
  }

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
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={{ fontSize: 24, fontWeight: "700" }}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Catering Events</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>
      </ImageBackground>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <TouchableOpacity
          style={styles.scheduleBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.scheduleBtnText}>Schedule New Catering Event</Text>
        </TouchableOpacity>

        {cateringEvents.length === 0 && (
          <Text style={{ padding: 16, color: "#555", textAlign: "center" }}>
            No Catering events available.
          </Text>
        )}

        {/* DISPLAY RESERVED EVENTS */}
        {cateringEvents.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event.name}</Text>
            <Text>Date: {event.event_date}</Text>
            <Text>
              Time: {event.start_time} - {event.end_time}
            </Text>
            <Text>Location: {event.location}</Text>
            <Text>Attendees: {event.guest_count}</Text>
            <Text>Client: {event.client_name}</Text>
            {event.notes ? <Text>Notes: {event.notes}</Text> : null}

            <Text style={{ marginTop: 6, fontWeight: "600" }}>Menu Items:</Text>
            <View style={styles.menuGrid}>
              {event.items.map((item, idx) => (
                <View key={idx} style={styles.menuCard}>
                  {item.image ? (
                    <Image source={item.image} style={styles.menuImage} />
                  ) : (
                    <View style={styles.menuImagePlaceholder} />
                  )}
                  <Text style={styles.menuCardText}>
                    {item.name} x {item.quantity}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* MODAL */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalTitle}>Schedule Catering Event</Text>

              <Field
                label="Event Name"
                value={scheduleForm.eventName}
                onChange={(v) => handleInputChange("eventName", v)}
              />
              <Field
                label="Client"
                value={scheduleForm.client}
                onChange={(v) => handleInputChange("client", v)}
              />

              {/* DATE */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.inputLabel}>Event Date</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.inputField}
                >
                  <Text>{scheduleForm.date || "Select date"}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={scheduleForm.date ? new Date(scheduleForm.date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(e, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate)
                        handleInputChange(
                          "date",
                          selectedDate.toISOString().split("T")[0]
                        );
                    }}
                  />
                )}
              </View>

              {/* TIME */}
              <TimeField
                label="Start Time"
                value={scheduleForm.startTime}
                onPress={() => setShowTimePicker({ field: "startTime", visible: true })}
              />
              <TimeField
                label="End Time"
                value={scheduleForm.endTime}
                onPress={() => setShowTimePicker({ field: "endTime", visible: true })}
              />

              {showTimePicker.visible && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  display="default"
                  onChange={(e, selected) => {
                    setShowTimePicker({ field: "", visible: false });
                    if (selected) {
                      const formatted = selected.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      handleInputChange(showTimePicker.field, formatted);
                    }
                  }}
                />
              )}

              {/* LOCATION */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.inputLabel}>Location</Text>
                <View style={styles.inputField}>
                  <Picker
                    selectedValue={scheduleForm.location}
                    onValueChange={(v) => handleInputChange("location", v)}
                  >
                    <Picker.Item label="Select location" value="" />
                    <Picker.Item label="Conference Room A" value="Conference Room A" />
                    <Picker.Item label="Conference Room B" value="Conference Room B" />
                    <Picker.Item label="Main Hall" value="Main Hall" />
                  </Picker>
                </View>
              </View>

              <Field
                label="Number of Attendees"
                value={scheduleForm.attendees}
                onChange={(v) => handleInputChange("attendees", v)}
                keyboardType="numeric"
              />
              <Field
                label="Contact Name"
                value={scheduleForm.contactName}
                onChange={(v) => handleInputChange("contactName", v)}
              />
              <Field
                label="Contact Phone"
                value={scheduleForm.contactPhone}
                onChange={(v) => handleInputChange("contactPhone", v)}
                keyboardType="phone-pad"
              />
              <Field
                label="Additional Notes"
                value={scheduleForm.notes}
                onChange={(v) => handleInputChange("notes", v)}
              />

              {/* MENU ITEMS */}
              <Text style={styles.menuTitle}>Select Menu Items</Text>
              <View style={styles.menuGrid}>
                {menuItems.map((item) => {
                  const selected = scheduleForm.selectedItems.includes(item.id);
                  return (
                    <View
                      key={item.id}
                      style={[styles.menuCard, selected && styles.menuCardSelected]}
                    >
                      <TouchableOpacity onPress={() => toggleMenuItem(item.id)}>
                        {item.image ? (
                          <Image source={item.image} style={styles.menuImage} />
                        ) : (
                          <View style={styles.menuImagePlaceholder} />
                        )}
                        <Text
                          style={[
                            styles.menuCardText,
                            selected && styles.menuCardTextSelected,
                          ]}
                        >
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                      {selected && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 6,
                          }}
                        >
                          <Text style={{ marginRight: 8 }}>Qty:</Text>
                          <TextInput
                            keyboardType="numeric"
                            style={styles.qtyInput}
                            value={item.selectedQuantity.toString()}
                            onChangeText={(val) =>
                              handleQuantityChange(item.id, parseInt(val) || 1)
                            }
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              <Pressable onPress={handleScheduleSubmit} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Submit</Text>
              </Pressable>

              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

/* ----------------------
   REUSABLE FIELD INPUT
----------------------- */
const Field = ({ label, value, onChange, ...props }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={`Enter ${label.toLowerCase()}`}
      style={styles.inputField}
      {...props}
    />
  </View>
);

/* ----------------------
   REUSABLE TIME FIELD
----------------------- */
const TimeField = ({ label, value, onPress }) => (
  <View style={{ marginBottom: 14 }}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TouchableOpacity onPress={onPress} style={styles.inputField}>
      <Text>{value || `Select ${label.toLowerCase()}`}</Text>
    </TouchableOpacity>
  </View>
);

/* ----------------------
   STYLES
----------------------- */
const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  headerBackground: {
    width: "100%",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: "hidden",
    paddingBottom: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(254,192,117,0.5)",
  },
  headerContainer: { paddingTop: 50, paddingBottom: 14, paddingHorizontal: 14 },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 28, fontWeight: "700", color: "#333" },
  scheduleBtn: {
    backgroundColor: "#f97316",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  scheduleBtnText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 20, maxHeight: "90%" },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center", color: "#f97316" },

  inputLabel: { marginBottom: 6, fontWeight: "600", color: "#555" },
  inputField: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },

  menuTitle: { fontSize: 16, fontWeight: "700", marginVertical: 10 },
  menuGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  menuCard: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    overflow: "hidden",
    alignItems: "center",
    paddingBottom: 12,
  },
  menuCardSelected: { borderColor: "#f97316", backgroundColor: "#fff4e6" },
  menuImage: {
    width: "100%",
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    resizeMode: "cover",
  },
  menuImagePlaceholder: {
    width: "100%",
    height: 100,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#eee",
  },
  menuCardText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    textAlign: "center",
  },
  menuCardTextSelected: { fontWeight: "700", color: "#f97316" },

  qtyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 4,
    width: 50,
    textAlign: "center",
  },

  submitBtn: { backgroundColor: "#f97316", paddingVertical: 14, borderRadius: 10, marginTop: 10 },
  submitBtnText: { textAlign: "center", color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { backgroundColor: "#ccc", paddingVertical: 14, borderRadius: 10, marginTop: 6 },
  cancelBtnText: { textAlign: "center", color: "#333", fontWeight: "700", fontSize: 16 },

  // Reserved event styles
  eventCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f97316",
    marginBottom: 6,
  },
});
