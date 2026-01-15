import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Erro ao entrar', error.message);
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View className="flex-1 bg-blue-50">
      <View className="flex-1 justify-center px-6">
        
        <View className="items-center mb-12">
          <View className="bg-blue-600 rounded-full p-4 mb-4">
            <LogIn size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            App Escala
          </Text>
          <Text className="text-gray-600 text-center">
            Gerencie suas escalas de forma simples
          </Text>
        </View>

        {/* Form */}
        <View>
          {/* Email Input */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
              <Mail size={20} color="#6b7280" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-gray-900 text-base"
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
              <Lock size={20} color="#6b7280" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-gray-900 text-base"
                placeholder="Senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            className="bg-blue-600 rounded-lg py-4 px-6 shadow-lg mb-4"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center justify-center">
                <LogIn size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-base">
                  Entrar
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Link para Sign Up */}
          <TouchableOpacity
            onPress={() => router.push('/signup')}
            disabled={loading}
            className="bg-white border-2 border-blue-600 rounded-lg py-4 px-6 shadow-sm mb-4"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <View className="flex-row items-center justify-center">
              <UserPlus size={20} color="#2563eb" style={{ marginRight: 8 }} />
              <Text className="text-blue-600 font-semibold text-base">
                Criar Conta
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
