import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Save, X, Info, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind';

export default function CreateDepartmentScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('');
  const [deadlineDay, setDeadlineDay] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMaster, setIsMaster] = useState(false);

  // --- ESTADOS DO MODAL DE FEEDBACK ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    type: 'success' as 'success' | 'error',
    title: '',
    message: ''
  });

  // Função para mostrar o modal
  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalConfig({ type, title, message });
    setModalVisible(true);
  };

  // Função ao fechar o modal
  const handleCloseModal = () => {
    setModalVisible(false);
    // Se foi sucesso, volta para a tela anterior ao fechar
    if (modalConfig.type === 'success') {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/departments');
      }
    }
  };
  // ------------------------------------

  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';

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

  const handleSave = async () => {
    // Validações
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

      // SUCESSO!
      showModal('success', 'Sucesso!', 'Departamento criado com sucesso.');

    } catch (error: any) {
      showModal('error', 'Erro ao Criar', error.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <ScrollView className="flex-1">
        <View className="p-4 pt-12">
          
          {/* Header */}
          <View className="flex-row items-center justify-between mb-8">
            <Text className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
              Criar Departamento
            </Text>
            <TouchableOpacity onPress={() => router.back()} className="p-2 bg-gray-200 dark:bg-zinc-800 rounded-full">
              <X size={24} color={colorScheme === 'dark' ? '#e4e4e7' : '#4b5563'} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View>
            {/* Nome */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Nome do Departamento</Text>
              <TextInput
                className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Ex: Louvor, Diáconos..."
                placeholderTextColor={placeholderColor}
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            {/* Prioridade */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Prioridade</Text>
              <TextInput
                className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Ex: 1, 2, 3..."
                placeholderTextColor={placeholderColor}
                value={priority}
                onChangeText={setPriority}
                keyboardType="numeric"
                editable={!loading}
              />
              <View className="flex-row items-start mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-900/30">
                <Info size={16} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
                <Text className="text-blue-700 dark:text-blue-300 text-xs flex-1">
                  A prioridade define a ordem. Número 1 é a maior prioridade.
                </Text>
              </View>
            </View>

            {/* Dia Limite */}
            <View className="mb-8">
              <Text className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-2">Dia Limite de Escala</Text>
              <TextInput
                className="bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 text-base"
                placeholder="Ex: 15 (dia do mês)"
                placeholderTextColor={placeholderColor}
                value={deadlineDay}
                onChangeText={setDeadlineDay}
                keyboardType="numeric"
                editable={!loading}
              />
              <Text className="text-gray-500 dark:text-zinc-500 text-xs mt-2 ml-1">
                Dia do mês (1-31) que encerra o prazo de disponibilidade.
              </Text>
            </View>

            {/* Botão Salvar */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              className={`bg-blue-600 rounded-xl py-4 px-6 shadow-sm mb-4 ${loading ? 'opacity-50' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View className="flex-row items-center justify-center">
                  <Save size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-bold text-base">Salvar Departamento</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* --- MODAL CUSTOMIZADO (Sucesso ou Erro) --- */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl transform transition-all">
            
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
                {modalConfig.type === 'success' ? 'Continuar' : 'Tentar Novamente'}
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      {/* ------------------------------------------- */}

    </View>
  );
}