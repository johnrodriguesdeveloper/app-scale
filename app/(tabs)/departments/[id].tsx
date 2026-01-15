import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Plus, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function DepartmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [department, setDepartment] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [savingFunction, setSavingFunction] = useState(false);

  // Verificar se é admin e carregar dados
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      // Verificar se é admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setIsAdmin(profile.org_role === 'admin');
      }

      // Buscar detalhes do departamento
      const { data: dept } = await supabase
        .from('departments')
        .select('id, name, description, priority_order, availability_deadline_day')
        .eq('id', id)
        .single();

      if (dept) {
        setDepartment(dept);
      }

      // Buscar membros do departamento
      const { data: deptMembers } = await supabase
        .from('department_members')
        .select(`
          user_id,
          dept_role,
          profiles(id, full_name, email, avatar_url)
        `)
        .eq('department_id', id);

      if (deptMembers) {
        setMembers(deptMembers);
      }

      // Buscar funções do departamento
      const { data: deptFunctions } = await supabase
        .from('department_functions')
        .select('id, name, description')
        .eq('department_id', id)
        .order('name');

      if (deptFunctions) {
        setFunctions(deptFunctions);
      }

      setLoading(false);
    }

    loadData();
  }, [id]);

  const handleCreateFunction = async () => {
    if (!newFunctionName.trim() || !id) {
      Alert.alert('Erro', 'Por favor, preencha o nome da função');
      return;
    }

    setSavingFunction(true);
    try {
      const { error } = await supabase
        .from('department_functions')
        .insert({
          department_id: id,
          name: newFunctionName.trim(),
        });

      if (error) {
        Alert.alert('Erro ao criar função', error.message);
      } else {
        Alert.alert('Sucesso!', 'Função criada com sucesso.');
        setShowModal(false);
        setNewFunctionName('');

        // Recarregar funções
        const { data: deptFunctions } = await supabase
          .from('department_functions')
          .select('id, name, description')
          .eq('department_id', id)
          .order('name');

        if (deptFunctions) {
          setFunctions(deptFunctions);
        }
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado');
    } finally {
      setSavingFunction(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!department) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-4">
        <Text className="text-gray-500 text-center">Departamento não encontrado</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-blue-600 rounded-lg px-6 py-3"
        >
          <Text className="text-white font-semibold">Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">{department.name}</Text>
            {department.description && (
              <Text className="text-gray-600 text-sm mt-1">{department.description}</Text>
            )}
          </View>
        </View>

        <View className="p-4">
          {/* Membros do Departamento */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Users size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-lg font-semibold text-gray-900">Membros</Text>
              </View>
              <Text className="text-gray-500 text-sm">{members.length} membro(s)</Text>
            </View>

            {members.length > 0 ? (
              <View className="bg-white rounded-xl shadow-sm border border-gray-200">
                {members.map((member, index) => (
                  <View
                    key={member.user_id}
                    className={`p-4 ${index !== members.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="flex-row items-center">
                      {member.profiles?.avatar_url ? (
                        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                          <Text className="text-blue-600 font-semibold">
                            {member.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      ) : (
                        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                          <User size={20} color="#3b82f6" />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium">
                          {member.profiles?.full_name || member.profiles?.email || 'Sem nome'}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                          {member.dept_role === 'leader' ? 'Líder' : 'Membro'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-6 items-center border border-gray-200">
                <Users size={32} color="#9ca3af" />
                <Text className="text-gray-500 mt-2">Nenhum membro encontrado</Text>
              </View>
            )}
          </View>

          {/* Funções / Sub-departamentos */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Plus size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-lg font-semibold text-gray-900">Funções / Sub-departamentos</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setShowModal(true)}
                  className="bg-blue-600 rounded-lg px-3 py-1.5 flex-row items-center"
                >
                  <Plus size={16} color="white" style={{ marginRight: 4 }} />
                  <Text className="text-white font-semibold text-xs">Nova Função</Text>
                </TouchableOpacity>
              )}
            </View>

            {functions.length > 0 ? (
              <View className="bg-white rounded-xl shadow-sm border border-gray-200">
                {functions.map((func, index) => (
                  <View
                    key={func.id}
                    className={`p-4 ${index !== functions.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <Text className="text-gray-900 font-medium">{func.name}</Text>
                    {func.description && (
                      <Text className="text-gray-500 text-sm mt-1">{func.description}</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-6 items-center border border-gray-200">
                <Plus size={32} color="#9ca3af" />
                <Text className="text-gray-500 mt-2">Nenhuma função cadastrada</Text>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => setShowModal(true)}
                    className="mt-4 bg-blue-600 rounded-lg px-4 py-2"
                  >
                    <Text className="text-white font-semibold text-sm">Criar primeira função</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal para criar nova função */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Nova Função</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setNewFunctionName('');
                }}
              >
                <Text className="text-gray-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Nome da Função
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 text-gray-900 text-base"
                placeholder="Ex: Guitarrista, Professor, Monitor..."
                placeholderTextColor="#9ca3af"
                value={newFunctionName}
                onChangeText={setNewFunctionName}
                editable={!savingFunction}
              />
            </View>

            <TouchableOpacity
              onPress={handleCreateFunction}
              disabled={savingFunction || !newFunctionName.trim()}
              className="bg-blue-600 rounded-lg py-4 px-6 mb-3"
              style={{ opacity: savingFunction || !newFunctionName.trim() ? 0.5 : 1 }}
            >
              {savingFunction ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-center">Criar Função</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                setNewFunctionName('');
              }}
              className="bg-gray-100 rounded-lg py-4 px-6"
            >
              <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
