import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FeedbackModalProps } from '@/types';

export function useForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalConfig, setModalConfig] = useState<Omit<FeedbackModalProps, 'onClose'>>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
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

  const handleResetPassword = async () => {
    if (!email.trim()) {
      showModal('error', 'Atenção', 'Por favor, digite seu email.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'http://localhost:8081/update-password',
      });

      if (error) throw error;

      showModal(
        'success', 
        'Email Enviado!', 
        'Verifique sua caixa de entrada (e o spam) para redefinir sua senha.'
      );
    } catch (error: any) {
      showModal('error', 'Erro', error.message || 'Não foi possível enviar o email.');
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    loading,
    modalConfig,
    handleResetPassword,
    handleCloseModal
  };
}