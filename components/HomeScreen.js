import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome6 } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  return (
    <ImageBackground
      source={require("../assets/image.png")}
      style={styles.backgroundImage}
      blurRadius={2}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container} edges={[""]}>
          <StatusBar barStyle="light-content" />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <FontAwesome6 name="house-crack" size={40} color="#4A90E2" />
            </View>
            <Text style={styles.appName}>Crack Inspector</Text>
            <Text style={styles.tagline}>AI-Powered Inspection</Text>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <View style={styles.featuresCard}>
              <Text style={styles.featuresTitle}>Smart Detection</Text>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="camera" size={24} color="#4A90E2" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureName}>Live Camera Capture</Text>
                  <Text style={styles.featureDesc}>
                    Take photos for instant analysis
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="scan" size={24} color="#4A90E2" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureName}>AI Crack Detection</Text>
                  <Text style={styles.featureDesc}>
                    Identifies cracks with severity levels
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <MaterialIcons name="inventory" size={24} color="#4A90E2" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureName}>Room Analysis</Text>
                  <Text style={styles.featureDesc}>
                    Detects room items and context
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name="stats-chart" size={24} color="#4A90E2" />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureName}>Confidence Scores</Text>
                  <Text style={styles.featureDesc}>
                    AI confidence level for each detection
                  </Text>
                </View>
              </View>
            </View>

            {/* Start Button */}
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate("Inspection")}
              activeOpacity={0.8}
            >
              <View style={styles.buttonGradient}>
                <MaterialIcons name="camera-alt" size={28} color="#fff" />
                <Text style={styles.startButtonText}>Start Inspection</Text>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Info Text */}
            <Text style={styles.infoText}>
              Point camera at surfaces or rooms for AI-powered crack detection
            </Text>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: width,
    height: height,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginTop: height * 0.08,
    marginBottom: height * 0.05,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.95)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  featuresCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  featureText: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: "#666",
  },
  startButton: {
    marginBottom: 20,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4A90E2",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1,
  },
  infoText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 20,
  },
});
