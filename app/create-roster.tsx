import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Calendar, Users, X, Save } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getAvailableMembersByFunction, createRoster } from '@/services/rosterService';

export default function CreateRosterScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Buscar dados do usuário
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setOrganizationId(profile.organization_id);

        // Buscar departamentos onde o usuário é líder
        const { data: deptMembers } = await supabase
          .from('department_members')
          .select('department_id, departments(id, name)')
          .eq('user_id', user.id)
          .eq('dept_role', 'leader');

        if (deptMembers) {
          const depts = deptMembers.map((dm: any) => ({
            id: dm.department_id,
            name: dm.departments.name,
          }));
          setDepartments(depts);
          if (depts.length > 0) {
            setSelectedDepartment(depts[0].id);
          }
        }
      }
    }

    loadUserData();
  }, []);

  // Buscar funções do departamento selecionado
  useEffect(() => {
    async function loadFunctions() {
      if (!selectedDepartment) return;

      const { data } = await supabase
        .from('department_functions')
        .select('id, name')
        .eq('department_id', selectedDepartment)
        .order('name');

      if (data) {
        setFunctions(data);
        if (data.length > 0) {
          setSelectedFunction(data[0].id);
        }
      }
    }

    loadFunctions();
  }, [selectedDepartment]);

  // Buscar membros disponíveis quando função e data são selecionados
  useEffect(() => {
    async function loadAvailableMembers() {
      if (!selectedDepartment || !selectedFunction || !organizationId) {
        setAvailableMembers([]);
        return;
      }

      setLoading(true);
      try {
        const members = await getAvailableMembersByFunction(
          organizationId,
          selectedDepartment,
          selectedFunction,
          selectedDate
        );
        setAvailableMembers(members);
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Erro ao buscar membros disponíveis');
      } finally {
        setLoading(false);
      }
    }

    loadAvailableMembers();
  }, [selectedDepartment, selectedFunction, selectedDate, organizationId]);

  const handleCreateRoster = async (userId: string) => {
    if (!organizationId || !selectedDepartment || !selectedFunction) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      await createRoster(
        organizationId,
        selectedDate,
        selectedDepartment,
        userId,
        selectedFunction,
        user.id
      );

      Alert.alert('Sucesso', 'Escala criada com sucesso!');
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar escala');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Criar Escala</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Seleção de Data */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Data</Text>
          <Text className="text-gray-700">
            {selectedDate.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity className="mt-2">
            <Text className="text-blue-500">Alterar data</Text>
          </TouchableOpacity>
        </View>

        {/* Seleção de Departamento */}
        {departments.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Departamento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept.id}
                  onPress={() => setSelectedDepartment(dept.id)}
                  className={`px-4 py-2 rounded-lg mr-2 ${
                    selectedDepartment === dept.id
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={
                      selectedDepartment === dept.id
                        ? 'text-white font-semibold'
                        : 'text-gray-700'
                    }
                  >
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Seleção de Função */}
        {functions.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Qual função você quer preencher?
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {functions.map((func) => (
                <TouchableOpacity
                  key={func.id}
                  onPress={() => setSelectedFunction(func.id)}
                  className={`px-4 py-2 rounded-lg mr-2 ${
                    selectedFunction === func.id
                      ? 'bg-blue-500'
                      : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={
                      selectedFunction === func.id
                        ? 'text-white font-semibold'
                        : 'text-gray-700'
                    }
                  >
                    {func.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Lista de Membros Disponíveis */}
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Membros Disponíveis
          </Text>

          {loading ? (
            <Text className="text-gray-500 text-center py-4">Carregando...</Text>
          ) : availableMembers.length === 0 ? (
            <Text className="text-gray-500 text-center py-4">
              Nenhum membro disponível encontrado para esta função e data.
            </Text>
          ) : (
            availableMembers.map((member) => (
              <TouchableOpacity
                key={member.user_id}
                onPress={() => handleCreateRoster(member.user_id)}
                disabled={loading}
                className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    {member.full_name || 'Sem nome'}
                  </Text>
                  {member.email && (
                    <Text className="text-gray-600 text-sm">{member.email}</Text>
                  )}
                </View>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 text-xs font-semibold">Disponível</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
