import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  Animated,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BASE_URL } from "../variables";

const { width, height } = Dimensions.get("window");

// Fallback response structure matching new backend format
const getFallbackResponse = () => ({
  image: null,
  model: "fallback",
  objects: [],
  total_objects: 0,
  damage: {
    detected: false,
    types: [],
    severity: "unknown",
    locations: [],
    description: "Unable to analyze image. Please try again.",
  },
  summary: "Analysis failed",
});

const transformResponse = (data) => {
  const damageTypes = data.damage?.types || [];
  const damagedItems = data.damage?.damaged_items || [];

  return {
    success: true,
    analysis: {
      damage_types: damageTypes.map((t) => t.replace(/_/g, " ")),
      damage_severity: data.damage?.severity || "unknown",
      damage_percentage: Math.min(
        100,
        damagedItems.length * 15 + damageTypes.length * 10,
      ),
      room_items: data.objects || [],
      damage_details: {
        water_damage: damageTypes.includes("water_damage")
          ? "Water damage detected in multiple areas"
          : null,
        fire_damage: damageTypes.includes("fire")
          ? "Fire damage detected"
          : null,
        smoke_damage: damageTypes.includes("smoke")
          ? "Smoke damage detected"
          : null,
        structural_damage: damageTypes.includes("structural")
          ? "Structural integrity is compromised"
          : null,
        mold_damage: damageTypes.includes("mold")
          ? "Mold growth detected"
          : null,
        other_damage: data.damage?.description || null,
      },
      damaged_items: damagedItems,
      locations: data.damage?.locations || [],
      recommendations: data.damage?.detected
        ? [
            "Inspect structural elements immediately",
            "Repair water leakage source",
            "Replace or repair damaged furniture",
            "Consult a certified inspector",
          ]
        : ["No major damage detected"],
      estimated_loss: data.damage?.detected
        ? `${damagedItems.length * 200 + 500}`
        : "0",
    },
  };
};

// Convert to UI-friendly format
const formatForUI = (data) => {
  const damageTypes = data.damage?.types || [];

  return {
    success: true,
    analysis: {
      damage_types: damageTypes.map((t) => {
        const typeMap = {
          crack: "Crack",
          water_damage: "Water Damage",
          mold: "Mold",
          fire_damage: "Fire Damage",
          smoke_damage: "Smoke Damage",
          structural: "Structural Damage",
        };
        return (
          typeMap[t] ||
          t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        );
      }),
      damage_severity: data.damage?.severity || "unknown",
      damage_percentage: data.damage?.detected
        ? data.damage.severity === "mild"
          ? 25
          : data.damage.severity === "moderate"
            ? 50
            : data.damage.severity === "severe"
              ? 75
              : 30
        : 0,
      room_items: data.objects || [],
      damaged_items: data.damage?.damaged_items || [],
      damage_details: {
        water_damage: damageTypes.includes("water_damage")
          ? `Water damage detected on ${
              data.damage.locations?.join(", ") || "surfaces"
            }`
          : null,
        fire_damage: damageTypes.includes("fire_damage")
          ? "Fire damage detected"
          : null,
        smoke_damage: damageTypes.includes("smoke_damage")
          ? "Smoke damage detected"
          : null,
        structural_damage: damageTypes.includes("structural")
          ? "Structural issues found"
          : null,
        mold_damage: damageTypes.includes("mold")
          ? "Mold growth detected"
          : null,
        other_damage: data.damage?.description || null,
        damage_locations: data.damage?.locations || [],
        full_description: data.damage?.description || "",
        severity_level: data.damage?.severity || "unknown",
      },
      locations: data.damage?.locations || [],
      recommendations: data.damage?.detected
        ? [
            `Address ${damageTypes.join(", ")} damage immediately`,
            `Check ${
              data.damage.locations?.join(", ") || "affected areas"
            } thoroughly`,
            "Document all damages for insurance claim",
            "Consult a professional inspector for assessment",
            data.damage.severity === "severe"
              ? "Emergency repairs may be needed"
              : "Schedule repairs promptly",
          ]
        : ["No damage detected - property appears to be in good condition"],
      estimated_loss: data.damage?.detected
        ? data.damage.severity === "mild"
          ? "500 - 1,500"
          : data.damage.severity === "moderate"
            ? "1,500 - 5,000"
            : data.damage.severity === "severe"
              ? "5,000 - 15,000"
              : "1,000 - 5,000"
        : "0",
      summary_text: data.summary,
      total_objects_detected: data.total_objects,
    },
  };
};

