import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native"; 
import { Tab, TabView, Button } from "@rneui/base";

const PatientProfile = ({ navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <View style={styles.container}>
      
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>ملف المريض</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>أحمد محمد</Text>
          <Text style={styles.infoValue}>رقم الملف: #123</Text>
        </View>
      </View>

      <Tab
        value={tabIndex}
        onChange={setTabIndex}
        scrollable
        indicatorStyle={styles.indicator}
      >
        <Tab.Item title="الملاحظات"
         icon={{ name: "description",
          color: "#2A7FFF" }}
          titleStyle={styles.tabText}
          />
          {/* ----------- */}
        <Tab.Item title="الفحوصات"
         icon={{ name: "science",
          color: "#2A7FFF" }}
           titleStyle={styles.tabText} 
           />
           {/* ------------- */}
        <Tab.Item title="المواعيد" 
        icon={{ name: "event", color: "#2A7FFF" }} 
        titleStyle={styles.tabText} 
        />
        {/* --------------- */}
        <Tab.Item title="الجلسات"
         icon={{ name: "opacity", color: "#2A7FFF" }}
          titleStyle={styles.tabText}
           />

      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>
        <TabView.Item style={styles.tabItem}>
          <Text>ملاحظات الطبيب</Text>
          </TabView.Item>


        <TabView.Item style={styles.tabItem}>
          <Text>الفحوصات المخبرية</Text>
          </TabView.Item>


        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>إدارة الجلسات</Text>
            <Button
              title="المواعيد مع الطبيب"
              icon={{ name: "plus", type: "font-awesome", color: "white", size: 15 }}
              buttonStyle={styles.addButton}
              onPress={() => navigation.navigate("DatesDoctor")} 
            />
          </ScrollView>
          </TabView.Item>
        
        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>إدارة الجلسات</Text>
            <Button
              title="إدخال الوزن"
              icon={{ name: "plus", type: "font-awesome", color: "white", size: 15 }}
              buttonStyle={styles.addButton}
              onPress={() => navigation.navigate("WeightInput")} 
            />
          </ScrollView>
        </TabView.Item>
      </TabView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F8F9FA" 
  },
  
  headerCard: { 
    backgroundColor: "#fff", 
    padding: 20, 
    margin: 15, 
    borderRadius: 15, 
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    textAlign: "right", 
    marginBottom: 10,
    color: "#333"
  },
  infoRow: { 
    flexDirection: "row-reverse", 
    justifyContent: "space-between" 
  },
  infoValue: { 
    fontSize: 14, 
    color: "#444" 
  },

  indicator: { 
    backgroundColor: "#2A7FFF", 
    height: 3 
  },
  tabText: { 
    fontSize: 11, 
    color: "#2A7FFF",
    fontWeight: "600"
  },
  tabItem: { 
    width: "100%", 
    alignItems: "center", 
    paddingTop: 50 
  },
  
  // تنسيق المحتوى الداخلي والأزرار
  tabContent: { 
    padding: 20, 
    alignItems: "center" 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold", 
    marginBottom: 20,
    color: "#333" 
  },
  addButton: { 
    backgroundColor: "#2A7FFF", 
    borderRadius: 10, 
    paddingHorizontal: 30,
    paddingVertical: 12
  }
});

export default PatientProfile;