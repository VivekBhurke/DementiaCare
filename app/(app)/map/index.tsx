import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Modal, Alert, Platform, ScrollView } from 'react-native';
import { useAuth } from '../../context/auth';
import { Navigation, MapPin, User, Plus, X, Flag, MapPinOff, CornerDownRight, Volume2, VolumeX, Compass, AlertTriangle } from 'lucide-react-native';
import { WalkingRoute, RouteDirection } from '../../types/auth';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { getDistance, isPointWithinRadius } from 'geolib';

// Mock MapView component for web
const MockMapView = ({ children, style, initialRegion, onPress }: any) => (
  <View style={[style, { backgroundColor: '#e0e0e0' }]}>
    <Text style={{ textAlign: 'center', marginTop: 20 }}>
      Map View (Not available on web)
    </Text>
    <TouchableOpacity 
      style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 20, borderRadius: 8 }}
      onPress={() => onPress?.({ nativeEvent: { coordinate: { latitude: 16.8457, longitude: 74.6015 } } })}
    >
      <Text style={{ textAlign: 'center' }}>Tap to simulate map press</Text>
    </TouchableOpacity>
    {children}
  </View>
);

// Mock Marker component for web
const MockMarker = ({ coordinate, title, children, draggable, onDragEnd }: any) => (
  <View style={{ display: 'none' }}>{children}</View>
);

// Mock Polyline component for web
const MockPolyline = ({ coordinates, strokeColor, strokeWidth }: any) => (
  <View style={{ display: 'none' }} />
);

// Mock Circle component for web
const MockCircle = ({ center, radius, fillColor, strokeColor }: any) => (
  <View style={{ display: 'none' }} />
);

// Use actual components or mocks based on platform
const MapViewComponent = Platform.OS === 'web' ? MockMapView : require('react-native-maps').default;
const MarkerComponent = Platform.OS === 'web' ? MockMarker : require('react-native-maps').Marker;
const PolylineComponent = Platform.OS === 'web' ? MockPolyline : require('react-native-maps').Polyline;
const CircleComponent = Platform.OS === 'web' ? MockCircle : require('react-native-maps').Circle;

// Import MapViewDirections conditionally
let MapViewDirections: any = null;
if (Platform.OS !== 'web') {
  MapViewDirections = require('react-native-maps-directions').default;
}

// Mock directions for demo purposes
const mockDirections: RouteDirection[] = [
  { instruction: "Start walking north on Main Street", distance: 200, maneuver: "start", index: 0 },
  { instruction: "Turn right onto Oak Avenue", distance: 150, maneuver: "turn-right", index: 1 },
  { instruction: "Continue straight for 300 meters", distance: 300, maneuver: "straight", index: 2 },
  { instruction: "Turn left onto Pine Road", distance: 250, maneuver: "turn-left", index: 3 },
  { instruction: "You have arrived at your destination", distance: 0, maneuver: "arrive", index: 4 }
];

// Google Maps API Key - Replace with your actual key in a real app
// For demo purposes, we'll use a placeholder
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

