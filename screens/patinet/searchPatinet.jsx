import { Button, Input } from "@rneui/base";
import { useState } from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const SearchPatient = ({ navigation }) => {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [patients, setPatients] = useState([]); // سميتها جمع لأنها قائمة
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (queryText) => {
    if (!queryText) return;
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `https://medikidneysys.onrender.com/users/profile/patients/search?name=${queryText}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPatients(response.data);
    } catch (err) {
      console.log("Search Error:", err);
      setError("حدث خطأ أثناء البحث");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeSearch = (text) => {
    setSearch(text);
    setError("");
    if (text.length >= 2) {
      handleSearch(text);
    } else {
      setPatients([]);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>البحث عن مريض</Text>
          <Text style={styles.headerSubtitle}>ابحث عن ملف المريض بالاسم أو الرقم الطبي</Text>
        </View>

        {/* Search Card */}
        <View style={styles.searchCard}>
          <Input
            placeholder="اكتب اسم المريض هنا..."
            value={search}
            onChangeText={handleChangeSearch}
            errorMessage={error}
            leftIcon={<MaterialCommunityIcons name="magnify" size={24} color="#94a3b8" />}
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
            containerStyle={{ paddingHorizontal: 0 }}
            errorStyle={{ textAlign: 'right', fontWeight: 'bold' }}
          />

          <Button
            title="بدء البحث"
            loading={isLoading}
            onPress={() => handleSearch(search)}
            buttonStyle={styles.mainButton}
            titleStyle={styles.buttonTitle}
            containerStyle={styles.buttonShadow}
          />
        </View>

        {/* Results Section */}
        {patients && patients.length > 0 ? (
          <View style={styles.resultsWrapper}>
            <Text style={styles.resultsCount}>تم العثور على ({patients.length}) نتائج</Text>
            <FlatList
              data={patients}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.patientItemCard} 
                  onPress={() => {
                    setPatients([]);
                    navigation.navigate("StaffPatientView", { patientId: item.id });
                  }}
                > 
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{item.name}</Text>
                    <Text style={styles.patientId}>الرقم الطبي: #{item.id}</Text>
                  </View>
                  <View style={styles.avatarCircle}>
                    <MaterialCommunityIcons name="account-circle" size={35} color="#059669" />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : search.length > 2 && !isLoading ? (
          <View style={styles.emptyState}>
             <MaterialCommunityIcons name="account-search-outline" size={60} color="#cbd5e1" />
             <Text style={styles.emptyText}>لم نجد مريضاً بهذا الاسم</Text>
          </View>
        ) : null}

      </View>
    </KeyboardAvoidingView>
  );
};

export default SearchPatient;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ecfdf5", // نفس خلفية تسجيل الدخول (Emerald-50/100)
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerSection: {
    marginBottom: 30,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0f172a", // Slate-900
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b", // Slate-500
    fontWeight: "500",
    textAlign: 'right',
    marginTop: 4,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 20,
  },
  inputContainer: {
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputStyle: {
    textAlign: 'right',
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  mainButton: {
    backgroundColor: "#0f172a", // Slate-900 مثل زر الدخول
    borderRadius: 15,
    height: 55,
  },
  buttonTitle: {
    fontWeight: "900",
    fontSize: 16,
  },
  buttonShadow: {
    marginTop: 10,
    borderRadius: 15,
  },
  resultsWrapper: {
    flex: 1,
  },
  resultsCount: {
    textAlign: 'right',
    color: "#64748b",
    fontSize: 13,
    marginBottom: 10,
    fontWeight: 'bold',
    marginRight: 5,
  },
  patientItemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  patientInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  patientName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },
  patientId: {
    fontSize: 12,
    color: "#059669", // Emerald-600 لتعطي طابع طبي
    fontWeight: '600',
    marginTop: 2,
  },
  avatarCircle: {
    backgroundColor: '#f0fdf4',
    padding: 8,
    borderRadius: 12,
    marginLeft: 15,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
    opacity: 0.6,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: "#64748b",
    fontWeight: 'bold',
  }
});