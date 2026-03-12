import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FeedbackModalProps } from '@/types';

export function useLogin() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [modalConfig, setModalConfig] = useState<Omit<FeedbackModalProps, 'onClose'>>({
    visible: false,
    type: 'error',
    title: '',
    message: ''
  });

  const showErrorModal = (title: string, message: string) => {
    setModalConfig({ visible: true, type: 'error', title, message });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
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
        if (error.message === 'Email not confirmed') {
          showErrorModal(
            'Email não verificado', 
            'Por favor, clique no link de confirmação que enviamos para o seu email antes de entrar.'
          );
        } else if (error.message === 'Invalid login credentials') {
          showErrorModal(
            'Acesso Negado', 
            'Email ou senha incorretos. Verifique seus dados e tente novamente.'
          );
        } else {
          showErrorModal('Erro ao entrar', error.message);
        }
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      showErrorModal('Erro Inesperado', error.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}