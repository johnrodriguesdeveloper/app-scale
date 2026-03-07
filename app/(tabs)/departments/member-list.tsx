import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Trash, Plus, ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMemberList } from '@/features/departments/useMemberList';
import { ConfirmModal } from '@/components/ConfirmModal';
import { AddMemberModal } from '@/features/departments/AddMemberModal';
import { DepartmentMember } from '@/types';

export default function MemberListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; name: string }>();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';

  const {
    members,
    departmentLeaders,
    loading,
    canEdit,
    availableProfiles,
    availableFunctions,
    loadAvailableProfiles,
    addMember,
    addFunctionsToMember,
    removeMember,
    removeFunctionFromMember
  } = useMemberList(id);

  const [showAddModal, setShowAddModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add_member' | 'add_function'>('add_member');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: async () => {},
    isDestructive: false,
    loading: false
  });

  const requestConfirmation = (title: string, message: string, onConfirm: () => Promise<void>, isDestructive = false) => {
    setConfirmConfig({ title, message, onConfirm, isDestructive, loading: false });
    setConfirmModalVisible(true);
  };

  const handleConfirmAction = async () => {
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    try {
      await confirmConfig.onConfirm();
      setConfirmModalVisible(false);
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const handleOpenAddMember = async () => {
    setModalMode('add_member');
    await loadAvailableProfiles();
    setShowAddModal(true);
  };

  const handleOpenAddFunction = (memberId: string) => {
    setModalMode('add_function');
    setSelectedMemberId(memberId);
    setShowAddModal(true);
  };

  const handleDeleteMember = (memberId: string) => {
    requestConfirmation(
      'Remover Membro',
      'Tem certeza que deseja remover este membro? Todas as escalas futuras dele serão apagadas.',
      async () => await removeMember(memberId),
      true
    );
  };

  const handleRemoveFunction = (memberId: string, functionId: string) => {
    requestConfirmation(
      'Remover Função',
      'Deseja remover esta função do membro?',
      async () => await removeFunctionFromMember(memberId, functionId),
      true
    );
  };

  const renderMember = ({ item }: { item: DepartmentMember }) => {
    const functionsList = item.member_functions?.map(mf => mf.department_functions) || [];
    const hasMoreFunctions = functionsList.length < availableFunctions.length;
    const isLeader = departmentLeaders.includes(item.user_id);

    return (
      <View className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 mx-4 mb-3">
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/10 items-center justify-center mr-3">
                <Text className="text-blue-600 dark:text-blue-400 font-bold">{item.profiles.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text className="text-gray-900 dark:text-zinc-100 font-bold text-base">{item.profiles?.full_name}</Text>
                {isLeader && (
                  <View className="bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded-md self-start mt-0.5 flex-row items-center">
                    <ShieldCheck size={10} color="#b45309" className="mr-1"/>
                    <Text className="text-amber-800 dark:text-amber-400 text-[10px] font-bold">LÍDER</Text>
                  </View>
                )}
              </View>
            </View>
            {canEdit && (
              <TouchableOpacity onPress={() => handleDeleteMember(item.id)} className="p-2 bg-gray-50 dark:bg-zinc-800 rounded-full">
                <Trash size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {functionsList.map((func) => (
              <TouchableOpacity 
                key={func.id}
                disabled={!canEdit}
                onPress={() => handleRemoveFunction(item.id, func.id)}
                className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800 flex-row items-center"
              >
                <Text className="text-blue-700 dark:text-blue-300 text-xs font-semibold mr-1">{func.name}</Text>
                {canEdit && <Text className="text-blue-400 dark:text-blue-500 text-xs ml-1">×</Text>}
              </TouchableOpacity>
            ))}
            {canEdit && hasMoreFunctions && (
              <TouchableOpacity onPress={() => handleOpenAddFunction(item.id)} className="bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 border-dashed">
                <Text className="text-gray-500 dark:text-zinc-400 text-xs font-semibold">+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View className="flex-1 items-center justify-center dark:bg-zinc-950"><ActivityIndicator color="#2563eb"/></View>;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="bg-white dark:bg-zinc-900 px-4 pt-12 pb-4 border-b border-gray-200 dark:border-zinc-800 flex-row items-center">
        <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/departments/[id]', params: { id } })} className="mr-3 p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
          <ArrowLeft size={20} color={iconColor} />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Todos os Membros</Text>
        </View>
      </View>

      <FlatList 
        data={members} 
        renderItem={renderMember} 
        keyExtractor={i => i.id} 
        contentContainerStyle={{paddingVertical:16}} 
        ListEmptyComponent={<Text className="text-center text-gray-400 dark:text-zinc-600 mt-10">Nenhum membro.</Text>}
      />
      
      {canEdit && (
        <TouchableOpacity onPress={handleOpenAddMember} className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      )}

      <AddMemberModal 
        visible={showAddModal}
        mode={modalMode}
        availableProfiles={availableProfiles}
        availableFunctions={modalMode === 'add_function' && selectedMemberId 
          ? availableFunctions.filter(f => !members.find(m => m.id === selectedMemberId)?.member_functions?.some(mf => mf.department_functions.id === f.id))
          : availableFunctions
        }
        onClose={() => setShowAddModal(false)}
        onSaveMember={addMember}
        onSaveFunctions={(functions) => addFunctionsToMember(selectedMemberId!, functions)}
      />

      <ConfirmModal 
        visible={confirmModalVisible} 
        title={confirmConfig.title} 
        message={confirmConfig.message} 
        isDestructive={confirmConfig.isDestructive} 
        loading={confirmConfig.loading} 
        onConfirm={handleConfirmAction} 
        onCancel={() => setConfirmModalVisible(false)} 
      />
    </View>
  );
}