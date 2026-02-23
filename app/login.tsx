import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Linking, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, Mail, Lock, AlertTriangle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function LoginScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState({ title: '', message: '' });

  const showErrorModal = (title: string, message: string) => {
    setModalMessage({ title, message });
    setModalVisible(true);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      showErrorModal('Atenção', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        // Traduzindo os erros mais comuns do Supabase para o usuário
        if (error.message === 'Invalid login credentials') {
          showErrorModal('Acesso Negado', 'Email ou senha incorretos. Tente novamente.');
        } else if (error.message === 'Email not confirmed') {
          showErrorModal('Atenção', 'Por favor, confirme seu email clicando no link que enviamos para você antes de fazer login.');
        } else {
          showErrorModal('Erro ao entrar', error.message);
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      showErrorModal('Erro Inesperado', error.message || 'Ocorreu um erro inesperado. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const openPortfolio = () => {
    Linking.openURL('https://johnrodrigues.xyz');
  };

  return (
    <View className="flex-1 bg-blue-50 dark:bg-zinc-950">
      {/* Conteúdo Centralizado */}
      <View className="flex-1 justify-center px-6">
        
        <View className="items-center mb-12">
          <View className="bg-blue-600 rounded-full p-4 mb-4 shadow-lg shadow-blue-900/20">
            <LogIn size={32} color="white" />
          </View>
          
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Scale Verb
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
                placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
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
                placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
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

      {/* Footer / Rodapé */}
      <View className="pb-8 items-center justify-end px-6">
        <Text className="text-gray-400 dark:text-zinc-600 text-xs mb-1">
          Versão 1.0.0
        </Text>
        <TouchableOpacity onPress={openPortfolio}>
          <Text className="text-gray-500 dark:text-zinc-500 text-xs">
            Developed by <Text className="text-blue-600 dark:text-zinc-400 font-bold">John Rodrigues</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- MODAL DE ERRO --- */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
            
            <View className="items-center mb-6">
              <View className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-4">
                <AlertTriangle size={32} color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} />
              </View>

              <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 text-center mb-2">
                {modalMessage.title}
              </Text>
              
              <Text className="text-gray-500 dark:text-zinc-400 text-center text-base px-2">
                {modalMessage.message}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => setModalVisible(false)}
              className="bg-red-600 py-3 rounded-xl w-full"
            >
              <Text className="text-white font-bold text-center text-lg">
                Tentar Novamente
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}