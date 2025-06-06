import { useEffect } from 'react';
import { Slot, useSegments, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from './context/auth';

// Navigation guard component
function NavigationGuard() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (user && inAuthGroup) {
      // Redirect to home if user is signed in and trying to access auth screens
      router.replace('/(app)/home');
    } else if (!user && inAppGroup) {
      // Redirect to login if user is not signed in and trying to access app screens
      router.replace('/(auth)/login');
    }
  }, [user, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGuard />
    </AuthProvider>
  );
}