import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users, Plus, Trash } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function DepartmentsScreen() {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleDeleteDepartment = (departmentId: string, departmentName: string) => {
    if (!departmentId) return;

    Alert.alert(
      'Excluir Departamento',
      `Tem certeza que deseja excluir o departamento '${departmentName}'? Essa ação não pode ser desfeita e apagará todos os sub-departamentos e escalas vinculados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('departments')
              .delete()
              .eq('id', departmentId);

            if (error) {
              Alert.alert(
                'Não foi possível excluir',
                'Verifique se há membros ou escalas ativas vinculadas a este departamento.'
              );
              return;
            }

            // Atualização instantânea para feedback visual
            setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
            
            // Recarregar dados do servidor para garantir sincronia
            await fetchDepartments();
          },
        },
      ]
    );
  };

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;


      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, org_role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError);
        return;
      }

      if (profile) {
        setOrganizationId(profile.organization_id);
        const masterStatus = profile.org_role === 'master';
        const adminStatus = profile.org_role === 'admin' || profile.org_role === 'master';
        setIsMaster(masterStatus);
        setIsAdmin(adminStatus);

        // Buscar departamentos
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name, description')
          .eq('organization_id', profile.organization_id)
          .is('parent_id', null)
          .order('priority_order', { ascending: false });

        if (depts) {
          setDepartments(depts);

          // Verificar quais departamentos o usuário é líder
          const { data: deptMembers } = await supabase
            .from('department_members')
            .select('department_id')
            .eq('user_id', user.id)
            .eq('dept_role', 'leader');

          if (deptMembers) {
            const leaderMap: Record<string, boolean> = {};
            deptMembers.forEach((dm) => {
              leaderMap[dm.department_id] = true;
            });
            setIsLeader(leaderMap);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
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
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Departamentos</Text>
          {isMaster && (
            <TouchableOpacity
              onPress={() => router.push('/create-department')}
              className="bg-blue-600 rounded-lg px-4 py-2.5 flex-row items-center shadow-sm"
            >
              <Plus size={18} color="white" style={{ marginRight: 6 }} />
              <Text className="text-white font-semibold text-sm">Criar Departamento</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-500 dark:text-zinc-400 mt-2">Carregando...</Text>
          </View>
        ) : (
          <>
            {departments.map((dept) => (
              <View
                key={dept.id}
                className="bg-white dark:bg-zinc-900 rounded-xl p-4 mb-4 shadow-sm border border-gray-200 dark:border-zinc-800 flex-row items-center justify-between"
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
                      <Text className="text-gray-600 dark:text-zinc-400 text-sm mt-1">{dept.description}</Text>
                    )}
                    {isLeader[dept.id] && (
                      <View className="flex-row items-center mt-2">
                        <Users size={16} color="#3b82f6" />
                        <Text className="text-blue-600 dark:text-blue-400 text-sm ml-1">Você é líder</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {isMaster && (
                  <TouchableOpacity
                    onPress={() => handleDeleteDepartment(String(dept.id), String(dept.name))}
                    className="p-2"
                  >
                    <Trash size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {departments.length === 0 && (
              <View className="items-center py-8">
                <Text className="text-gray-500">Nenhum departamento encontrado</Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
