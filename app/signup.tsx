import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { UserPlus, Mail, Lock, User, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

export default function SignUpScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DO MODAL ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'success' as 'success' | 'error',
    title: '',
    message: ''
  });

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    // Se foi sucesso, redireciona para login ao fechar o modal
    if (modalConfig.type === 'success') {
      router.replace('/login');
    }
  };
  // ------------------------

  // Estados de erro para validação
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Função para validar senha
  const validatePassword = (pwd: string): string => {
    if (pwd.length < 8) {
      return 'A senha deve ter no mínimo 8 caracteres';
    }
    if (!/[a-zA-Z]/.test(pwd)) {
      return 'A senha deve conter pelo menos 1 letra';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'A senha deve conter pelo menos 1 número';
    }
    return '';
  };

  // Validar campos em tempo real
  const validateField = (field: string, value: string, currentPassword?: string) => {
    const newErrors = { ...errors };
    const pwdToCompare = currentPassword !== undefined ? currentPassword : password;
    
    switch (field) {
      case 'fullName':
        newErrors.fullName = value.trim() ? '' : 'Nome completo é obrigatório';
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        newErrors.email = emailRegex.test(value.trim()) ? '' : 'Email inválido';
        break;
      case 'password':
        newErrors.password = validatePassword(value);
        if (confirmPassword) {
          newErrors.confirmPassword = confirmPassword === value ? '' : 'As senhas não coincidem';
        }
        break;
      case 'confirmPassword':
        newErrors.confirmPassword = value === pwdToCompare ? '' : 'As senhas não coincidem';
        break;
    }
    
    setErrors(newErrors);
  };

  // Verificar se o formulário é válido
  const isFormValid = (): boolean => {
    return (
      fullName.trim() !== '' &&
      email.trim() !== '' &&
      password !== '' &&
      confirmPassword !== '' &&
      errors.fullName === '' &&
      errors.email === '' &&
      errors.password === '' &&
      errors.confirmPassword === '' &&
      password === confirmPassword
    );
  };

  const handleSignUp = async () => {
    validateField('fullName', fullName);
    validateField('email', email);
    validateField('password', password);
    validateField('confirmPassword', confirmPassword);

    if (!isFormValid()) {
      showModal('error', 'Formulário Inválido', 'Por favor, corrija os erros indicados.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        showModal('error', 'Erro ao Criar Conta', error.message);
      } else {
        showModal(
          'success', 
          'Conta Criada!', 
          'Verifique seu email para confirmar o cadastro antes de fazer login.'
        );
      }
    } catch (error: any) {
      showModal('error', 'Erro Inesperado', error.message || 'Ocorreu um erro ao tentar criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="flex-1 justify-center px-6 py-12">
        {/* Header */}
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

        {/* Form */}
        <View>
          {/* Full Name Input */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <User size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base"
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

          {/* Email Input */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Mail size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base"
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

          {/* Password Input */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  validateField('password', text);
                  if (confirmPassword) validateField('confirmPassword', confirmPassword, text);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>
            {errors.password ? (
              <Text className="text-red-500 text-sm mt-1 ml-1">{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirm Password Input */}
          <View className="mb-6">
            <View className="flex-row items-center bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
              <Lock size={20} className="text-gray-500 dark:text-zinc-500 mr-3" />
              <TextInput
                className="flex-1 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Confirmar Senha"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  validateField('confirmPassword', text, password);
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
            </View>
            {errors.confirmPassword ? (
              <Text className="text-red-500 text-sm mt-1 ml-1">{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Sign Up Button */}
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

          {/* Link para Login */}
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

      {/* --- MODAL DE FEEDBACK --- */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
            
            <View className="items-center mb-4">
              <View className={`w-14 h-14 rounded-full items-center justify-center mb-4 ${
                modalConfig.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                {modalConfig.type === 'success' ? (
                  <CheckCircle size={32} color={colorScheme === 'dark' ? '#4ade80' : '#16a34a'} />
                ) : (
                  <AlertTriangle size={32} color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} />
                )}
              </View>

              <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 text-center mb-2">
                {modalConfig.title}
              </Text>
              
              <Text className="text-gray-500 dark:text-zinc-400 text-center text-base px-2">
                {modalConfig.message}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={handleCloseModal}
              className={`py-3 rounded-xl w-full ${
                modalConfig.type === 'success' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              <Text className="text-white font-bold text-center text-lg">
                {modalConfig.type === 'success' ? 'Ir para Login' : 'Entendi'}
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      
    </ScrollView>
  );
}