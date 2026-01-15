import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Save, X, Info } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function CreateDepartmentScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('');
  const [deadlineDay, setDeadlineDay] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Buscar organization_id e verificar se é admin
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
        setIsAdmin(profile.org_role === 'admin');
      }
    }

    loadUserData();
  }, []);

  const handleSave = async () => {
    // Validações
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do departamento');
      return;
    }

    const priorityNum = parseInt(priority);
    if (isNaN(priorityNum) || priorityNum < 1) {
      Alert.alert('Erro', 'A prioridade deve ser um número maior ou igual a 1');
      return;
    }

    const deadlineNum = parseInt(deadlineDay);
    if (isNaN(deadlineNum) || deadlineNum < 1 || deadlineNum > 31) {
      Alert.alert('Erro', 'O dia limite deve ser um número entre 1 e 31');
      return;
    }

    if (!organizationId) {
      Alert.alert('Erro', 'Não foi possível identificar sua organização');
      return;
    }

    if (!isAdmin) {
      Alert.alert('Erro', 'Apenas administradores podem criar departamentos');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          priority_order: priorityNum,
          availability_deadline_day: deadlineNum,
        });

      if (error) {
        Alert.alert('Erro ao criar departamento', error.message);
      } else {
        Alert.alert(
          'Sucesso!',
          'Departamento criado com sucesso.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
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
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-2xl font-bold text-gray-900">
            Criar Departamento
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2"
          >
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View>
          {/* Nome do Departamento */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Nome do Departamento
            </Text>
            <TextInput
              className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-gray-900 text-base"
              placeholder="Ex: Louvor, Diáconos, Portaria..."
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Prioridade */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Prioridade
            </Text>
            <TextInput
              className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-gray-900 text-base"
              placeholder="Ex: 1, 2, 3..."
              placeholderTextColor="#9ca3af"
              value={priority}
              onChangeText={setPriority}
              keyboardType="numeric"
              editable={!loading}
            />
            <View className="flex-row items-start mt-2 bg-blue-50 rounded-lg p-3">
              <Info size={16} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
              <Text className="text-blue-700 text-xs flex-1">
                A prioridade determina a ordem de importância. Número 1 é a maior prioridade. Departamentos com maior prioridade têm preferência na criação de escalas.
              </Text>
            </View>
          </View>

          {/* Dia Limite de Escala */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Dia Limite de Escala
            </Text>
            <TextInput
              className="bg-white rounded-lg border border-gray-200 px-4 py-3 text-gray-900 text-base"
              placeholder="Ex: 15 (dia do mês)"
              placeholderTextColor="#9ca3af"
              value={deadlineDay}
              onChangeText={setDeadlineDay}
              keyboardType="numeric"
              editable={!loading}
            />
            <Text className="text-gray-500 text-xs mt-2">
              Dia do mês (1 a 31) em que o prazo para informar disponibilidade encerra.
            </Text>
          </View>

          {/* Botão Salvar */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className="bg-blue-600 rounded-lg py-4 px-6 shadow-lg mb-4"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <View className="flex-row items-center justify-center">
                <Save size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-base">
                  Salvar Departamento
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
