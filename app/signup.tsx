import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Email aur password likho.');
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert('Error', 'Password kam az kam 6 characters ka hona chahiye.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    setLoading(false);

    if (error) {
      Alert.alert('Signup Error', error.message);
      return;
    }

    Alert.alert(
      'Success',
      'Account create ho gaya. Ab login karo. Agar email confirmation ON hai to pehle email verify karo.'
    );

    router.replace('/login' as any);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Signup for WarrantyWallet</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={signup}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating...' : 'Signup'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/login' as any)}>
        <Text style={styles.link}>Already have account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
  },

  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2D5BE3',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },

  input: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDD',
  },

  button: {
    backgroundColor: '#2D5BE3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  link: {
    color: '#2D5BE3',
    textAlign: 'center',
    marginTop: 20,
    fontWeight: 'bold',
  },
});