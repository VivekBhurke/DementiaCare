import { Tabs } from 'expo-router';
import { Chrome as Home, Brain, Calendar, Map, User, MessageCircleMoreIcon } from 'lucide-react-native';
import { useColorScheme, Platform, View } from 'react-native';
import { useAuth } from '../context/auth';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  if (Platform.OS !== 'android') {
    return null;
  }

  // Define screens based on user role
  const screenOptions = {
    tabBarActiveTintColor: '#007AFF',
    tabBarInactiveTintColor: '#8E8E93',
    tabBarStyle: {
      backgroundColor: '#ffffff',
      borderTopColor: '#e5e5e5',
      height: 60,
      paddingBottom: 8,
      paddingTop: 8,
    },
    tabBarLabelStyle: {
      fontSize: 12,
      fontWeight: '500',
    },
    headerShown: false,
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <Home size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activities/index"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <Brain size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="schedule/index"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <Calendar size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat/index"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <MessageCircleMoreIcon size={size} color={color} />
            </View>
          ),
          // This is the key - hide from tab bar if not a patient
          href: isPatient ? '/chat' : null,
        }}
      />
      <Tabs.Screen
        name="map/index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <Map size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <View style={{ alignItems: 'center' }}>
              <User size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}