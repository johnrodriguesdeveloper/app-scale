import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { FeedbackModalProps } from '@/types';

export function useCreateDepartment() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [priority, setPriority] = useState('');
  const [deadlineDay, setDeadlineDay] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMaster, setIsMaster] = useState(false);

  const [modalConfig, setModalConfig] = useState<Omit<FeedbackModalProps, 'onClose'>>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, org_role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setOrganizationId(profile.organization_id);
        setIsMaster(profile.org_role === 'master');
      }
    }
    loadUserData();
  }, []);

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ visible: true, type, title, message });
  };

  const handleCloseModal = () => {
    setModalConfig(prev => ({ ...prev, visible: false }));
    if (modalConfig.type === 'success') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/departments');
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return showModal('error', 'Campo Obrigatório', 'Por favor, preencha o nome do departamento.');
    
    const priorityNum = parseInt(priority);
    if (isNaN(priorityNum) || priorityNum < 1) return showModal('error', 'Prioridade Inválida', 'A prioridade deve ser um número (ex: 1, 2, 3).');

    const deadlineNum = parseInt(deadlineDay);
    if (isNaN(deadlineNum) || deadlineNum < 1 || deadlineNum > 31) return showModal('error', 'Data Inválida', 'O dia limite deve ser entre 1 e 31.');

    if (!organizationId) return showModal('error', 'Erro', 'Organização não encontrada.');
    if (!isMaster) return showModal('error', 'Permissão Negada', 'Apenas usuários Master podem criar departamentos.');

    setLoading(true);
    try {
      const { error } = await supabase.from('departments').insert({
        organization_id: organizationId,
        name: name.trim(),
        priority_order: priorityNum,
        availability_deadline_day: deadlineNum,
      });

      if (error) throw error;
      showModal('success', 'Sucesso!', 'Departamento criado com sucesso.');
    } catch (error: any) {
      showModal('error', 'Erro ao Criar', error.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return {
    name,
    setName,
    priority,
    setPriority,
    deadlineDay,
    setDeadlineDay,
    loading,
    modalConfig,
    handleSave,
    handleCloseModal
  };
}