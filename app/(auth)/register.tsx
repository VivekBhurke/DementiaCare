import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth';
import { Lock, Mail, User } from 'lucide-react-native';
import { UserRole } from '../types/auth';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const { signUp, error, loading } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    await signUp(email, password, role, name);
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.inputContainer}>
          <User size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Mail size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              role === 'patient' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('patient')}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'patient' && styles.roleButtonTextActive,
              ]}
            >
              Patient
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              role === 'caretaker' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('caretaker')}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'caretaker' && styles.roleButtonTextActive,
              ]}
            >
              Caretaker
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.link}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 16,
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 16,
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  link: {
    color: '#007AFF',
    fontWeight: '600',
  },
});