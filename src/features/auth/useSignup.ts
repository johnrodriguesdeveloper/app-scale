import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { SignUpErrors } from '@/types';

export function useSignup() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'success' as 'success' | 'error',
    title: '',
    message: ''
  });

  const [errors, setErrors] = useState<SignUpErrors>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message });
  };

  const handleCloseModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
    if (modalConfig.type === 'success') {
      router.replace('/login');
    }
  };

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

  const validateField = (field: keyof SignUpErrors, value: string, currentPassword?: string) => {
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

  return {
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
  };
}