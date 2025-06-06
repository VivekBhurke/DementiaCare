import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal, Alert, Platform, SafeAreaView, Linking, PermissionsAndroid } from 'react-native';
import { useAuth } from '../../context/auth';
import { Bell, Brain, MapPin, Calendar, CircleAlert as AlertCircle, Plus, X, Image as ImageIcon, Camera, Navigation, Phone, Mail, Clock, Activity, Heart, AlertTriangle, Compass } from 'lucide-react-native';
import { FamilyPhoto } from '../../types/auth';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { Circle } from "react-native-maps";

// Mock MapView component for web
const MockMapView = ({ children, style, initialRegion, onPress }: any) => (
  <View style={[style, { backgroundColor: '#e0e0e0' }]}>
    <Text style={{ textAlign: 'center', marginTop: 20 }}>
      Map View (Not available on web)
    </Text>
    {children}
  </View>
);

const MockMarker = ({ coordinate, title, description }: any) => (
  <View style={{ display: 'none' }} />
);

const MapViewComponent = Platform.OS === 'web' ? MockMapView : require('react-native-maps').default;
const MarkerComponent = Platform.OS === 'web' ? MockMarker : require('react-native-maps').Marker;

export default function HomeScreen() {
  const { user, getFamilyPhotos, addFamilyPhoto, getPatientDetails } = useAuth();
  const isPatient = user?.role === 'patient';
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [connectedPatients, setConnectedPatients] = useState<any[]>([]);
  const [familyPhotos, setFamilyPhotos] = useState<FamilyPhoto[]>([]);
  
  // Form state
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);


  // Location tracking state
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [patientLocation, setPatientLocation] = useState<Location.LocationObject | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isOutsideSafeZone, setIsOutsideSafeZone] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const mapRef = React.useRef<any>(null);

  // Safe zone configuration
  const safeZoneCenter = {
    latitude: 16.8457,
    longitude: 74.6015
  };
  const safeZoneRadius = 1000; // meters

  useEffect(() => {
    // Request location permissions
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission(true);
          // Get initial location if patient
          if (isPatient) {
            const location = await Location.getCurrentPositionAsync({});
            setPatientLocation(location);
            setLastUpdateTime(new Date());
            startLocationTracking();
          }
        }
      }
    })();

    return () => {
      // Cleanup location subscription
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  const startLocationTracking = async () => {
    if (!locationPermission) return;

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        setPatientLocation(location);
        setLastUpdateTime(new Date());

        const getDistance = (point1: { latitude: number; longitude: number }, point2: { latitude: number; longitude: number }): number => {
          const toRadians = (degrees: number) => degrees * (Math.PI / 180);
          const earthRadius = 6371000; 

          const dLat = toRadians(point2.latitude - point1.latitude);
          const dLon = toRadians(point2.longitude - point1.longitude);

          const lat1 = toRadians(point1.latitude);
          const lat2 = toRadians(point2.latitude);

          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          return earthRadius * c;
        };

        const distance = getDistance(
          { 
            latitude: location.coords.latitude, 
            longitude: location.coords.longitude 
          },
          safeZoneCenter
        );
        
        setIsOutsideSafeZone(distance > safeZoneRadius);
        
        if (distance > safeZoneRadius) {
          console.log("Patient outside safe zone!");
        }
      }
    );

    setLocationSubscription(subscription);
  };

  const centerOnPatient = () => {
    if (patientLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: patientLocation.coords.latitude,
        longitude: patientLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdateTime) return 'Not available';
    
    const now = new Date();
    const diff = now.getTime() - lastUpdateTime.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return lastUpdateTime.toLocaleTimeString();
    }
  };

  useEffect(() => {
    // Request location permissions
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          setLocationPermission(true);
          // Get initial location if patient
          if (isPatient) {
            const location = await Location.getCurrentPositionAsync({});
            setPatientLocation(location);
            setLastUpdateTime(new Date());
            startLocationTracking();
          }
        }
      }
    })();

    return () => {
      // Cleanup location subscription
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Get connected patients if caretaker
    if (user?.role === 'caretaker' && user.connectedPatients) {
      const patients = user.connectedPatients.map(id => getPatientDetails(id)).filter(Boolean);
      setConnectedPatients(patients);
      if (patients.length > 0 && !selectedPatientId && patients[0]) {
        setSelectedPatientId(patients[0].id);
      }
    }

    // Get photos for the appropriate user
    const patientId = isPatient ? user?.id : selectedPatientId;
    if (patientId) {
      const photos = getFamilyPhotos(patientId);
      setFamilyPhotos(photos);
    }
  }, [user, selectedPatientId]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera and photo library permissions to use this feature.');
        return false;
      }
      return true;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return <View > Error </View>;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setPhotoUri(result.assets[0].uri);
        setPhotoPickerVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return <View > Error </View>;

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      
      if (!result.canceled) {        
        setPhotoUri(result.assets[0].uri);
        setPhotoPickerVisible(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleAddPhoto = async () => {
    if (!photoTitle.trim() || !photoUri) {
      Alert.alert('Error', 'Please provide a title and select a photo');
      return <View > Error </View>;
    }

    try {
      const patientId = isPatient ? user?.id : selectedPatientId;
      if (!patientId) {
        Alert.alert('Error', 'No patient selected');
        return <View > Error </View>;
      }

      await addFamilyPhoto({
        title: photoTitle,
        uri: photoUri,
        description: photoDescription,
        uploadedAt: new Date().toISOString(),
        patientId,
        isLocal: true,
      });

      // Refresh photos
      const updatedPhotos = getFamilyPhotos(patientId);
      setFamilyPhotos(updatedPhotos);
      
      // Reset form
      setPhotoTitle('');
      setPhotoUri('');
      setPhotoDescription('');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    const photos = getFamilyPhotos(patientId);
    setFamilyPhotos(photos);
  };

  const SOS_NUMBER = '8421471098';
  const sendSOSMessage = async () => {

    const openSms = (body: string) => {
      const separator = Platform.OS === 'android' ? '?' : '&';
      const url = `sms:${SOS_NUMBER}${separator}body=${encodeURIComponent(body)}`;
      Linking.openURL(url).catch((e) =>
        console.error('Failed to open SMS composer', e)
      );
    };

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission to access location was denied');
      openSms('🚨 Emergency! Please help. (Location unavailable)');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
      const message = `🚨 Emergency! Please help. My location: ${mapsLink}`;
      openSms(message);
    } catch (error) {
      console.error('Location error:', error);
      openSms('🚨 Emergency! Please help. (Location unavailable)');
    }
    finally {
      makeSOSCall();
    }
  };

  const makeSOSCall = () => {
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    const url = `${scheme}${SOS_NUMBER}`;

    Linking.openURL(url).catch((e) =>
      console.error('Failed to initiate call', e)
    );
  };

  const PatientDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1551076805-e1869033e561' }}
            style={styles.profileImage}
          />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.sosButton} onPress={() => {sendSOSMessage()}}>
            <AlertCircle color="#fff" size={32} />
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activities</Text>
          <View style={styles.activityGrid}>
            <TouchableOpacity style={styles.activityCard}>
              <Brain color="#4A90E2" size={24} />
              <Text style={styles.activityText}>Brain Games</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityCard}>
              <MapPin color="#50C878" size={24} />
              <Text style={styles.activityText}>Daily Walk</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityCard}>
              <Bell color="#FFB347" size={24} />
              <Text style={styles.activityText}>Medications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityCard}>
              <Calendar color="#FF69B4" size={24} />
              <Text style={styles.activityText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
          <View style={styles.reminderList}>
            <View style={styles.reminderItem}>
              <Bell color="#4A90E2" size={20} />
              <Text style={styles.reminderText}>Take morning medication - 9:00 AM</Text>
            </View>
            <View style={styles.reminderItem}>
              <MapPin color="#50C878" size={20} />
              <Text style={styles.reminderText}>Morning walk - 10:00 AM</Text>
            </View>
            <View style={styles.reminderItem}>
              <Brain color="#FFB347" size={20} />
              <Text style={styles.reminderText}>Memory Game Session - 2:00 PM</Text>
            </View>
          </View>
        </View>

        {familyPhotos.length > 0 && (
          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>Family Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {familyPhotos.map(photo => (
                <View key={photo.id} style={styles.photoCard}>
                  <Image source={{ uri: photo.uri }} style={styles.familyPhoto} />
                  <Text style={styles.photoTitle}>{photo.title}</Text>
                  {photo.description && (
                    <Text style={styles.photoDescription}>{photo.description}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </ScrollView>
  );

  const LocationTrackingModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={locationModalVisible}
      onRequestClose={() => setLocationModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Patient Location</Text>
            <TouchableOpacity 
              onPress={() => setLocationModalVisible(false)}
              style={styles.closeButton}
            >
              <X color="#666" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <MapViewComponent
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: patientLocation?.coords.latitude || safeZoneCenter.latitude,
                longitude: patientLocation?.coords.longitude || safeZoneCenter.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              {/* Safe zone circle */}
              <Circle
                center={safeZoneCenter}
                radius={safeZoneRadius}
                fillColor="rgba(74, 144, 226, 0.1)"
                strokeColor="rgba(74, 144, 226, 0.3)"
                strokeWidth={2}
              />

              {/* Patient marker */}
              {patientLocation && (
                <MarkerComponent
                  coordinate={{
                    latitude: patientLocation.coords.latitude,
                    longitude: patientLocation.coords.longitude,
                  }}
                  title="Patient Location"
                  description={`Last updated: ${formatLastUpdate()}`}
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.markerInner}>
                      <View style={styles.markerDot} />
                    </View>
                  </View>
                </MarkerComponent>
              )}

              {/* Home marker */}
              <MarkerComponent
                coordinate={safeZoneCenter}
                title="Home"
                description="Safe zone center"
              >
                <View style={styles.homeMarker}>
                  <View style={styles.homeMarkerInner} />
                </View>
              </MarkerComponent>
            </MapViewComponent>

            {/* Map controls */}
            <View style={styles.mapControls}>
              <TouchableOpacity 
                style={styles.mapControlButton}
                onPress={centerOnPatient}
              >
                <Compass color="#333" size={24} />
              </TouchableOpacity>
            </View>

            {/* Safe zone warning */}
            {isOutsideSafeZone && (
              <View style={styles.safeZoneWarning}>
                <AlertTriangle color="#fff" size={20} />
                <Text style={styles.safeZoneWarningText}>
                  Patient is outside safe zone
                </Text>
              </View>
            )}
          </View>

          <View style={styles.locationDetails}>
            <View style={styles.locationDetailItem}>
              <Clock color="#4A90E2" size={20} />
              <Text style={styles.locationDetailText}>
                Last Updated: {formatLastUpdate()}
              </Text>
            </View>
            <View style={styles.locationDetailItem}>
              <Activity color={isOutsideSafeZone ? "#ff3b30" : "#50C878"} size={20} />
              <Text style={[
                styles.locationDetailText,
                isOutsideSafeZone && styles.warningText
              ]}>
                Status: {isOutsideSafeZone ? 'Outside Safe Zone' : 'Within Safe Zone'}
              </Text>
            </View>
            {patientLocation && (
              <>
                <View style={styles.locationDetailItem}>
                  <MapPin color="#FFB347" size={20} />
                  <Text style={styles.locationDetailText}>
                    Lat: {patientLocation.coords.latitude.toFixed(6)}
                  </Text>
                </View>
                <View style={styles.locationDetailItem}>
                  <MapPin color="#FFB347" size={20} />
                  <Text style={styles.locationDetailText}>
                    Long: {patientLocation.coords.longitude.toFixed(6)}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.locationActions}>
            <TouchableOpacity 
              style={styles.locationActionButton}
              onPress={() => {
                // In a real app, implement phone call functionality
                Alert.alert('Call Patient', 'This would initiate a phone call to the patient');
              }}
            >
              <Phone color="#fff" size={20} />
              <Text style={styles.locationActionText}>Call Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.locationActionButton, styles.messageButton]}
              onPress={() => {
                // In a real app, implement messaging functionality
                Alert.alert('Message Patient', 'This would open the messaging interface');
              }}
            >
              <Mail color="#fff" size={20} />
              <Text style={styles.locationActionText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const CaretakerDashboard = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' }}
            style={styles.profileImage}
          />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Overview</Text>
          {connectedPatients.length > 0 ? (
            <View style={styles.patientGrid}>
              {connectedPatients.map(patient => (
                <View key={patient.id} style={styles.patientCard}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientStatus}>Status: Active</Text>
                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => setSelectedPatientId(patient.id)}
                  >
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No patients connected</Text>
              <Text style={styles.emptyStateSubtext}>
                Connect to patients in the Profile tab
              </Text>
            </View>
          )}
        </View>

        {connectedPatients.length > 0 && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Family Photos</Text>
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Plus color="#fff" size={20} />
                </TouchableOpacity>
              </View>

              <View style={styles.patientSelector}>
                <Text style={styles.selectorLabel}>Select Patient:</Text>
                <View style={styles.patientButtons}>
                  {connectedPatients.map(patient => (
                    <TouchableOpacity
                      key={patient.id}
                      style={[
                        styles.patientButton,
                        selectedPatientId === patient.id && styles.patientButtonActive
                      ]}
                      onPress={() => handlePatientChange(patient.id)}
                    >
                      <Text 
                        style={[
                          styles.patientButtonText,
                          selectedPatientId === patient.id && styles.patientButtonTextActive
                        ]}
                      >
                        {patient.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {familyPhotos.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                  {familyPhotos.map(photo => (
                    <View key={photo.id} style={styles.photoCard}>
                      <Image source={{ uri: photo.uri }} style={styles.familyPhoto} />
                      <Text style={styles.photoTitle}>{photo.title}</Text>
                      {photo.description && (
                        <Text style={styles.photoDescription}>{photo.description}</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyPhotos}>
                  <ImageIcon color="#666" size={40} />
                  <Text style={styles.emptyPhotosText}>No photos added yet</Text>
                  <Text style={styles.emptyPhotosSubtext}>
                    Add family photos to help your patient remember loved ones
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.activityGrid}>
                <TouchableOpacity style={styles.activityCard} onPress={() => setLocationModalVisible(true)}>
                  <MapPin color="#4A90E2" size={24} />
                  <Text style={styles.activityText}>Track Location</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.activityCard}>
                  <Calendar color="#50C878" size={24} />
                  <Text style={styles.activityText}>Set Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.activityCard}>
                  <Bell color="#FFB347" size={24} />
                  <Text style={styles.activityText}>Set Reminders</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.activityCard}>
                  <Brain color="#FF69B4" size={24} />
                  <Text style={styles.activityText}>Assign Games</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.section, styles.lastSection]}>
              <Text style={styles.sectionTitle}>Recent Alerts</Text>
              <View style={styles.alertList}>
                <View style={[styles.alertItem, styles.alertHigh]}>
                  <AlertCircle color="#fff" size={20} />
                  <Text style={styles.alertText}>SOS Alert - 2 hours ago</Text>
                </View>
                <View style={[styles.alertItem, styles.alertMedium]}>
                  <Bell color="#fff" size={20} />
                  <Text style={styles.alertText}>Missed Medication - 4 hours ago</Text>
                </View>
                <View style={[styles.alertItem, styles.alertLow]}>
                  <MapPin color="#fff" size={20} />
                  <Text style={styles.alertText}>Left Safe Zone - Yesterday</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </SafeAreaView>
    </ScrollView>
  );

  return (
    isPatient ? <PatientDashboard /> : 
    <><CaretakerDashboard />
    <LocationTrackingModal />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Family Photo</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Family Reunion"
                value={photoTitle}
                onChangeText={setPhotoTitle}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Photo</Text>
              <TouchableOpacity 
                style={styles.photoSelector}
                onPress={() => setPhotoPickerVisible(true)}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.selectedPhoto} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera color="#666" size={32} />
                    <Text style={styles.photoPlaceholderText}>Tap to select photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add details about this photo..."
                value={photoDescription}
                onChangeText={setPhotoDescription}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.submitButton, !photoUri && styles.submitButtonDisabled]}
              onPress={handleAddPhoto}
              disabled={!photoUri}
            >
              <Text style={styles.submitButtonText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Photo Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={photoPickerVisible}
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.photoPickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Photo</Text>
              <TouchableOpacity 
                onPress={() => setPhotoPickerVisible(false)}
                style={styles.closeButton}
              >
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoOptions}>
              <TouchableOpacity 
                style={styles.photoOption}
                onPress={takePhoto}
              >
                <Camera color="#4A90E2" size={40} />
                <Text style={styles.photoOptionText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.photoOption}
                onPress={pickImage}
              >
                <ImageIcon color="#50C878" size={40} />
                <Text style={styles.photoOptionText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? 85 : 65, // Match tab bar height
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  headerText: {
    marginLeft: 15,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  quickActions: {
    padding: 20,
  },
  sosButton: {
    backgroundColor: '#ff3b30',
    padding: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  sosText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  lastSection: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  activityCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    margin: '1%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  activityText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reminderList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reminderText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  patientGrid: {
    marginTop: 10,
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  patientStatus: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 5,
  },
  viewDetailsButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  alertList: {
    marginTop: 10,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  alertHigh: {
    backgroundColor: '#ff3b30',
  },
  alertMedium: {
    backgroundColor: '#ff9500',
  },
  alertLow: {
    backgroundColor: '#4A90E2',
  },
  alertText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  photoScroll: {
    marginTop: 10,
  },
  photoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginRight: 15,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  familyPhoto: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  photoDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyPhotos: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyPhotosText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  emptyPhotosSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientSelector: {
    marginBottom: 15,
  },
  selectorLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  patientButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patientButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  patientButtonActive: {
    backgroundColor: '#4A90E2',
  },
  patientButtonText: {
    color: '#666',
    fontSize: 14,
  },
  patientButtonTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a0c8f0',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoSelector: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  selectedPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPickerContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  photoOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    marginBottom: 10,
  },
  photoOption: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    width: '45%',
  },
  photoOptionText: {
    marginTop: 10,
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  mapContainer: {
    height: '50%',
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerInner: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(74, 144, 226, 0.4)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerDot: {
    width: 12,
    height: 12,
    backgroundColor: '#4A90E2',
    borderRadius: 6,
  },
  homeMarker: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(80, 200, 120, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeMarkerInner: {
    width: 16,
    height: 16,
    backgroundColor: '#50C878',
    borderRadius: 8,
  },
  mapControls: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  mapControlButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  safeZoneWarning: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#ff3b30',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  safeZoneWarningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationDetails: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationDetailText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  warningText: {
    color: '#ff3b30',
  },
  locationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  locationActionButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    paddingHorizontal: 15,
    borderRadius: 15,
    flex: 1,
    marginRight: 10,
  },
  messageButton: {
    backgroundColor: '#50C878',
    marginRight: 0,
  },
  locationActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});