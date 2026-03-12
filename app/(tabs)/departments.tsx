import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Users, Plus, Trash } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useDepartments } from '@/features/departments/useDepartments';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function DepartmentsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const {
    departments,
    loading,
    isAdmin,
    isMaster,
    isLeader,
    deleteDepartment
  } = useDepartments();

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    targetId: '',
    loading: false
  });

  const requestDeleteConfirmation = (departmentId: string, departmentName: string) => {
    setConfirmConfig({
      title: 'Excluir Departamento',
      message: `Tem certeza que deseja excluir '${departmentName}'? Essa ação apagará todos os vínculos e escalas associados.`,
      targetId: departmentId,
      loading: false
    });
    setConfirmModalVisible(true);
  };

  const executeDelete = async () => {
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    try {
      await deleteDepartment(confirmConfig.targetId);
      setConfirmModalVisible(false);
    } catch (error: any) {
      setConfirmModalVisible(false);
      Alert.alert('Erro', error.message);
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
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

      <ConfirmModal 
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={true}
        loading={confirmConfig.loading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </ScrollView>
  );
}