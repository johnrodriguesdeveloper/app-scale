import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Plus, Folder, Briefcase, Trash, Calendar, Shield } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PromptModal } from '@/components/PromptModal';
import { useDepartmentDetails } from '@/features/departments/useDepartmentDetails';

export default function DepartmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';

  const {
    department,
    parentDepartment,
    subDepartments,
    members,
    functions,
    isAdmin,
    isMaster,
    isLeader,
    loading,
    handleBack,
    removeMember,
    deleteSubDepartment,
    deleteFunction,
    createFunction,
    createSubDepartment
  } = useDepartmentDetails(id);
  
  const [showFunctionModal, setShowFunctionModal] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [savingFunction, setSavingFunction] = useState(false);
  
  const [showSubDeptModal, setShowSubDeptModal] = useState(false);
  const [newSubDeptName, setNewSubDeptName] = useState('');
  const [savingSubDept, setSavingSubDept] = useState(false);

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
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha na ação.');
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCreateFunction = async () => {
    setSavingFunction(true);
    try {
      await createFunction(newFunctionName);
      setShowFunctionModal(false);
      setNewFunctionName('');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSavingFunction(false);
    }
  };

  const handleCreateSubDepartment = async () => {
    setSavingSubDept(true);
    try {
      await createSubDepartment(newSubDeptName);
      setShowSubDeptModal(false);
      setNewSubDeptName('');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSavingSubDept(false);
    }
  };

  if (loading) return <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center"><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (!department) return <View className="flex-1 items-center justify-center"><Text>Não encontrado</Text></View>;

  return (
    <>
      <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
        <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-6 flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <ArrowLeft size={24} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">{department.name}</Text>
            {department.description && <Text className="text-gray-600 dark:text-zinc-400 text-sm mt-1">{department.description}</Text>}
            {department.parent_id && parentDepartment?.name && (
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/departments/[id]', params: { id: parentDepartment.id } })}>
                <Text className="text-indigo-600 dark:text-indigo-400 text-sm font-medium mt-1">↳ {parentDepartment.name}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View className="p-4">
          {(isAdmin || isMaster || isLeader) && (
            <View className="mb-6 flex-row gap-3">
              {(isAdmin || isMaster) && (
                <TouchableOpacity onPress={() => router.push({ pathname: '/department-leaders', params: { departmentId: String(id), departmentName: department?.name } })} className="flex-1 bg-amber-600 rounded-xl px-4 py-3 flex-row items-center justify-center shadow-sm">
                  <Shield size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-bold">Liderança</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => router.push({ pathname: '/department-roster', params: { departmentId: String(id), departmentName: department.name } })} className="flex-1 bg-blue-600 rounded-xl px-4 py-3 flex-row items-center justify-center shadow-sm">
                <Calendar size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold">Escala</Text>
              </TouchableOpacity>
            </View>
          )}

          {(subDepartments.length > 0 || isAdmin) && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Folder size={20} color="#4f46e5" style={{ marginRight: 8 }} />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Sub-departamentos</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => setShowSubDeptModal(true)} className="bg-indigo-600 rounded-lg px-3 py-1.5 flex-row items-center">
                    <Plus size={16} color="white" style={{ marginRight: 4 }} />
                    <Text className="text-white font-semibold text-xs">Criar</Text>
                  </TouchableOpacity>
                )}
              </View>
              {subDepartments.length > 0 ? (
                <View>
                  {subDepartments.map((child, index) => (
                    <View key={child.id} className={`bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex-row items-center ${index !== subDepartments.length - 1 ? 'mb-3' : ''}`}>
                      <TouchableOpacity className="flex-1 flex-row items-center" onPress={() => router.push({ pathname: '/(tabs)/departments/[id]', params: { id: String(child.id) } })}>
                        <View className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mr-3">
                            <Folder size={20} color="#4f46e5" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 dark:text-zinc-100 font-semibold">{child.name}</Text>
                            {child.description && <Text className="text-indigo-700 dark:text-indigo-300 text-sm">{child.description}</Text>}
                        </View>
                      </TouchableOpacity>
                      {isMaster && (
                        <TouchableOpacity onPress={() => requestConfirmation('Excluir', `Excluir '${child.name}'?`, () => deleteSubDepartment(String(child.id)), true)} className="p-2 ml-2">
                          <Trash size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-white dark:bg-zinc-900 rounded-xl p-6 items-center border border-gray-200 dark:border-zinc-800">
                  <Folder size={32} color={colorScheme === 'dark' ? '#52525b' : '#9ca3af'} />
                  <Text className="text-gray-500 dark:text-zinc-400 mt-2">Nenhum sub-departamento</Text>
                  {isAdmin && <TouchableOpacity onPress={() => setShowSubDeptModal(true)} className="mt-4 bg-indigo-600 rounded-lg px-4 py-2"><Text className="text-white font-semibold text-sm">Criar</Text></TouchableOpacity>}
                </View>
              )}
            </View>
          )}

          <View className="mb-6">
            <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/departments/member-list', params: { id: String(id), name: department?.name } })} className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Users size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Membros</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 dark:text-zinc-400 text-sm mr-2">{members.length} membro(s)</Text>
                <Text className="text-blue-600 dark:text-blue-400 text-sm">Ver membros→</Text>
              </View>
            </TouchableOpacity>
            {members.length > 0 ? (
              <View className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                {members.slice(0, 5).map((member, index) => (
                  <View key={member.id} className={`p-4 ${index !== members.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                          <Text className="text-blue-600 dark:text-blue-400 font-semibold">{member.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                        <View className="flex-1 mr-2">
                          <Text className="text-gray-900 dark:text-zinc-100 font-medium" numberOfLines={1}>{member.profiles?.full_name || 'Sem nome'}</Text>
                          <Text className="text-gray-500 dark:text-zinc-400 text-sm">{member.dept_role === 'leader' ? 'Líder' : 'Membro'}</Text>
                        </View>
                      </View>
                      {(isMaster || isAdmin) && (
                        <TouchableOpacity onPress={() => requestConfirmation('Remover', `Remover '${member.profiles?.full_name}'?`, () => removeMember(String(member.id)), true)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <Trash size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
                {members.length > 5 && (
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/departments/member-list', params: { id: String(id), name: department?.name } })} className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-b-xl items-center">
                    <Text className="text-blue-600 dark:text-blue-400 font-medium text-sm">Ver todos os {members.length} membros</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View className="bg-white dark:bg-zinc-900 rounded-xl p-6 items-center border border-gray-200 dark:border-zinc-800">
                <Users size={32} color={colorScheme === 'dark' ? '#52525b' : '#9ca3af'} />
                <Text className="text-gray-500 dark:text-zinc-400 mt-2">Nenhum membro</Text>
              </View>
            )}
          </View>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Briefcase size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Funções</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity onPress={() => setShowFunctionModal(true)} className="bg-blue-600 rounded-lg px-3 py-1.5 flex-row items-center">
                  <Plus size={16} color="white" style={{ marginRight: 4 }} />
                  <Text className="text-white font-semibold text-xs">Nova</Text>
                </TouchableOpacity>
              )}
            </View>
            {functions.length > 0 ? (
              <View className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800">
                {functions.map((func, index) => (
                  <View key={func.id} className={`p-4 ${index !== functions.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-2">
                        <Text className="text-gray-900 dark:text-zinc-100 font-medium">{func.name}</Text>
                        {func.description && <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-1">{func.description}</Text>}
                      </View>
                      {isAdmin && (
                        <TouchableOpacity onPress={() => requestConfirmation('Excluir', `Excluir '${func.name}'?`, () => deleteFunction(String(func.id)), true)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <Trash size={18} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white dark:bg-zinc-900 rounded-xl p-6 items-center border border-gray-200 dark:border-zinc-800">
                <Briefcase size={32} color={colorScheme === 'dark' ? '#52525b' : '#9ca3af'} />
                <Text className="text-gray-500 dark:text-zinc-400 mt-2">Nenhuma função</Text>
                {isAdmin && <TouchableOpacity onPress={() => setShowFunctionModal(true)} className="mt-4 bg-blue-600 rounded-lg px-4 py-2"><Text className="text-white font-semibold text-sm">Criar</Text></TouchableOpacity>}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ConfirmModal 
        visible={confirmModalVisible} 
        title={confirmConfig.title} 
        message={confirmConfig.message} 
        isDestructive={confirmConfig.isDestructive} 
        loading={confirmConfig.loading} 
        onConfirm={handleConfirmAction} 
        onCancel={() => setConfirmModalVisible(false)} 
      />

      <PromptModal 
        visible={showSubDeptModal} 
        title="Novo Sub-departamento" 
        label="Nome" 
        placeholder="Ex: Infantil, Louvor..." 
        value={newSubDeptName} 
        onChangeText={setNewSubDeptName} 
        loading={savingSubDept} 
        onConfirm={handleCreateSubDepartment} 
        onCancel={() => { setShowSubDeptModal(false); setNewSubDeptName(''); }} 
        confirmButtonColor="bg-indigo-600" 
      />

      <PromptModal 
        visible={showFunctionModal} 
        title="Nova Função" 
        label="Nome da Função" 
        placeholder="Ex: Guitarrista, Professor..." 
        value={newFunctionName} 
        onChangeText={setNewFunctionName} 
        loading={savingFunction} 
        onConfirm={handleCreateFunction} 
        onCancel={() => { setShowFunctionModal(false); setNewFunctionName(''); }} 
      />
    </>
  );
}