export default function RoomItemsAndCrackDetections() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] =
    ImagePicker.useMediaLibraryPermissions();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [facing, setFacing] = useState("back");
  const [flash, setFlash] = useState("off");
  const [showControls, setShowControls] = useState(true);
  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startPulseAnimation();
  }, []);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const toggleFlash = () => {
    setFlash((current) => {
      if (current === "off") return "on";
      if (current === "on") return "auto";
      return "off";
    });
  };

  const getFlashIcon = () => {
    switch (flash) {
      case "on":
        return "flash-on";
      case "off":
        return "flash-off";
      case "auto":
        return "flash-auto";
      default:
        return "flash-off";
    }
  };

  const getFlashColor = () => {
    switch (flash) {
      case "on":
        return "#FFD700";
      case "off":
        return "#fff";
      case "auto":
        return "#4A90E2";
      default:
        return "#fff";
    }
  };

  const analyzeImageViaBackend = async (imageUri) => {
    try {
      const formData = new FormData();
      const fileName = `image_${Date.now()}.jpg`;

      formData.append("file", {
        uri:
          Platform.OS === "android"
            ? imageUri
            : imageUri.replace("file://", ""),
        name: fileName,
        type: "image/jpeg",
      });

      console.log("📤 Sending image for analysis:", fileName);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 100000);

      const response = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await response.text();
      console.log("📥 Raw backend response:", text);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const parsedData = JSON.parse(text);
      setRawResponse(parsedData);

      console.log("✅ Parsed response:", parsedData);
      console.log("📍 Damage detected:", parsedData.damage?.detected);
      console.log("🔧 Damage types:", parsedData.damage?.types);
      console.log("📍 Damage locations:", parsedData.damage?.locations);

      const uiFormatted = formatForUI(parsedData);
      console.log("🎨 UI formatted:", uiFormatted);

      return uiFormatted;
    } catch (error) {
      if (error.name === "AbortError") {
        Alert.alert("Timeout", "Server is taking too long. Try again.");
      } else {
        console.error("❌ API Error:", error.message);
        Alert.alert("Error", `Failed to analyze image: ${error.message}`);
      }

      return formatForUI(getFallbackResponse());
    }
  };

  const takePictureAndAnalyze = async () => {
    if (!cameraRef.current) {
      Alert.alert("Error", "Camera not ready");
      return;
    }

    try {
      setLoading(true);
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      const resized = await ImageManipulator.manipulateAsync(
        pic.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8 },
      );

      setPhoto(resized.uri);
      setShowPreview(true);

      const analysisResult = await analyzeImageViaBackend(resized?.uri);
      setResult(analysisResult);
      setLoading(false);
    } catch (error) {
      console.error("Capture Error:", error);
      Alert.alert("Error", "Failed to capture or analyze image");
      setLoading(false);
      setShowPreview(false);
      setPhoto(null);
    }
  };

  const chooseFromFile = async () => {
    try {
      if (!mediaLibraryPermission?.granted) {
        const permissionResponse = await requestMediaLibraryPermission();
        if (!permissionResponse.granted) {
          Alert.alert(
            "Permission Required",
            "Please grant gallery access to select images.",
          );
          return;
        }
      }

      setLoading(true);
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        const selectedImage = pickerResult.assets[0];
        const resized = await ImageManipulator.manipulateAsync(
          selectedImage.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.8 },
        );

        setPhoto(resized.uri);
        setShowPreview(true);

        const analysisResult = await analyzeImageViaBackend(resized.uri);
        setResult(analysisResult);
      }
      setLoading(false);
    } catch (error) {
      console.error("Gallery Error:", error);
      Alert.alert("Error", "Failed to select image");
      setLoading(false);
      setShowPreview(false);
      setPhoto(null);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setResult(null);
    setShowPreview(false);
    setZoomModalVisible(false);
    setRawResponse(null);
  };

  const getDamageIcon = (damageType) => {
    const icons = {
      "Water Damage": "water",
      "Fire Damage": "fire",
      "Smoke Damage": "smoke-detector",
      "Structural Damage": "home-alert",
      Mold: "biohazard",
      Crack: "alert-circle",
      "Other Damage": "alert-decagram",
    };
    return icons[damageType] || "alert-decagram";
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "#8B0000",
      high: "#DC3545",
      severe: "#DC3545",
      medium: "#FFA500",
      moderate: "#FFA500",
      low: "#28A745",
      mild: "#28A745",
      none: "#6C757D",
      unknown: "#6C757D",
    };
    return colors[severity?.toLowerCase()] || "#6C757D";
  };

  const getSeverityText = (severity) => {
    const texts = {
      critical: "CRITICAL",
      severe: "SEVERE",
      high: "HIGH",
      medium: "MODERATE",
      moderate: "MODERATE",
      low: "MILD",
      mild: "MILD",
      none: "NONE",
      unknown: "UNKNOWN",
    };
    return texts[severity?.toLowerCase()] || "UNKNOWN";
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingTextWhite}>
            Requesting camera permission...
          </Text>
        </LinearGradient>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.permissionGradient}
        >
          <MaterialIcons name="camera-alt" size={80} color="#fff" />
          <Text style={styles.permissionText}>Camera access is required</Text>
          <Text style={styles.permissionSubtext}>
            Insurance inspection requires camera access
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <LinearGradient
              colors={["#FF6B6B", "#FF8E53"]}
              style={styles.permissionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="camera" size={24} color="#fff" />
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {!showPreview ? (
          <View style={StyleSheet.absoluteFillObject}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              ref={cameraRef}
              facing={facing}
              flash={flash}
            >
              {/* Top Controls */}
              <LinearGradient
                colors={["rgba(0,0,0,0.7)", "transparent"]}
                style={styles.topGradient}
              >
                <View style={styles.topControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={() => navigation.goBack()}
                  >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.headerCenter}>
                    <MaterialCommunityIcons
                      name="shield-home"
                      size={28}
                      color="#FFD700"
                    />
                    <Text style={styles.headerTitle}>Insurance Inspector</Text>
                    <Text style={styles.headerSubtitle}>
                      AI Damage Assessment
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={toggleFlash}
                  >
                    <MaterialIcons
                      name={getFlashIcon()}
                      size={24}
                      color={getFlashColor()}
                    />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Bottom Controls */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.bottomGradient}
              >
                <View style={styles.bottomControls}>
                  <TouchableOpacity
                    style={styles.galleryButton}
                    onPress={chooseFromFile}
                  >
                    <View style={styles.galleryButtonInner}>
                      <MaterialIcons
                        name="photo-library"
                        size={28}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.controlLabel}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePictureAndAnalyze}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={["#4A90E2", "#357ABD"]}
                      style={styles.captureButtonGradient}
                    >
                      <View style={styles.captureButtonInner}>
                        <MaterialIcons
                          name="camera-alt"
                          size={36}
                          color="#fff"
                        />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.flipButton}
                    onPress={toggleCameraFacing}
                  >
                    <View style={styles.flipButtonInner}>
                      <MaterialIcons
                        name="flip-camera-ios"
                        size={28}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.controlLabel}>Flip</Text>
                  </TouchableOpacity>
                </View>

                {/* Instructions */}
                <View style={styles.instructions}>
                  <MaterialCommunityIcons
                    name="scan-helper"
                    size={16}
                    color="#FFD700"
                  />
                  <Text style={styles.instructionText}>
                    Position the damage in frame and tap capture
                  </Text>
                </View>
              </LinearGradient>
            </CameraView>
          </View>
        ) : (
          <ScrollView
            style={styles.resultsContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.imagePreviewContainer}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setZoomModalVisible(true)}
              >
                <Image source={{ uri: photo }} style={styles.previewImage} />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.5)"]}
                  style={styles.previewOverlay}
                />
              </TouchableOpacity>

              <View style={styles.zoomHint}>
                <MaterialIcons name="zoom-in" size={20} color="#fff" />
                <Text style={styles.zoomHintText}>Tap to zoom</Text>
              </View>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={retakePhoto}
              >
                <MaterialIcons name="refresh" size={24} color="#fff" />
                <Text style={styles.retakeText}>New Image</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  style={styles.loadingCard}
                >
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.loadingTextWhite}>
                    AI Analyzing Image...
                  </Text>
                  <Text style={styles.loadingSubtextWhite}>
                    Detecting damages and assessing severity
                  </Text>
                  <View style={styles.loadingDots}>
                    {[0, 1, 2].map((dot) => (
                      <View key={dot} style={styles.loadingDot} />
                    ))}
                  </View>
                </LinearGradient>
              </View>
            ) : result && result.success ? (
              <View style={styles.resultsCard}>
                {/* Summary Banner */}
                {result.analysis.summary_text && (
                  <LinearGradient
                    colors={["#E3F2FD", "#BBDEFB"]}
                    style={styles.summaryBanner}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialCommunityIcons
                      name="robot"
                      size={24}
                      color="#1565C0"
                    />
                    <Text style={styles.summaryText}>
                      {result.analysis.summary_text}
                    </Text>
                  </LinearGradient>
                )}

                {/* Damage Severity Banner */}
                <View
                  style={[
                    styles.severityBanner,
                    {
                      backgroundColor:
                        getSeverityColor(result.analysis.damage_severity) +
                        "15",
                      borderLeftColor: getSeverityColor(
                        result.analysis.damage_severity,
                      ),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.severityIconContainer,
                      {
                        backgroundColor: getSeverityColor(
                          result.analysis.damage_severity,
                        ),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="shield-alert"
                      size={32}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.severityContent}>
                    <Text
                      style={[
                        styles.severityTitle,
                        {
                          color: getSeverityColor(
                            result.analysis.damage_severity,
                          ),
                        },
                      ]}
                    >
                      Damage Severity:{" "}
                      {getSeverityText(result.analysis.damage_severity)}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${result.analysis.damage_percentage}%`,
                            backgroundColor: getSeverityColor(
                              result.analysis.damage_severity,
                            ),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.severityText}>
                      {result.analysis.damage_percentage}% of area affected
                    </Text>
                  </View>
                </View>

                {/* Damage Locations */}
                {result.analysis.damage_details?.damage_locations?.length >
                  0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View
                        style={[
                          styles.sectionIcon,
                          { backgroundColor: "#FF9800" },
                        ]}
                      >
                        <MaterialIcons
                          name="location-on"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <Text style={styles.sectionTitle}>Damage Locations</Text>
                    </View>
                    <View style={styles.locationsContainer}>
                      {result.analysis.damage_details.damage_locations.map(
                        (location, index) => (
                          <View key={index} style={styles.locationBadge}>
                            <Ionicons
                              name="location"
                              size={16}
                              color="#FF9800"
                            />
                            <Text style={styles.locationText}>
                              {location.charAt(0).toUpperCase() +
                                location.slice(1)}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                  </View>
                )}

                {/* Damage Types */}
                {result.analysis.damage_types &&
                  result.analysis.damage_types.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View
                          style={[
                            styles.sectionIcon,
                            { backgroundColor: "#DC3545" },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="alert-decagram"
                            size={20}
                            color="#fff"
                          />
                        </View>
                        <Text style={styles.sectionTitle}>
                          Detected Damages (
                          {result.analysis.damage_types.length})
                        </Text>
                      </View>
                      <View style={styles.damageTypesContainer}>
                        {result.analysis.damage_types.map((type, index) => (
                          <LinearGradient
                            key={index}
                            colors={["#FFF3E0", "#FFE0B2"]}
                            style={styles.damageTypeBadge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <MaterialCommunityIcons
                              name={getDamageIcon(type)}
                              size={20}
                              color={getSeverityColor(
                                result.analysis.damage_severity,
                              )}
                            />
                            <Text style={styles.damageTypeText}>{type}</Text>
                          </LinearGradient>
                        ))}
                      </View>
                    </View>
                  )}

                {/* Full Description */}
                {result.analysis.damage_details?.full_description && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View
                        style={[
                          styles.sectionIcon,
                          { backgroundColor: "#4A90E2" },
                        ]}
                      >
                        <MaterialIcons
                          name="description"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <Text style={styles.sectionTitle}>
                        Detailed Assessment
                      </Text>
                    </View>
                    <View style={styles.descriptionCard}>
                      <Text style={styles.descriptionText}>
                        {result.analysis.damage_details.full_description}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Damage Details */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View
                      style={[
                        styles.sectionIcon,
                        { backgroundColor: "#2196F3" },
                      ]}
                    >
                      <MaterialIcons
                        name="info-outline"
                        size={20}
                        color="#fff"
                      />
                    </View>
                    <Text style={styles.sectionTitle}>Damage Breakdown</Text>
                  </View>

                  {result.analysis.damage_details.water_damage && (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIcon,
                          { backgroundColor: "#2196F3" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="water"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Water Damage</Text>
                        <Text style={styles.detailText}>
                          {result.analysis.damage_details.water_damage}
                        </Text>
                      </View>
                    </View>
                  )}

                  {result.analysis.damage_details.mold_damage && (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIcon,
                          { backgroundColor: "#4CAF50" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="biohazard"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Mold</Text>
                        <Text style={styles.detailText}>
                          {result.analysis.damage_details.mold_damage}
                        </Text>
                      </View>
                    </View>
                  )}

                  {result.analysis.damage_details.structural_damage && (
                    <View style={styles.detailItem}>
                      <View
                        style={[
                          styles.detailIcon,
                          { backgroundColor: "#FF9800" },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="home-alert"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>
                          Structural Damage
                        </Text>
                        <Text style={styles.detailText}>
                          {result.analysis.damage_details.structural_damage}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Room Items */}
                {result.analysis.room_items &&
                  result.analysis.room_items.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View
                          style={[
                            styles.sectionIcon,
                            { backgroundColor: "#6C63FF" },
                          ]}
                        >
                          <MaterialIcons
                            name="inventory"
                            size={20}
                            color="#fff"
                          />
                        </View>
                        <Text style={styles.sectionTitle}>
                          Room Contents (
                          {result.analysis.total_objects_detected ||
                            result.analysis.room_items.length}
                          )
                        </Text>
                      </View>
                      <View style={styles.itemsGrid}>
                        {result.analysis.room_items.map((item, index) => (
                          <View key={index} style={styles.itemBadge}>
                            <FontAwesome5
                              name="circle"
                              size={8}
                              color="#6C63FF"
                            />
                            <Text style={styles.itemText}>
                              {item.charAt(0).toUpperCase() + item.slice(1)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                {result.analysis.damaged_items &&
                  result.analysis.damaged_items.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View
                          style={[
                            styles.sectionIcon,
                            { backgroundColor: "#D32F2F" },
                          ]}
                        >
                          <MaterialIcons name="build" size={20} color="#fff" />
                        </View>
                        <Text style={styles.sectionTitle}>
                          Damaged Items ({result.analysis.damaged_items.length})
                        </Text>
                      </View>

                      {result.analysis.damaged_items.map((item, index) => (
                        <View key={index} style={styles.damagedItemCard}>
                          <View style={styles.damagedItemHeader}>
                            <MaterialCommunityIcons
                              name="alert"
                              size={20}
                              color={getSeverityColor(item.severity)}
                            />
                            <Text style={styles.damagedItemName}>
                              {item.item.toUpperCase()}
                            </Text>
                            <View
                              style={[
                                styles.severityBadge,
                                {
                                  backgroundColor:
                                    getSeverityColor(item.severity) + "20",
                                  borderColor: getSeverityColor(item.severity),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.severityBadgeText,
                                  { color: getSeverityColor(item.severity) },
                                ]}
                              >
                                {item.severity.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.damagedItemType}>
                            Type: {item.damage_type.replace("_", " ")}
                          </Text>
                          <Text style={styles.damagedItemDescription}>
                            {item.description}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                {result.analysis.locations &&
                  result.analysis.locations.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <View
                          style={[
                            styles.sectionIcon,
                            { backgroundColor: "#6C63FF" },
                          ]}
                        >
                          <MaterialIcons name="place" size={20} color="#fff" />
                        </View>
                        <Text style={styles.sectionTitle}>Affected Areas</Text>
                      </View>

                      <View style={styles.itemsGrid}>
                        {result.analysis.locations.map((loc, index) => (
                          <View key={index} style={styles.itemBadge}>
                            <Text style={styles.itemText}>
                              {loc.charAt(0).toUpperCase() + loc.slice(1)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                {/* Estimated Loss */}
                {result.analysis.estimated_loss && (
                  <LinearGradient
                    colors={["#E8F5E9", "#C8E6C9"]}
                    style={styles.lossCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.lossIconContainer}>
                      <MaterialIcons
                        name="attach-money"
                        size={32}
                        color="#28A745"
                      />
                    </View>
                    <View style={styles.lossContent}>
                      <Text style={styles.lossTitle}>Estimated Loss</Text>
                      <Text style={styles.lossAmount}>
                        ${result.analysis.estimated_loss}
                      </Text>
                      <Text style={styles.lossNote}>
                        *Approximate range based on damage assessment
                      </Text>
                    </View>
                  </LinearGradient>
                )}

                {/* Recommendations */}
                {result.analysis.recommendations &&
                  result.analysis.recommendations.length > 0 && (
                    <View style={styles.actionCard}>
                      <View style={styles.actionHeader}>
                        <MaterialIcons
                          name="checklist"
                          size={24}
                          color="#1565C0"
                        />
                        <Text style={styles.actionTitle}>
                          Recommended Actions
                        </Text>
                      </View>
                      {result.analysis.recommendations.map((action, index) => (
                        <View key={index} style={styles.actionItem}>
                          <View style={styles.checkCircle}>
                            <MaterialIcons
                              name="check"
                              size={16}
                              color="#fff"
                            />
                          </View>
                          <Text style={styles.actionText}>{action}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Model Info */}
                {rawResponse?.model && (
                  <View style={styles.modelInfo}>
                    <Text style={styles.modelInfoText}>
                      Analyzed by: {rawResponse.model}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.errorCard}>
                <MaterialIcons name="error-outline" size={48} color="#FFA500" />
                <Text style={styles.errorText}>Analysis failed</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={retakePhoto}
                >
                  <LinearGradient
                    colors={["#FF6B6B", "#FF8E53"]}
                    style={styles.retryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* Zoom Modal */}
        <Modal
          visible={zoomModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setZoomModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback
              onPress={() => setZoomModalVisible(false)}
            >
              <View style={styles.modalBackground} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setZoomModalVisible(false)}
              >
                <LinearGradient
                  colors={["#FF6B6B", "#FF8E53"]}
                  style={styles.closeButtonGradient}
                >
                  <MaterialIcons name="close" size={28} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
              <ScrollView
                minimumZoomScale={1}
                maximumZoomScale={4}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: photo }}
                  style={styles.zoomedImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },

  // Camera Controls
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 10,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  controlButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 25,
    padding: 10,
    backdropFilter: "blur(10px)",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 2,
  },

  // Scanning Overlay
  scanningOverlay: {
    position: "absolute",
    top: "20%",
    left: "10%",
    right: "10%",
    bottom: "30%",
    borderWidth: 2,
    borderColor: "rgba(74, 144, 226, 0.3)",
    borderRadius: 20,
  },
  cornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#4A90E2",
    borderTopLeftRadius: 10,
  },
  cornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#4A90E2",
    borderTopRightRadius: 10,
  },
  cornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#4A90E2",
    borderBottomLeftRadius: 10,
  },
  cornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#4A90E2",
    borderBottomRightRadius: 10,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#4A90E2",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },

  // Bottom Controls
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 10,
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  galleryButton: {
    alignItems: "center",
  },
  galleryButtonInner: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 12,
    marginBottom: 5,
    backdropFilter: "blur(10px)",
  },
  captureButton: {
    alignItems: "center",
  },
  captureButtonGradient: {
    borderRadius: 40,
    padding: 5,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  flipButton: {
    alignItems: "center",
  },
  flipButtonInner: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 12,
    marginBottom: 5,
    backdropFilter: "blur(10px)",
  },
  controlLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  instructions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    gap: 8,
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  // Preview
  imagePreviewContainer: {
    position: "relative",
    backgroundColor: "#000",
  },
  previewImage: {
    width: width,
    height: height * 0.5,
  },
  previewOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  zoomHint: {
    position: "absolute",
    bottom: 16,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    backdropFilter: "blur(10px)",
  },
  zoomHintText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  retakeButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    backdropFilter: "blur(10px)",
  },
  retakeText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },

  // Loading
  loadingContainer: {
    padding: 20,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
  },
  loadingTextWhite: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 15,
  },
  loadingSubtextWhite: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 5,
  },
  loadingDots: {
    flexDirection: "row",
    marginTop: 20,
    gap: 8,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
    opacity: 0.6,
  },

  // Results
  resultsCard: {
    padding: 20,
  },
  summaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: "#1565C0",
    lineHeight: 20,
    fontWeight: "500",
  },
  severityBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 5,
    backgroundColor: "#FFF3E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  severityIconContainer: {
    borderRadius: 20,
    padding: 12,
  },
  severityContent: {
    flex: 1,
    marginLeft: 16,
  },
  severityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  severityText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  // Sections
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },
  sectionIcon: {
    borderRadius: 12,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  // Locations
  locationsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF9800",
  },

  // Damage Types
  damageTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  damageTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  damageTypeText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#E65100",
  },

  // Description
  descriptionCard: {
    backgroundColor: "#F8F9FA",
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4A90E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 24,
  },

  // Detail Items
  detailItem: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  detailIcon: {
    borderRadius: 12,
    padding: 10,
    alignSelf: "flex-start",
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },

  // Items Grid
  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  itemBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  itemText: {
    fontSize: 14,
    color: "#6C63FF",
    fontWeight: "500",
  },

  // Damaged Items
  damagedItemCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#DC3545",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  damagedItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  damagedItemName: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  damagedItemType: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  damagedItemDescription: {
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
  },

  // Loss Card
  lossCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lossIconContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
  },
  lossContent: {
    flex: 1,
  },
  lossTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  lossAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#28A745",
    marginBottom: 4,
  },
  lossNote: {
    fontSize: 11,
    color: "#999",
  },

  // Action Card
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E3F2FD",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1565C0",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  checkCircle: {
    backgroundColor: "#4A90E2",
    borderRadius: 12,
    padding: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
    lineHeight: 20,
  },

  // Error
  errorCard: {
    padding: 40,
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFA500",
    marginTop: 10,
    marginBottom: 20,
  },

  // Permission Screen
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 40,
  },
  permissionGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 40,
  },
  permissionText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    color: "#fff",
  },
  permissionSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  permissionButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  permissionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 15,
    gap: 10,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Retry Button
  retryButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
  },
  retryButtonGradient: {
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    borderRadius: 25,
    overflow: "hidden",
  },
  closeButtonGradient: {
    borderRadius: 25,
    padding: 8,
  },
  zoomedImage: {
    width: width,
    height: height,
  },

  // Model Info
  modelInfo: {
    marginTop: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "center",
  },
  modelInfoText: {
    fontSize: 12,
    color: "#999",
  },

  // Center Container
  center: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
    color: "#333",
  },
});