export default function MapScreen() {
  const { user, getWalkingRoutes, addWalkingRoute, getPatientDetails } = useAuth();
  const isPatient = user?.role === 'patient';
  const [selectedRoute, setSelectedRoute] = useState<WalkingRoute | null>(null);
  const [routes, setRoutes] = useState<WalkingRoute[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [connectedPatients, setConnectedPatients] = useState<any[]>([]);
  
  // Location tracking state
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentDirectionIndex, setCurrentDirectionIndex] = useState(0);
  const [distanceToNextTurn, setDistanceToNextTurn] = useState<number | null>(null);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [offRoute, setOffRoute] = useState(false);
  
  // Route creation state
  const [routeName, setRouteName] = useState('');
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState<{latitude: number, longitude: number}[]>([]);
  const [startPoint, setStartPoint] = useState<{latitude: number, longitude: number} | null>(null);
  const [endPoint, setEndPoint] = useState<{latitude: number, longitude: number} | null>(null);
  const [routeCreationStep, setRouteCreationStep] = useState<'start' | 'end' | 'complete'>('start');
  const [routeDirections, setRouteDirections] = useState<RouteDirection[]>([]);

  // Refs
  const mapRef = useRef<any>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const directionsUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  // Safe zone radius (in meters)
  const safeZoneRadius = 1000;

  useEffect(() => {
    // Get connected patients if caretaker
    if (user?.role === 'caretaker' && user.connectedPatients) {
      const patients = user.connectedPatients.map(id => getPatientDetails(id)).filter(Boolean);
      setConnectedPatients(patients);
      if (patients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(patients[0].id);
      }
    }

    // Get routes for the appropriate user
    const patientId = isPatient ? user?.id : selectedPatientId;
    if (patientId) {
      const patientRoutes = getWalkingRoutes(patientId);
      setRoutes(patientRoutes);
      if (patientRoutes.length > 0 && !selectedRoute) {
        setSelectedRoute(patientRoutes[0]);
      }
    }

    // Request location permissions
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return <View />;
      }
      
      setLocationPermission(true);
      
      // Get initial location
      let initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest
      });
      setLocation(initialLocation);
      
      // If patient, start tracking location
      if (isPatient) {
        startLocationTracking();
      }
    })();

    // Cleanup function
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (directionsUpdateTimer.current) {
        clearInterval(directionsUpdateTimer.current);
      }
      if (Speech.isSpeakingAsync()) {
        Speech.stop();
      }
    };
  }, [user, selectedPatientId]);

  // Start location tracking
  const startLocationTracking = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Required', 'Location permission is needed to track your position.');
      return <View />;
    }
    
    // Stop any existing subscription
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }
    
    // Start new subscription
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 10, // Update every 10 meters
        timeInterval: 5000 // Or every 5 seconds
      },
      (newLocation) => {
        setLocation(newLocation);
        
        // Check if user is within safe zone
        if (isPatient && location) {
          const homeLocation = {
            latitude: 37.78825,
            longitude: -122.4324,
          };
          
          const isInSafeZone = isPointWithinRadius(
            { latitude: newLocation.coords.latitude, longitude: newLocation.coords.longitude },
            homeLocation,
            safeZoneRadius
          );
          
          // If outside safe zone, we could trigger an alert to caretaker
          // This would be implemented with a real backend
          if (!isInSafeZone) {
            console.log("Patient outside safe zone!");
            // In a real app: sendAlertToCaretaker();
          }
        }
        
        // Update navigation if active
        if (isNavigating && selectedRoute) {
          updateNavigation(newLocation);
        }
      }
    );
    
    setIsTracking(true);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  // Start navigation along a route
  const startNavigation = () => {
    if (!selectedRoute) {
      Alert.alert('Error', 'Please select a route first');
      return <View />;
    }
    
    if (!isTracking) {
      startLocationTracking();
    }
    
    // Use the route's directions if available, otherwise use mock directions
    const directions = selectedRoute.directions || mockDirections;
    setRouteDirections(directions);
    setCurrentDirectionIndex(0);
    setIsNavigating(true);
    setShowDirectionsPanel(true);
    
    // Speak first direction if voice guidance is enabled
    if (voiceGuidanceEnabled) {
      Speech.speak(directions[0].instruction, {
        language: 'en',
        pitch: 1.0,
        rate: 0.9
      });
    }
    
    // Start periodic updates for navigation
    if (directionsUpdateTimer.current) {
      clearInterval(directionsUpdateTimer.current);
    }
    
    directionsUpdateTimer.current = setInterval(() => {
      if (location && selectedRoute) {
        updateNavigation(location);
      }
    }, 5000); // Update every 5 seconds
  };

  // Stop navigation
  const stopNavigation = () => {
    setIsNavigating(false);
    setShowDirectionsPanel(false);
    
    if (directionsUpdateTimer.current) {
      clearInterval(directionsUpdateTimer.current);
      directionsUpdateTimer.current = null;
    }
    
    if (Speech.isSpeakingAsync()) {
      Speech.stop();
    }
  };

  // Update navigation based on current location
  const updateNavigation = (currentLocation: Location.LocationObject) => {
    if (!selectedRoute || !currentLocation || routeDirections.length === 0) return <View />;
    
    const currentCoords = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude
    };
    
    // Check if we're off route
    const routePoints = selectedRoute.coordinates;
    let minDistanceToRoute = Number.MAX_VALUE;
    
    for (const point of routePoints) {
      const distance = getDistance(
        currentCoords,
        point
      );
      
      if (distance < minDistanceToRoute) {
        minDistanceToRoute = distance;
      }
    }
    
    // If more than 50 meters from route, consider off route
    const isOffRoute = minDistanceToRoute > 50;
    setOffRoute(isOffRoute);
    
    if (isOffRoute) {
      if (voiceGuidanceEnabled) {
        Speech.speak("You appear to be off route. Please return to the designated path.", {
          language: 'en',
          pitch: 1.0,
          rate: 0.9
        });
      }
      return <View />;
    }
    
    // Check distance to next turn point
    if (currentDirectionIndex < routeDirections.length - 1) {
      const nextTurnIndex = routeDirections[currentDirectionIndex + 1].index;
      if (nextTurnIndex < routePoints.length) {
        const nextTurnPoint = routePoints[nextTurnIndex];
        
        const distanceToTurn = getDistance(
          currentCoords,
          nextTurnPoint
        );
        
        setDistanceToNextTurn(distanceToTurn);
        
        // If within 20 meters of the turn, advance to next direction
        if (distanceToTurn < 20) {
          const newIndex = currentDirectionIndex + 1;
          setCurrentDirectionIndex(newIndex);
          
          // Speak the new direction if voice guidance is enabled
          if (voiceGuidanceEnabled && newIndex < routeDirections.length) {
            Speech.speak(routeDirections[newIndex].instruction, {
              language: 'en',
              pitch: 1.0,
              rate: 0.9
            });
          }
        } 
        // If approaching turn (within 100m), give advance notice
        else if (distanceToTurn < 100 && distanceToTurn > 50) {
          if (voiceGuidanceEnabled) {
            const nextDirection = routeDirections[currentDirectionIndex + 1];
            Speech.speak(`In ${Math.round(distanceToTurn)} meters, ${nextDirection.instruction}`, {
              language: 'en',
              pitch: 1.0,
              rate: 0.9
            });
          }
        }
      }
    }
    
    // Check if we've reached the destination
    if (currentDirectionIndex === routeDirections.length - 1) {
      const finalPoint = routePoints[routePoints.length - 1];
      const distanceToEnd = getDistance(
        currentCoords,
        finalPoint
      );
      
      if (distanceToEnd < 20) {
        if (voiceGuidanceEnabled) {
          Speech.speak("You have reached your destination.", {
            language: 'en',
            pitch: 1.0,
            rate: 0.9
          });
        }
        
        // End navigation
        stopNavigation();
        Alert.alert("Destination Reached", "Congratulations! You have completed your walk.");
      }
    }
  };

  // Toggle voice guidance
  const toggleVoiceGuidance = () => {
    setVoiceGuidanceEnabled(!voiceGuidanceEnabled);
    
    if (voiceGuidanceEnabled) {
      // If turning off, stop any ongoing speech
      if (Speech.isSpeakingAsync()) {
        Speech.stop();
      }
    } else {
      // If turning on, announce current direction
      if (isNavigating && currentDirectionIndex < routeDirections.length) {
        Speech.speak(routeDirections[currentDirectionIndex].instruction, {
          language: 'en',
          pitch: 1.0,
          rate: 0.9
        });
      }
    }
  };

  const handleMapPress = (event: any) => {
    if (!isCreatingRoute) return <View />;
    
    const { coordinate } = event.nativeEvent;
    
    if (routeCreationStep === 'start') {
      setStartPoint(coordinate);
      setRouteCreationStep('end');
    } else if (routeCreationStep === 'end') {
      setEndPoint(coordinate);
      
      // Generate route points between start and end
      if (startPoint) {
        const newRoutePoints = generateRoutePoints(startPoint, coordinate);
        setRoutePoints(newRoutePoints);
        
        // Generate mock directions for the route
        const newDirections = generateMockDirections(newRoutePoints);
        setRouteDirections(newDirections);
      }
      
      setRouteCreationStep('complete');
      setModalVisible(true);
    }
  };

  // Generate route points between start and end (simplified for demo)
  const generateRoutePoints = (start: {latitude: number, longitude: number}, end: {latitude: number, longitude: number}) => {
    // For a real app, you would use a routing API to get actual walking directions
    // This is a simplified version that creates a few points between start and end
    const points = [start];
    
    // Add some intermediate points (simplified)
    const steps = 5; // Number of intermediate points
    for (let i = 1; i <= steps; i++) {
      const fraction = i / (steps + 1);
      points.push({
        latitude: start.latitude + (end.latitude - start.latitude) * fraction,
        longitude: start.longitude + (end.longitude - start.longitude) * fraction
      });
    }
    
    points.push(end);
    return points;
  };

  // Generate mock directions for a route
  const generateMockDirections = (points: {latitude: number, longitude: number}[]): RouteDirection[] => {
    // In a real app, these would come from a directions API
    const directions: RouteDirection[] = [];
    
    // Start direction
    directions.push({
      instruction: "Start walking north",
      distance: 200,
      maneuver: "start",
      index: 0
    });
    
    // Intermediate directions
    for (let i = 1; i < points.length - 1; i++) {
      const turn = i % 2 === 0 ? "right" : "left";
      directions.push({
        instruction: `Turn ${turn} at the intersection`,
        distance: 150,
        maneuver: `turn-${turn}`,
        index: i
      });
    }
    
    // Final direction
    directions.push({
      instruction: "You have arrived at your destination",
      distance: 0,
      maneuver: "arrive",
      index: points.length - 1
    });
    
    return directions;
  };

  const handleAddRoute = async () => {
    if (!routeName.trim()) {
      Alert.alert('Error', 'Please enter a route name');
      return <View />;
    }

    try {
      const patientId = isPatient ? user?.id : selectedPatientId;
      if (!patientId) {
        Alert.alert('Error', 'No patient selected');
        return <View />;
      }

      // Create a route with the selected points and directions
      const newRoute: Omit<WalkingRoute, 'id'> = {
        name: routeName,
        coordinates: routePoints,
        patientId,
        directions: routeDirections
      };

      await addWalkingRoute(newRoute);

      // Refresh routes
      const updatedRoutes = getWalkingRoutes(patientId);
      setRoutes(updatedRoutes);
      
      // Reset form and creation state
      resetRouteCreation();
    } catch (error) {
      Alert.alert('Error', 'Failed to add route');
    }
  };

  const resetRouteCreation = () => {
    setRouteName('');
    setIsCreatingRoute(false);
    setRoutePoints([]);
    setStartPoint(null);
    setEndPoint(null);
    setRouteCreationStep('start');
    setRouteDirections([]);
    setModalVisible(false);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patientRoutes = getWalkingRoutes(patientId);
    setRoutes(patientRoutes);
    if (patientRoutes.length > 0) {
      setSelectedRoute(patientRoutes[0]);
    } else {
      setSelectedRoute(null);
    }
  };

  const startRouteCreation = () => {
    setIsCreatingRoute(true);
    setRouteCreationStep('start');
    Alert.alert(
      'Create Route',
      'Tap on the map to set the starting point of the route',
      [{ text: 'OK' }]
    );
  };

  const cancelRouteCreation = () => {
    resetRouteCreation();
  };

  // Format distance for display
  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  // Center map on current location
  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  // Get icon for direction maneuver
  const getManeuverIcon = (maneuver: string) => {
    switch (maneuver) {
      case 'turn-right':
        return <CornerDownRight size={16} color="#4A90E2" style={{ transform: [{ rotate: '270deg' }] }} />;
      case 'turn-left':
        return <CornerDownRight size={16} color="#4A90E2" style={{ transform: [{ rotate: '180deg' }] }} />;
      case 'straight':
        return <CornerDownRight size={16} color="#4A90E2" style={{ transform: [{ rotate: '315deg' }] }} />;
      default:
        return <Navigation size={16} color="#4A90E2" />;
    }
  };

  const PatientMap = () => (
    <View style={styles.container}>
      <MapViewComponent
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 37.78825,
          longitude: location?.coords.longitude || -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* User's current location */}
        {location && (
          <MarkerComponent
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="You are here"
          >
            <User color="#4A90E2" size={24} />
          </MarkerComponent>
        )}

        {/* Safe zone circle */}
        <CircleComponent
          center={{
            latitude: 37.78825,
            longitude: -122.4324,
          }}
          radius={safeZoneRadius}
          fillColor="rgba(74, 144, 226, 0.1)"
          strokeColor="rgba(74, 144, 226, 0.5)"
          strokeWidth={1}
        />

        {/* Selected route polyline */}
        {selectedRoute && (
          <PolylineComponent
            coordinates={selectedRoute.coordinates}
            strokeColor="#4A90E2"
            strokeWidth={4}
          />
        )}

        {/* Route directions using MapViewDirections (if not on web) */}
        {Platform.OS !== 'web' && selectedRoute && isNavigating && MapViewDirections && (
          <MapViewDirections
            origin={selectedRoute.coordinates[0]}
            destination={selectedRoute.coordinates[selectedRoute.coordinates.length - 1]}
            waypoints={selectedRoute.coordinates.slice(1, -1)}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor="#4A90E2"
            optimizeWaypoints={true}
            onStart={(params) => {
              console.log(`Started routing between "${params.origin}" and "${params.destination}"`);
            }}
            onReady={result => {
              console.log(`Distance: ${result.distance} km`);
              console.log(`Duration: ${result.duration} min.`);
            }}
            onError={(errorMessage) => {
              console.log('MapViewDirections error:', errorMessage);
            }}
          />
        )}
      </MapViewComponent>

      {/* Location tracking controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.mapControlButton}
          onPress={centerOnLocation}
        >
          <Compass color="#333" size={24} />
        </TouchableOpacity>
      </View>

      {/* Voice guidance toggle */}
      <TouchableOpacity 
        style={styles.voiceToggle}
        onPress={toggleVoiceGuidance}
      >
        {voiceGuidanceEnabled ? (
          <Volume2 color="#4A90E2" size={24} />
        ) : (
          <VolumeX color="#999" size={24} />
        )}
      </TouchableOpacity>

      {/* Off route warning */}
      {offRoute && (
        <View style={styles.offRouteWarning}>
          <AlertTriangle color="#fff" size={20} />
          <Text style={styles.offRouteText}>You are off route</Text>
        </View>
      )}

      {/* Directions panel */}
      {showDirectionsPanel && (
        <View style={styles.directionsPanel}>
          <View style={styles.directionsPanelHeader}>
            <Text style={styles.directionsPanelTitle}>Turn-by-Turn Directions</Text>
            <TouchableOpacity onPress={() => setShowDirectionsPanel(false)}>
              <X color="#666" size={20} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.currentDirectionCard}>
            {currentDirectionIndex < routeDirections.length && (
              <>
                <View style={styles.currentDirectionHeader}>
                  {getManeuverIcon(routeDirections[currentDirectionIndex].maneuver)}
                  <Text style={styles.currentDirectionText}>
                    {routeDirections[currentDirectionIndex].instruction}
                  </Text>
                </View>
                
                {distanceToNextTurn !== null && currentDirectionIndex < routeDirections.length - 1 && (
                  <Text style={styles.distanceText}>
                    {formatDistance(distanceToNextTurn)} to next turn
                  </Text>
                )}
              </>
            )}
          </View>
          
          <ScrollView style={styles.upcomingDirections}>
            {routeDirections.slice(currentDirectionIndex + 1).map((direction, index) => (
              <View key={index} style={styles.upcomingDirectionItem}>
                {getManeuverIcon(direction.maneuver)}
                <Text style={styles.upcomingDirectionText}>
                  {direction.instruction}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.routePanel}>
        <Text style={styles.panelTitle}>Available Routes</Text>
        {routes.length > 0 ? (
          <>
            {routes.map(route => (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeItem,
                  selectedRoute?.id === route.id && styles.routeItemActive
                ]}
                onPress={() => setSelectedRoute(route)}
              >
                <Navigation color={selectedRoute?.id === route.id ? "#fff" : "#4A90E2"} size={20} />
                <Text style={[
                  styles.routeName,
                  selectedRoute?.id === route.id && styles.routeNameActive
                ]}>
                  {route.name}
                </Text>
              </TouchableOpacity>
            ))}
            
            {selectedRoute && !isNavigating ? (
              <TouchableOpacity 
                style={styles.startNavigationButton}
                onPress={startNavigation}
              >
                <Text style={styles.startNavigationText}>Start Navigation</Text>
              </TouchableOpacity>
            ) : isNavigating ? (
              <TouchableOpacity 
                style={styles.stopNavigationButton}
                onPress={stopNavigation}
              >
                <Text style={styles.stopNavigationText}>Stop Navigation</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : (
          <Text style={styles.emptyText}>No routes available</Text>
        )}
      </View>
    </View>
  );

  const CaretakerMap = () => (
    <View style={styles.container}>
      <MapViewComponent
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 37.78825,
          longitude: location?.coords.longitude || -122.4324,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={handleMapPress}
      >
        {/* Patient's last known location */}
        <MarkerComponent
          coordinate={{
            latitude: 37.78825,
            longitude: -122.4324,
          }}
          title="Patient Location"
        >
          <User color="#4A90E2" size={24} />
        </MarkerComponent>

        {/* Safe zone circle */}
        <CircleComponent
          center={{
            latitude: 37.78825,
            longitude: -122.4324,
          }}
          radius={safeZoneRadius}
          fillColor="rgba(74, 144, 226, 0.1)"
          strokeColor="rgba(74, 144, 226, 0.5)"
          strokeWidth={1}
        />

        {/* Display existing routes */}
        {routes.map(route => (
          <PolylineComponent
            key={route.id}
            coordinates={route.coordinates}
            strokeColor={selectedRoute?.id === route.id ? "#4A90E2" : "#50C878"}
            strokeWidth={selectedRoute?.id === route.id ? 5 : 3}
          />
        ))}

        {/* Display route being created */}
        {startPoint && (
          <MarkerComponent
            coordinate={startPoint}
            title="Start Point"
            draggable
            onDragEnd={(e) => setStartPoint(e.nativeEvent.coordinate)}
          >
            <Flag color="#4A90E2" size={24} />
          </MarkerComponent>
        )}

        {endPoint && (
          <MarkerComponent
            coordinate={endPoint}
            title="End Point"
            draggable
            onDragEnd={(e) => setEndPoint(e.nativeEvent.coordinate)}
          >
            <MapPinOff color="#FF6B6B" size={24} />
          </MarkerComponent>
        )}

        {routePoints.length > 0 && (
          <PolylineComponent
            coordinates={routePoints}
            strokeColor="#FF6B6B"
            strokeWidth={4}
          />
        )}
      </MapViewComponent>

      <View style={styles.controlPanel}>
        <View style={styles.controlHeader}>
          <Text style={styles.panelTitle}>Route Management</Text>
          {!isCreatingRoute ? (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={startRouteCreation}
            >
              <Plus color="#fff" size={20} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={cancelRouteCreation}
            >
              <X color="#fff" size={20} />
            </TouchableOpacity>
          )}
        </View>

        {isCreatingRoute && (
          <View style={styles.creationStatus}>
            <Text style={styles.creationText}>
              {routeCreationStep === 'start' && 'Tap on the map to set the starting point'}
              {routeCreationStep === 'end' && 'Now tap to set the ending point'}
              {routeCreationStep === 'complete' && 'Route created! Add details to save.'}
            </Text>
          </View>
        )}

        {connectedPatients.length > 0 && !isCreatingRoute && (
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
        )}

        {!isCreatingRoute && (
          <>
            <Text style={styles.routesLabel}>Available Routes:</Text>
            {routes.length > 0 ? (
              routes.map(route => (
                <TouchableOpacity
                  key={route.id}
                  style={[
                    styles.routeItem,
                    selectedRoute?.id === route.id && styles.routeItemActive
                  ]}
                  onPress={() => setSelectedRoute(route)}
                >
                  <Navigation color={selectedRoute?.id === route.id ? "#fff" : "#4A90E2"} size={20} />
                  <Text style={[
                    styles.routeName,
                    selectedRoute?.id === route.id && styles.routeNameActive
                  ]}>
                    {route.name}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No routes available</Text>
            )}
          </>
        )}
      </View>
    </View>
  );

  return (
    isPatient ? <PatientMap /> : 
    
    <>
      <CaretakerMap />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Walking Route</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Route Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Morning Park Walk"
                value={routeName}
                onChangeText={setRouteName}
              />
            </View>
            
            <View style={styles.routePreview}>
              <Text style={styles.previewLabel}>Route Preview:</Text>
              <View style={styles.previewDetails}>
                <View style={styles.previewItem}>
                  <Flag color="#4A90E2" size={16} />
                  <Text style={styles.previewText}>Start: Selected</Text>
                </View>
                <View style={styles.previewItem}>
                  <MapPinOff color="#FF6B6B" size={16} />
                  <Text style={styles.previewText}>End: Selected</Text>
                </View>
                <View style={styles.previewItem}>
                  <Navigation color="#50C878" size={16} />
                  <Text style={styles.previewText}>Distance: ~0.5 miles</Text>
                </View>
              </View>
            </View>

            <View style={styles.directionsPreview}>
              <Text style={styles.previewLabel}>Turn-by-Turn Directions:</Text>
              <ScrollView style={styles.directionsPreviewList}>
                {routeDirections.map((direction, index) => (
                  <View key={index} style={styles.directionPreviewItem}>
                    {getManeuverIcon(direction.maneuver)}
                    <Text style={styles.directionPreviewText}>
                      {direction.instruction}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddRoute}
            >
              <Text style={styles.submitButtonText}>Save Route</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
    </>
  
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  routePanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlPanel: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeItemActive: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  routeName: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  routeNameActive: {
    color: '#fff',
  },
  statusContainer: {
    marginTop: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
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
  routesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
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
    width: '90%',
    maxHeight: '80%',
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
  routePreview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewDetails: {
    marginTop: 5,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  directionsPreview: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    maxHeight: 150,
  },
  directionsPreviewList: {
    maxHeight: 120,
  },
  directionPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  directionPreviewText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  creationStatus: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  creationText: {
    fontSize: 14,
    color: '#333',
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
    marginBottom: 10,
  },
  voiceToggle: {
    position: 'absolute',
    top: 20,
    left: 20,
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
  directionsPanel: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: '40%',
  },
  directionsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  directionsPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  currentDirectionCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  currentDirectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentDirectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    marginLeft: 24,
  },
  upcomingDirections: {
    maxHeight: 120,
  },
  upcomingDirectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  upcomingDirectionText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  startNavigationButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  startNavigationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stopNavigationButton: {
    backgroundColor: '#FF6B6B',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  stopNavigationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  offRouteWarning: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  offRouteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});