import { Button, Input } from "@rneui/base";
import { useEffect, useState } from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from '../../context/LanguageContext';

const normalizePatient = (patient) => ({
  ...patient,
  id: patient.id ?? patient.patient_id ?? patient.user_id,
  name: patient.name ?? patient.full_name ?? patient.patientName ?? "",
});

const SearchPatient = ({ navigation }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [allPatients, setAllPatients] = useState([]);
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const filterPatients = (queryText, source = allPatients) => {
    const trimmedQuery = queryText.trim().toLowerCase();

    if (!trimmedQuery) {
      setPatients(source);
      return;
    }

    setPatients(
      source.filter((patient) =>
        patient.name?.toLowerCase().includes(trimmedQuery) ||
        String(patient.id ?? "").includes(trimmedQuery)
      )
    );
  };

  const fetchPatients = async (queryText = "", shouldUpdateAll = false) => {
    try {
      setIsLoading(true);
      const response = await api.get(
        `/users/profile/patients/search?name=${encodeURIComponent(queryText.trim())}`
      );
      const normalizedPatients = (Array.isArray(response.data) ? response.data : [])
        .map(normalizePatient)
        .filter((patient) => patient.id);

      if (shouldUpdateAll || !queryText.trim()) {
        setAllPatients(normalizedPatients);
      }

      setPatients(normalizedPatients);
    } catch (err) {
      console.log("Search Error:", err);
      setError(t.searchPatient.fetchError || "حدث خطأ أثناء البحث");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients("", true);
  }, []);

  const handleSearch = (queryText) => {
    if (allPatients.length > 0) {
      filterPatients(queryText);
      return;
    }

    fetchPatients(queryText);
  };

  const handleChangeSearch = (text) => {
    setSearch(text);
    setError("");

    if (allPatients.length > 0) {
      filterPatients(text);
      return;
    }

    fetchPatients(text);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.innerContainer}>

        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>{t.searchPatient.title}</Text>
          <Text style={styles.headerSubtitle}>{t.searchPatient.placeholder}</Text>
        </View>

        <View style={styles.searchCard}>
          <Input
            placeholder={t.searchPatient.placeholder}
            value={search}
            onChangeText={handleChangeSearch}
            errorMessage={error}
            leftIcon={<MaterialCommunityIcons name="magnify" size={24} color="#8296B1" />}
            inputContainerStyle={styles.inputContainer}
            inputStyle={styles.inputStyle}
            containerStyle={{ paddingHorizontal: 0 }}
            errorStyle={{ textAlign: 'right', fontWeight: 'bold' }}
          />

          <Button
            title={t.nurseTabs.search || "بحث"}
            loading={isLoading}
            onPress={() => handleSearch(search)}
            buttonStyle={styles.mainButton}
            titleStyle={styles.buttonTitle}
            containerStyle={styles.buttonShadow}
          />
        </View>

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
                    navigation.navigate("StaffPatientView", { patientId: item.id });
                  }}
                >
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{item.name}</Text>
                    <Text style={styles.patientId}>#{item.id}</Text>
                  </View>
                  <View style={styles.avatarCircle}>
                    <MaterialCommunityIcons name="account-circle" size={35} color="#26CDD6" />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : !isLoading ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-search-outline" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>{t.searchPatient.noResults}</Text>
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
    backgroundColor: "#F1FCFD",
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
    color: "#193B6B",
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8296B1",
    fontWeight: "500",
    textAlign: 'right',
    marginTop: 4,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#193B6B",
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
    color: "#193B6B",
  },
  mainButton: {
    backgroundColor: "#193B6B",
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
    color: "#8296B1",
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
    color: "#193B6B",
  },
  patientId: {
    fontSize: 12,
    color: "#26CDD6",
    fontWeight: '600',
    marginTop: 2,
  },
  avatarCircle: {
    backgroundColor: '#E9FAFB',
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
    color: "#8296B1",
    fontWeight: 'bold',
  }
});
