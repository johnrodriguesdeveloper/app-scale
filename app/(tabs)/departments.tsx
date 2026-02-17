import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Users, Plus, Trash, ArrowLeft, AlertTriangle } from 'lucide-react-native';
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

  // --- ESTADOS DO MODAL DE CONFIRMAÇÃO ---
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: async () => {},
    loading: false
  });


  const requestDeleteConfirmation = (departmentId: string, departmentName: string) => {
    setConfirmConfig({
      title: 'Excluir Departamento',
      message: `Tem certeza que deseja excluir '${departmentName}'? Essa ação apagará todos os vínculos e escalas associados.`,
      loading: false,
      onConfirm: async () => await executeDelete(departmentId)
    });
    setConfirmModalVisible(true);
  };


  const executeDelete = async (departmentId: string) => {
    try {
      setConfirmConfig(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.from('departments').delete().eq('id', departmentId);

      if (error) {

        setConfirmModalVisible(false);
        Alert.alert('Erro', 'Verifique se há membros ou escalas vinculadas antes de excluir.');
        return;
      }

      setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
      fetchDepartments();
      setConfirmModalVisible(false);

    } catch (error) {
      console.error(error);
      setConfirmModalVisible(false);
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };
  // -----------------------------------------

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

        if (adminStatus) {
          const { data } = await supabase
            .from('departments')
            .select('id, name, description')
            .eq('organization_id', profile.organization_id)
            .is('parent_id', null)
            .order('priority_order', { ascending: false });
          deptsData = data || [];
        } else {
          const { data } = await supabase
            .from('departments')
            .select('id, name, description, department_members!inner(user_id)')
            .eq('department_members.user_id', user.id)
            .order('name');
          deptsData = data || [];
        }

        setDepartments(deptsData);

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
      {/* HEADER */}
      <View className="bg-white dark:bg-zinc-900 p-6 border-b border-gray-200 dark:border-zinc-800 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Departamentos</Text>
          
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
                    onPress={() => requestDeleteConfirmation(String(dept.id), String(dept.name))}
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

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
            <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
                <View className="items-center mb-4">
                    <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-3">
                        <AlertTriangle size={24} color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} />
                    </View>
                    <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 text-center mb-2">
                        {confirmConfig.title}
                    </Text>
                    <Text className="text-gray-500 dark:text-zinc-400 text-center text-base">
                        {confirmConfig.message}
                    </Text>
                </View>

                <View className="flex-row gap-3">
                    <TouchableOpacity 
                        onPress={() => setConfirmModalVisible(false)}
                        className="flex-1 bg-gray-100 dark:bg-zinc-800 py-3 rounded-xl"
                        disabled={confirmConfig.loading}
                    >
                        <Text className="text-gray-700 dark:text-zinc-300 font-semibold text-center">Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={confirmConfig.onConfirm}
                        className="flex-1 bg-red-600 py-3 rounded-xl flex-row justify-center items-center"
                        disabled={confirmConfig.loading}
                    >
                        {confirmConfig.loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-center">Excluir</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </ScrollView>
  );
}