import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, CheckCircle, Eye, EyeOff } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useUpdatePassword } from '@/features/auth/useUpdatePassword';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    modalConfig,
    handleUpdate,
    handleCloseModal
  } = useUpdatePassword();

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="flex-1 justify-center px-6 py-12 mt-10">
        <View className="items-center mb-8">
          <View className="bg-blue-600 rounded-full p-4 mb-4 shadow-lg shadow-blue-900/20">
            <Lock size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Nova Senha
          </Text>
          <Text className="text-gray-600 dark:text-zinc-400 text-center">
            Digite sua nova senha abaixo
          </Text>
        </View>

        <View>
          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Nova Senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1 ml-2">
                {showPassword ? <EyeOff size={20} className="text-gray-500 dark:text-zinc-400" /> : <Eye size={20} className="text-gray-500 dark:text-zinc-400" />}
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-6">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Confirmar Nova Senha"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1 ml-2">
                {showConfirmPassword ? <EyeOff size={20} className="text-gray-500 dark:text-zinc-400" /> : <Eye size={20} className="text-gray-500 dark:text-zinc-400" />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleUpdate}
            disabled={loading || !password || !confirmPassword}
            className="bg-blue-600 rounded-lg py-4 px-6 shadow-lg mb-4 active:bg-blue-700"
            style={{ opacity: loading || !password || !confirmPassword ? 0.5 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center justify-center">
                <CheckCircle size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-base">
                  Salvar Nova Senha
                </Text>
              </View>
            )}
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