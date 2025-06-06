import { Redirect } from 'expo-router';
import { useAuth } from './context/auth';

export default function Index() {
  const { user } = useAuth();
  
  // Redirect to the appropriate screen based on auth state
  return <Redirect href={user ? "/(app)/home" : "/(auth)/login"} />;
}