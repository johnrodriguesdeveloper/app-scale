import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, UserPlus, Mail, Lock, Calendar, Eye, EyeOff } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useLogin } from '@/features/auth/useLogin';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function LoginScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    showPassword,
    setShowPassword,
    modalConfig,
    closeModal,
    handleSignIn
  } = useLogin();

  const openPortfolio = () => {
    Linking.openURL('https://johnrodrigues.xyz');
  };

  return (
    <View className="flex-1 bg-blue-50 dark:bg-zinc-950">
      <View className="flex-1 justify-center px-6">
        
        <View className="items-center mb-12">
          <View className="bg-blue-600 rounded-full p-4 mb-4 shadow-lg shadow-blue-900/20">
            <Calendar size={32} color="white" />
          </View>
          
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Escala Verbo <br />Zona Norte
          </Text> 
        
          <Text className="text-gray-600 dark:text-zinc-400 text-center">
            Gerencie suas escalas de forma simples
          </Text>
        </View>

        <View>
          <View className="mb-4">
            <View className="flex-row items-center bg-blue-100 dark:bg-zinc-900 rounded-lg border border-blue-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Mail size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base bg-transparent outline-none"
                style={{ backgroundColor: 'transparent' }}
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

          <View className="mb-6">
            <View className="flex-row items-center bg-blue-100 dark:bg-zinc-900 rounded-lg border border-blue-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base bg-transparent outline-none"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Senha"
                placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                className="p-1 ml-2"
              >
                {showPassword ? (
                  <EyeOff size={20} className="text-gray-500 dark:text-zinc-400" />
                ) : (
                  <Eye size={20} className="text-gray-500 dark:text-zinc-400" />
                )}
              </TouchableOpacity>
            </View>
          </View>

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

      <FeedbackModal 
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={closeModal}
      />
    </View>
  );
}