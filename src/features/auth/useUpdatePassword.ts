import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FeedbackModalProps } from '@/types';

export function useUpdatePassword() {
  const router = useRouter();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [modalConfig, setModalConfig] = useState<Omit<FeedbackModalProps, 'onClose'>>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    const checkSession = async () => {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showModal('error', 'Link Expirado', 'O link é inválido ou já foi utilizado. Solicite um novo.');
      }
    };

    setTimeout(checkSession, 500);
  }, []);

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message });
  };

  const handleCloseModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
    if (modalConfig.type === 'success' || modalConfig.title === 'Link Expirado') {
      router.replace('/login');
    }
  };

  const handleUpdate = async () => {
    if (password.length < 8) {
      showModal('error', 'Atenção', 'A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      showModal('error', 'Atenção', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      showModal('success', 'Senha Atualizada', 'Sua senha foi alterada com sucesso!');
    } catch (error: any) {
      showModal('error', 'Erro', error.message || 'Não foi possível atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}