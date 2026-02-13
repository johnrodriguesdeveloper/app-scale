import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users, Plus, Trash, ArrowLeft } from 'lucide-react-native'; // Adicionei ArrowLeft
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind';

export default function DepartmentsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';

  const [departments, setDepartments] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleDeleteDepartment = (departmentId: string, departmentName: string) => {
    if (!departmentId) return;

    const executeDelete = async () => {
      const { error } = await supabase.from('departments').delete().eq('id', departmentId);

      if (error) {
        Alert.alert('Erro', 'Verifique se há membros ou escalas vinculadas antes de excluir.');
        return;
      }

      setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
      fetchDepartments();
    };

    if (Platform.OS === 'web') {
      if (confirm(`Tem certeza que deseja excluir '${departmentName}'?`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Excluir Departamento',
        `Tem certeza que deseja excluir '${departmentName}'?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, org_role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setOrganizationId(profile.organization_id);
        const masterStatus = profile.org_role === 'master';
        const adminStatus = profile.org_role === 'admin' || masterStatus;
        
        setIsMaster(masterStatus);
        setIsAdmin(adminStatus);

        let deptsData = [];

        // --- FILTRAGEM: Admin vê tudo, Membro vê só os seus ---
        if (adminStatus) {
          const { data } = await supabase
            .from('departments')
            .select('id, name, description')
            .eq('organization_id', profile.organization_id)
            .is('parent_id', null)
            .order('priority_order', { ascending: false });
          deptsData = data || [];
        } else {
          // O !inner garante que só venha departamentos onde o usuário é membro
          const { data } = await supabase
            .from('departments')
            .select('id, name, description, department_members!inner(user_id)')
            .eq('department_members.user_id', user.id)
            .order('name');
          deptsData = data || [];
        }

        setDepartments(deptsData);

        // Verificar liderança
        const { data: deptMembers } = await supabase
          .from('department_members')
          .select('department_id')
          .eq('user_id', user.id)
          .eq('dept_role', 'leader');

        if (deptMembers) {
          const leaderMap: Record<string, boolean> = {};
          deptMembers.forEach((dm) => { leaderMap[dm.department_id] = true; });
          setIsLeader(leaderMap);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDepartments();
    }, [fetchDepartments])
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
      
      {/* HEADER COM BOTÃO DE VOLTAR */}
      <View className="bg-white dark:bg-zinc-900 px-4 pt-8 pb-4 border-b border-gray-200 dark:border-zinc-800 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.push('/')} // Volta para Home
            className="mr-3 p-2 bg-gray-100 dark:bg-zinc-900 rounded-lg"
          >
            <ArrowLeft size={20} color={iconColor} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Departamentos</Text>
            <Text className="text-sm text-gray-500 dark:text-zinc-400">
              {isAdmin ? 'Visão Geral' : 'Meus Departamentos'}
            </Text>
          </View>
        </View>

        {isMaster && (
          <TouchableOpacity
            onPress={() => router.push('/create-department')}
            className="bg-blue-600 rounded-lg px-3 py-2 flex-row items-center shadow-sm"
          >
            <Plus size={18} color="white" style={{ marginRight: 4 }} />
            <Text className="text-white font-semibold text-xs">Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="py-4">
        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <>
            {departments.map((dept) => (
              <View
                key={dept.id}
                className="bg-white dark:bg-zinc-900 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-zinc-800 flex-row items-center justify-between mx-4"
              >
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/departments/${dept.id}`)}
                  className="flex-1 pr-3"
                >
                  <View>
                    <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
                      {dept.name}
                    </Text>
                    {dept.description && (
                      <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-1" numberOfLines={1}>
                        {dept.description}
                      </Text>
                    )}
                    {isLeader[dept.id] && (
                      <View className="flex-row items-center mt-2 bg-blue-50 dark:bg-blue-900/20 self-start px-2 py-1 rounded">
                        <Users size={12} color="#3b82f6" />
                        <Text className="text-blue-600 dark:text-blue-400 text-xs ml-1 font-medium">Líder</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {isMaster && (
                  <TouchableOpacity
                    onPress={() => handleDeleteDepartment(String(dept.id), String(dept.name))}
                    className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg"
                  >
                    <Trash size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {departments.length === 0 && (
              <View className="items-center py-10 opacity-60">
                <Users size={48} color="gray" />
                <Text className="text-gray-500 mt-4 text-center">
                  {isAdmin 
                    ? 'Nenhum departamento encontrado.' 
                    : 'Você não participa de nenhum departamento.'}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}