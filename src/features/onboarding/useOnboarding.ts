import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { OnboardingDepartment, OnboardingFunctionItem, FeedbackModalProps } from '@/types';

export function useOnboarding() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  const [departments, setDepartments] = useState<OnboardingDepartment[]>([]);
  const [subDepartments, setSubDepartments] = useState<OnboardingDepartment[]>([]);
  const [functions, setFunctions] = useState<OnboardingFunctionItem[]>([]);

  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [selectedDepartment, setSelectedDepartment] = useState<OnboardingDepartment | null>(null);
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<OnboardingDepartment | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);

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
      router.replace('/(tabs)');
    }
  };

  const handleDateChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 8) cleaned = cleaned.substring(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    if (cleaned.length > 4) formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    setBirthDate(formatted);
  };

  const handlePhoneChange = (text: string) => {
    let cleaned = text.replace(/\D/g, '');
    if (cleaned.length > 11) cleaned = cleaned.substring(0, 11);
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length > 7) formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    setPhone(formatted);
  };

  useEffect(() => {
    const loadRootDepartments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name, description, organization_id')
          .is('parent_id', null)
          .order('name');
        if (depts) setDepartments(depts);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    loadRootDepartments();
  }, []);

  const loadSubDepartments = async (deptId: string) => {
    const { data: children } = await supabase
      .from('departments')
      .select('id, name, description, organization_id')
      .eq('parent_id', deptId)
      .order('name');
    return children || [];
  };

  const loadFunctions = async (deptId: string) => {
    const { data: funcs } = await supabase
      .from('department_functions')
      .select('id, name, description')
      .eq('department_id', deptId)
      .order('name');
    if (funcs) setFunctions(funcs);
  };

  const handleSelectDepartment = async (dept: OnboardingDepartment) => {
    setSelectedDepartment(dept);
    setSubDepartments([]);
    setSelectedFunctions([]);

    setLoading(true);
    const children = await loadSubDepartments(dept.id);
    setLoading(false);

    if (children.length > 0) {
      setSubDepartments(children);
      setStep(3);
    } else {
      await loadFunctions(dept.id);
      setStep(4);
    }
  };

  const goNextStep = async () => {
    if (step === 1) {
      if (phone.length < 14 || birthDate.length < 10) {
        showModal('error', 'Dados Incompletos', 'Preencha o telefone e a data de nascimento corretamente.');
        return;
      }
      setStep(2);
    } else if (step === 3) {
      if (!selectedSubDepartment) {
        showModal('error', 'Selecione', 'Escolha um sub-departamento.');
        return;
      }
      await loadFunctions(selectedSubDepartment.id);
      setStep(4);
    }
  };

  const goBackStep = () => {
    if (step === 2) {
      setStep(1);
    }
    if (step === 3) {
      setStep(2);
      setSelectedSubDepartment(null);
      setSelectedDepartment(null);
      setSubDepartments([]);
    }
    if (step === 4) {
      setSelectedFunctions([]);
      if (subDepartments.length > 0) {
        setStep(3);
      } else {
        setStep(2);
        setSelectedDepartment(null);
        setSubDepartments([]);
      }
    }
  };

  const toggleFunction = (funcId: string) => {
    setSelectedFunctions(prev => {
      if (prev.includes(funcId)) {
        return prev.filter(id => id !== funcId);
      } else {
        return [...prev, funcId];
      }
    });
  };

  const handleFinish = async () => {
    if (selectedFunctions.length === 0) {
      showModal('error', 'Atenção', 'Selecione pelo menos uma função.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const finalDeptId = selectedSubDepartment?.id || selectedDepartment?.id;
      const organizationId = selectedSubDepartment?.organization_id || selectedDepartment?.organization_id;

      if (!finalDeptId || !organizationId) throw new Error("Dados inválidos");

      const [day, month, year] = birthDate.split('/');
      const isoDate = `${year}-${month}-${day}`;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: organizationId,
          phone: phone,
          birth_date: isoDate
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      const { data: memberData, error: memberError } = await supabase
        .from('department_members')
        .insert({
          user_id: user.id,
          department_id: finalDeptId,
          dept_role: 'member',
        })
        .select()
        .single();

      if (memberError) throw memberError;

      const functionsToInsert = selectedFunctions.map(funcId => ({
        member_id: memberData.id,
        function_id: funcId
      }));

      const { error: funcError } = await supabase
        .from('member_functions')
        .insert(functionsToInsert);

      if (funcError) throw funcError;

      showModal('success', 'Bem-vindo!', 'Seu cadastro foi concluído com sucesso.');
    } catch (error: any) {
      showModal('error', 'Erro', error.message || 'Falha ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    step,
    departments,
    subDepartments,
    functions,
    phone,
    birthDate,
    selectedDepartment,
    selectedSubDepartment,
    selectedFunctions,
    modalConfig,
    handleDateChange,
    handlePhoneChange,
    handleSelectDepartment,
    setSelectedSubDepartment,
    goNextStep,
    goBackStep,
    toggleFunction,
    handleFinish,
    handleCloseModal
  };
}