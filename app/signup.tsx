import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { UserPlus, Mail, Lock, User, ArrowLeft } from 'lucide-react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
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
        // Revalidar confirmPassword se já tiver valor
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
    // Validar todos os campos antes de enviar
    validateField('fullName', fullName);
    validateField('email', email);
    validateField('password', password);
    validateField('confirmPassword', confirmPassword);

    if (!isFormValid()) {
      Alert.alert('Erro', 'Por favor, corrija os erros no formulário');
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
        Alert.alert('Erro ao criar conta', error.message);
      } else {
        Alert.alert(
          'Conta criada!',
          'Verifique seu email para confirmar a conta antes de fazer login.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login'),
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-blue-50">
      <View className="flex-1 justify-center px-6 py-12">
        {/* Header */}
        <View className="items-center mb-8">
          <View className="bg-blue-600 rounded-full p-4 mb-4">
            <UserPlus size={32} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Criar Conta
          </Text>
          <Text className="text-gray-600 text-center">
            Preencha os dados para começar
          </Text>
        </View>

        {/* Form */}
        <View>
          {/* Full Name Input */}
          <View className="mb-4">
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
              <User size={20} color="#6b7280" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-gray-900 text-base"
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
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
              <Mail size={20} color="#6b7280" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-gray-900 text-base"
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
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
              <Lock size={20} color="#6b7280" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-gray-900 text-base"
                placeholder="Senha"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(text) => {
                  const newPassword = text;
                  setPassword(newPassword);
                  validateField('password', newPassword);
                  // Revalidar confirmPassword com o novo password
                  if (confirmPassword) {
                    validateField('confirmPassword', confirmPassword, newPassword);
                  }
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
            <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
              <Lock size={20} color="#6b7280" style={{ marginRight: 12 }} />
              <TextInput
                className="flex-1 text-gray-900 text-base"
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
            className="bg-blue-600 rounded-lg py-4 px-6 shadow-lg mb-4"
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
            className="flex-row items-center justify-center"
          >
            <ArrowLeft size={16} color="#2563eb" style={{ marginRight: 8 }} />
            <Text className="text-blue-600 font-medium text-base">
              Já tenho conta? Entrar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
