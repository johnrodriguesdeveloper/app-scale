import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight, Users, Calendar, Phone, CheckCircle, AlertTriangle, ArrowLeft, CheckSquare, Square } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind';

interface Department {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
}

interface FunctionItem {
  id: string;
  name: string;
  description?: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);

  // Dados do Banco
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<Department[]>([]);
  const [functions, setFunctions] = useState<FunctionItem[]>([]);

  // Seleções do Usuário
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<Department | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]); 

  // --- MODAL CONFIG ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'success', title: '', message: '' });

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    if (modalConfig.type === 'success') {
      router.replace('/(tabs)');
    }
  };

  // --- MÁSCARAS DE INPUT ---
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

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    loadRootDepartments();
  }, []);

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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

  // --- LÓGICA DE SELEÇÃO DE DEPARTAMENTO (CORRIGIDA) ---
  const handleSelectDepartment = async (dept: Department) => {
    setSelectedDepartment(dept);
    setSubDepartments([]); // <--- LIMPEZA IMPORTANTE
    setSelectedFunctions([]);
    
    // Verifica se tem filhos
    setLoading(true);
    const children = await loadSubDepartments(dept.id);
    setLoading(false);

    if (children.length > 0) {
        setSubDepartments(children);
        setStep(3); // Vai para escolha de sub-departamento
    } else {
        await loadFunctions(dept.id);
        setStep(4); // Pula direto para funções
    }
  };

  // --- NAVEGAÇÃO ENTRE PASSOS (CORRIGIDA) ---

  const goNextStep = async () => {
    if (step === 1) {
      if (phone.length < 14 || birthDate.length < 10) {
        showModal('error', 'Dados Incompletos', 'Preencha o telefone e a data de nascimento corretamente.');
        return;
      }
      setStep(2);
    } 
    else if (step === 3) {
        if (!selectedSubDepartment) {
            showModal('error', 'Selecione', 'Escolha um sub-departamento.');
            return;
        }
        await loadFunctions(selectedSubDepartment.id);
        setStep(4);
    }
  };

  const goBackStep = () => {
    // Voltar de Departamentos -> Dados Pessoais
    if (step === 2) {
        setStep(1);
    }
    
    // Voltar de Sub-departamentos -> Lista de Departamentos
    if (step === 3) {
        setStep(2);
        setSelectedSubDepartment(null);
        setSelectedDepartment(null);
        setSubDepartments([]); // <--- LIMPANDO O LIXO DE MEMÓRIA
    }

    // Voltar de Funções -> (Sub-departamentos OU Lista de Departamentos)
    if (step === 4) {
        setSelectedFunctions([]);
        
        // AQUI ESTAVA O ERRO: Confiava no tamanho do array que podia estar sujo.
        // Agora, como limpamos no passo 3, podemos confiar.
        if (subDepartments.length > 0) {
            setStep(3); // Volta para sub-departamentos
        } else {
            setStep(2); // Volta para departamentos raiz
            setSelectedDepartment(null); // Reseta a seleção
            setSubDepartments([]); // Garante limpeza
        }
    }
  };

  // --- SELEÇÃO ---
  const toggleFunction = (funcId: string) => {
    setSelectedFunctions(prev => {
        if (prev.includes(funcId)) {
            return prev.filter(id => id !== funcId);
        } else {
            return [...prev, funcId];
        }
    });
  };

  // --- SALVAR TUDO ---
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

      // 1. Atualizar Perfil
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

      // 2. Criar Vínculo no Departamento
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

      // 3. Inserir Múltiplas Funções
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
      console.error(error);
      showModal('error', 'Erro', error.message || 'Falha ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="p-6 pt-12">
        
        {/* Header Progressivo */}
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 dark:text-zinc-100 mb-2">
            {step === 1 ? 'Seus Dados' : step === 4 ? 'Suas Funções' : 'Onde você serve?'}
          </Text>
          <Text className="text-lg text-gray-600 dark:text-zinc-400">
            Passo {step} de {subDepartments.length > 0 ? 4 : 3}
          </Text>
          <View className="h-2 bg-gray-200 dark:bg-zinc-800 rounded-full mt-4 overflow-hidden">
             <View className="h-full bg-blue-600" style={{ width: `${(step / (subDepartments.length > 0 ? 4 : 3)) * 100}%` }} />
          </View>
        </View>

        {/* --- PASSO 1: DADOS PESSOAIS --- */}
        {step === 1 && (
          <View>
            <View className="mb-4">
               <Text className="mb-2 font-semibold text-gray-700 dark:text-zinc-300">Data de Nascimento</Text>
               <View className="flex-row items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3">
                  <Calendar size={20} color={colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af'} />
                  <TextInput 
                    className="flex-1 ml-3 text-base text-gray-900 dark:text-zinc-100"
                    placeholder="DD/MM/AAAA"
                    placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                    keyboardType="numeric"
                    value={birthDate}
                    onChangeText={handleDateChange}
                    maxLength={10}
                  />
               </View>
            </View>

            <View className="mb-6">
               <Text className="mb-2 font-semibold text-gray-700 dark:text-zinc-300">WhatsApp / Celular</Text>
               <View className="flex-row items-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3">
                  <Phone size={20} color={colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af'} />
                  <TextInput 
                    className="flex-1 ml-3 text-base text-gray-900 dark:text-zinc-100"
                    placeholder="(DD) 99999-9999"
                    placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={handlePhoneChange}
                    maxLength={15}
                  />
               </View>
            </View>
          </View>
        )}

        {/* --- PASSO 2: DEPARTAMENTO --- */}
        {step === 2 && (
          <View>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept.id}
                onPress={() => handleSelectDepartment(dept)} // Usando a função corrigida
                className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border-2 ${
                  selectedDepartment?.id === dept.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                    : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">{dept.name}</Text>
                  {dept.description && <Text className="text-gray-500 dark:text-zinc-400 text-xs">{dept.description}</Text>}
                </View>
                <ChevronRight size={20} color="#6b7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* --- PASSO 3: SUB-DEPARTAMENTO (Se houver) --- */}
        {step === 3 && (
          <View>
            <Text className="mb-4 text-gray-600 dark:text-zinc-400">
                Dentro de <Text className="font-bold text-gray-900 dark:text-zinc-200">{selectedDepartment?.name}</Text>, qual sua área?
            </Text>
            {subDepartments.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                onPress={() => setSelectedSubDepartment(sub)}
                className={`flex-row items-center justify-between p-4 mb-3 rounded-xl border-2 ${
                  selectedSubDepartment?.id === sub.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                    : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">{sub.name}</Text>
                {selectedSubDepartment?.id === sub.id && <CheckCircle size={24} color="#2563eb" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* --- PASSO 4: FUNÇÕES (Múltipla Escolha) --- */}
        {step === 4 && (
          <View>
            <Text className="mb-4 text-gray-600 dark:text-zinc-400">
                O que você faz em <Text className="font-bold text-gray-900 dark:text-zinc-200">{selectedSubDepartment?.name || selectedDepartment?.name}</Text>?
            </Text>
            {functions.length > 0 ? functions.map((func) => {
                const isSelected = selectedFunctions.includes(func.id);
                return (
                  <TouchableOpacity
                    key={func.id}
                    onPress={() => toggleFunction(func.id)}
                    className={`flex-row items-center p-4 mb-3 rounded-xl border-2 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <View className="mr-3">
                        {isSelected 
                            ? <CheckSquare size={24} color="#2563eb" /> 
                            : <Square size={24} color={colorScheme === 'dark' ? '#71717a' : '#d1d5db'} />
                        }
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{func.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
            }) : (
                <View className="items-center py-10">
                    <Text className="text-gray-500 dark:text-zinc-400">Nenhuma função encontrada para este departamento.</Text>
                </View>
            )}
          </View>
        )}

        {/* --- RODAPÉ DE NAVEGAÇÃO --- */}
        <View className="flex-row justify-between mt-8 mb-10">
            {step > 1 ? (
                <TouchableOpacity 
                    onPress={goBackStep}
                    className="bg-gray-200 dark:bg-zinc-800 px-6 py-4 rounded-xl flex-row items-center"
                >
                    <ArrowLeft size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                </TouchableOpacity>
            ) : <View />}

            {step === 4 ? (
                <TouchableOpacity 
                    onPress={handleFinish}
                    disabled={saving}
                    className="flex-1 ml-4 bg-green-600 rounded-xl py-4 items-center flex-row justify-center shadow-lg"
                    style={{ opacity: saving ? 0.7 : 1 }}
                >
                    {saving ? <ActivityIndicator color="white" /> : (
                        <>
                            <CheckCircle size={20} color="white" style={{marginRight:8}} />
                            <Text className="text-white font-bold text-lg">Concluir</Text>
                        </>
                    )}
                </TouchableOpacity>
            ) : (
                <TouchableOpacity 
                    onPress={goNextStep}
                    className="flex-1 ml-4 bg-blue-600 rounded-xl py-4 items-center flex-row justify-center shadow-lg"
                >
                    <Text className="text-white font-bold text-lg mr-2">Próximo</Text>
                    <ChevronRight size={20} color="white" />
                </TouchableOpacity>
            )}
        </View>

      </View>

      {/* --- MODAL DE FEEDBACK --- */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => {}}>
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
                {modalConfig.type === 'success' ? 'Começar' : 'Corrigir'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}