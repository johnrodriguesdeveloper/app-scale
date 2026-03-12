import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { UserPlus, Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useSignup } from '@/features/auth/useSignup';
import { FeedbackModal } from '@/components/FeedbackModal';

export default function SignUpScreen() {
  const router = useRouter();
  
  const {
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    loading,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    errors,
    modalConfig,
    validateField,
    isFormValid,
    handleSignUp,
    handleCloseModal
  } = useSignup();

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="flex-1 justify-center px-6 py-12">
        <View className="items-center mb-8">
          <View className="bg-blue-600 rounded-full p-4 mb-4 shadow-lg shadow-blue-900/20">
            <UserPlus size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            Criar Conta
          </Text>
          <Text className="text-gray-600 dark:text-zinc-400 text-center">
            Preencha os dados para começar
          </Text>
        </View>

        <View>
          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <User size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Nome Completo"
                placeholderTextColor="#9ca3af"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  validateField('fullName', text);
                }}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
            {errors.fullName ? (
              <Text className="text-red-500 text-sm mt-1 ml-1">{errors.fullName}</Text>
            ) : null}
          </View>

          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Mail size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  validateField('email', text);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            </View>
            {errors.email ? (
              <Text className="text-red-500 text-sm mt-1 ml-1">{errors.email}</Text>
            ) : null}
          </View>

          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  validateField('password', text);
                  if (confirmPassword) validateField('confirmPassword', confirmPassword, text);
                }}
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
            {errors.password ? (
              <Text className="text-red-500 text-sm mt-1 ml-1">{errors.password}</Text>
            ) : null}
          </View>

          <View className="mb-6">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base outline-none bg-transparent"
                style={{ backgroundColor: 'transparent' }}
                placeholder="Confirmar Senha"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  validateField('confirmPassword', text, password);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="p-1 ml-2"
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} className="text-gray-500 dark:text-zinc-400" />
                ) : (
                  <Eye size={20} className="text-gray-500 dark:text-zinc-400" />
                )}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text className="text-red-500 text-sm mt-1 ml-1">{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleSignUp}
            disabled={loading || !isFormValid()}
            className="bg-blue-600 rounded-lg py-4 px-6 shadow-lg mb-4 active:bg-blue-700"
            style={{ opacity: loading || !isFormValid() ? 0.5 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center justify-center">
                <UserPlus size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-base">
                  Criar Conta
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/login')}
            disabled={loading}
            className="flex-row items-center justify-center py-2"
          >
            <ArrowLeft size={16} className="text-blue-600 dark:text-blue-400 mr-2" />
            <Text className="text-blue-600 dark:text-blue-400 font-medium text-base">
              Já tenho conta? Entrar
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