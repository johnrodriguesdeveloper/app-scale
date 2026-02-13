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
    // Fundo ajustado para Zinc Dark
    <View className="flex-1 bg-blue-50 dark:bg-zinc-950">
      <View className="flex-1 justify-center px-6">
        
        <View className="items-center mb-12">
          {/* O círculo azul do ícone mantém destaque, adicionada sombra suave */}
          <View className="bg-blue-600 rounded-full p-4 mb-4 shadow-lg shadow-blue-900/20">
            <LogIn size={32} color="white" />
          </View>
          
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            App Escala
          </Text>
          <Text className="text-gray-600 dark:text-zinc-400 text-center">
            Gerencie suas escalas de forma simples
          </Text>
        </View>

        {/* Form */}
        <View>
          {/* Email Input */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Mail size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base"
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
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base"
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
            className="bg-blue-600 rounded-lg py-4 px-6 shadow-lg mb-4 active:bg-blue-700"
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
          {/* Botão secundário ajustado para ter fundo transparente/escuro no dark mode */}
          <TouchableOpacity
            onPress={() => router.push('/signup')}
            disabled={loading}
            className="bg-white dark:bg-zinc-900 border-2 border-blue-600 dark:border-blue-500 rounded-lg py-4 px-6 shadow-sm mb-4 active:bg-gray-50 dark:active:bg-zinc-800"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <View className="flex-row items-center justify-center">
              <UserPlus size={20} className="text-blue-600 dark:text-blue-500 mr-2" />
              <Text className="text-blue-600 dark:text-blue-500 font-semibold text-base">
                Criar Conta
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}