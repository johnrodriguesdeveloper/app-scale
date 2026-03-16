import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useForgotPassword } from '@/features/auth/useForgotPassword';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const {
    email,
    setEmail,
    loading,
    modalConfig,
    handleResetPassword,
    handleCloseModal
  } = useForgotPassword();

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="flex-1 justify-center px-6 py-12">
        <View className="items-center mb-8">
          <View className="bg-blue-600 rounded-full p-4 mb-4 shadow-lg shadow-blue-900/20">
            <KeyRound size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Recuperar Senha
          </Text>
          <Text className="text-gray-600 dark:text-zinc-400 text-center">
            Digite seu email para receber o link de redefinição
          </Text>
        </View>

        <View>
          <View className="mb-6">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Mail size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Seu email cadastrado"
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

          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={loading || !email.trim()}
            className="bg-blue-600 rounded-lg py-4 px-6 shadow-lg mb-4 active:bg-blue-700"
            style={{ opacity: loading || !email.trim() ? 0.5 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base text-center">
                Enviar Link
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/login')}
            disabled={loading}
            className="flex-row items-center justify-center py-4"
          >
            <ArrowLeft size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
            <Text className="text-blue-600 dark:text-blue-400 font-medium text-base">
              Voltar para o Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FeedbackModal 
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={handleCloseModal}
      />
    </ScrollView>
  );
}