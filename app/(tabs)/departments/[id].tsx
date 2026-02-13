import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Plus, User, Folder, Briefcase, Trash, Calendar, Shield, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind';

export default function DepartmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';
  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';

  const [department, setDepartment] = useState<any>(null);
  const [parentDepartment, setParentDepartment] = useState<any>(null);
  const [subDepartments, setSubDepartments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Modais de Criação
  const [showModal, setShowModal] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [savingFunction, setSavingFunction] = useState(false);
  const [showSubDepartmentModal, setShowSubDepartmentModal] = useState(false);
  const [newSubDepartmentName, setNewSubDepartmentName] = useState('');
  const [savingSubDepartment, setSavingSubDepartment] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // --- NOVO: ESTADO DO MODAL DE CONFIRMAÇÃO ---
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: async () => {},
    isDestructive: false,
    loading: false
  });

  // Função auxiliar para abrir o modal de confirmação
  const requestConfirmation = (title: string, message: string, onConfirm: () => Promise<void>, isDestructive = false) => {
    setConfirmConfig({
      title,
      message,
      onConfirm,
      isDestructive,
      loading: false
    });
    setConfirmModalVisible(true);
  };

const handleConfirmAction = async () => {
    // 1. Ativa loading
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    
    try {
      // 2. Tenta executar a ação
      await confirmConfig.onConfirm();
      // 3. Se deu certo, fecha o modal
      setConfirmModalVisible(false);
    } catch (error: any) {
      console.error('Erro na confirmação:', error);
      // 4. Mostra alerta se der erro
      Alert.alert('Erro', error.message || 'Não foi possível completar a ação.');
    } finally {
      // 5. Desativa loading
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };
  // ---------------------------------------------

  const fetchFunctions = async (departmentId: string) => {
    const { data: deptFunctions } = await supabase
      .from('department_functions')
      .select('id, name, description')
      .eq('department_id', departmentId)
      .order('name');
    if (deptFunctions) setFunctions(deptFunctions);
  };

  const fetchSubDepartments = async (departmentId: string) => {
    const { data: children } = await supabase
      .from('departments')
      .select('id, name, description, parent_id')
      .eq('parent_id', departmentId)
      .order('name');
    if (children) setSubDepartments(children);
  };

  const fetchParentDepartment = async (parentId: string) => {
    const { data: parent } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', parentId)
      .single();
    if (parent) setParentDepartment(parent);
  };

  const fetchMembers = async (departmentId: string) => {
    const { data: deptMembers } = await supabase
      .from('department_members')
      .select(`
        id, user_id, dept_role,
        profiles:user_id ( full_name, email, avatar_url ),
        department_functions:function_id ( name )
      `)
      .eq('department_id', departmentId);
    if (deptMembers) setMembers(deptMembers);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      if (!id) { setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const masterStatus = profile.org_role === 'master';
        setIsMaster(masterStatus);
        setIsAdmin(profile.org_role === 'admin' || masterStatus);
      }

      const { data: leaderCheck } = await supabase
        .from('department_leaders')
        .select('id')
        .eq('department_id', id)
        .eq('user_id', user.id)
        .single();
      
      if (leaderCheck) setIsLeader(true);

      const { data: dept } = await supabase
        .from('departments')
        .select('id, name, description, priority_order, availability_deadline_day, parent_id, organization_id')
        .eq('id', id)
        .single();

      if (dept) {
        setDepartment(dept);
        if (dept.parent_id) await fetchParentDepartment(dept.parent_id);
      }

      await fetchMembers(String(id));
      await fetchSubDepartments(String(id));
      await fetchFunctions(String(id));
      setLoading(false);
    }
    loadData();
  }, [id]);

  // --- AÇÕES COM O NOVO MODAL ---

const handleRemoveMember = (memberId: string, memberName: string) => {
    requestConfirmation(
      'Remover Membro',
      `ATENÇÃO: '${memberName}' possui escalas agendadas.\n\nAo remover este membro, TODAS as escalas futuras e passadas dele neste departamento também serão apagadas.\n\nDeseja continuar?`,
      async () => {
        // 1. Primeiro: Apagar as escalas (rosters) desse membro
        // Isso resolve o erro de Foreign Key (23503)
        const { error: rosterError } = await supabase
          .from('rosters')
          .delete()
          .eq('member_id', memberId);

        if (rosterError) {
            console.error('Erro ao limpar escalas:', rosterError);
            throw new Error('Falha ao limpar as escalas do membro.');
        }

        // 2. Segundo: Agora sim, apagar o membro
        const { error } = await supabase
          .from('department_members')
          .delete()
          .eq('id', memberId);

        if (error) throw error;

        // 3. Atualizar a tela instantaneamente
        setMembers(prevMembers => prevMembers.filter(m => m.id !== memberId));
      },
      true // Botão vermelho (Destrutivo)
    );
  };

  const handleDeleteSubDepartment = (subDeptId: string, subDeptName: string) => {
    requestConfirmation(
      'Excluir Sub-departamento',
      `Ao excluir '${subDeptName}', você removerá todos os vínculos de membros e escalas associados.`,
      async () => {
        const { error } = await supabase.from('departments').delete().eq('id', subDeptId);
        if (error) Alert.alert('Erro', 'Verifique se há dependências antes de excluir.');
        else {
          setSubDepartments((prev) => prev.filter((sub) => sub.id !== subDeptId));
          await fetchSubDepartments(String(id));
        }
      },
      true
    );
  };

const handleDeleteFunction = (funcId: string, funcName: string) => {
    requestConfirmation(
      'Excluir Função',
      `Deseja excluir a função '${funcName}' permanentemente?`,
      async () => {
        const { error } = await supabase
          .from('department_functions')
          .delete()
          .eq('id', funcId);

        if (error) throw error;

        // Atualiza a tela na hora
        setFunctions(prev => prev.filter(f => f.id !== funcId));
      },
      true
    );
  };

  // const handleDeleteDepartment = () => {
  // //   if (!id) return;
  // //   requestConfirmation(
  // //     'Apagar Departamento',
  // //     'Tem certeza absoluta? Esta ação apagará o departamento e todos os seus dados. Não pode ser desfeita.',
  // //     async () => {
  // //       setDeletingDepartment(true);
  // //       try {
  // //           const { error } = await supabase.from('departments').delete().eq('id', String(id));
  // //           if (error) throw error;
  // //           if (router.canGoBack()) router.back();
  // //           else router.push('/(tabs)/departments');
  // //       } catch (error: any) {
  // //           Alert.alert('Erro', error.message);
  // //       } finally {
  // //           setDeletingDepartment(false);
  // //       }
  // //     },
  // //     true
  // //   );
  // // };

  // --- CRIAÇÃO ---

  const handleCreateFunction = async () => {
    if (!newFunctionName.trim() || !id) return Alert.alert('Erro', 'Preencha o nome');
    setSavingFunction(true);
    try {
      const { error } = await supabase.from('department_functions').insert({
        department_id: id,
        name: newFunctionName.trim(),
      });
      if (error) throw error;
      setShowModal(false);
      setNewFunctionName('');
      await fetchFunctions(String(id));
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setSavingFunction(false);
    }
  };

  const handleCreateSubDepartment = async () => {
    if (!newSubDepartmentName.trim() || !id) return Alert.alert('Erro', 'Preencha o nome');
    setSavingSubDepartment(true);
    try {
      const { error } = await supabase.from('departments').insert({
        name: newSubDepartmentName.trim(),
        parent_id: String(id),
        organization_id: department.organization_id,
        availability_deadline_day: department.availability_deadline_day || 20,
        priority_order: 99,
      });
      if (error) throw error;
      setShowSubDepartmentModal(false);
      setNewSubDepartmentName('');
      await fetchSubDepartments(String(id));
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setSavingSubDepartment(false);
    }
  };

  if (loading) return <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center"><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (!department) return <View className="flex-1 items-center justify-center"><Text>Não encontrado</Text></View>;

  return (
    <>
      <ScrollView className="flex-1 bg-gray-50 dark:bg-zinc-950">
        {/* Header */}
        <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex-row items-center">
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/(tabs)/departments')} className="mr-4">
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
          
          {/* Ações Rápidas */}
          {(isAdmin || isMaster || isLeader) && (
            <View className="mb-6 flex-row gap-3">
              {(isAdmin || isMaster) && (
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/department-leaders', params: { departmentId: String(id), departmentName: department?.name } })}
                  className="flex-1 bg-amber-600 rounded-xl px-4 py-3 flex-row items-center justify-center shadow-sm active:bg-amber-700"
                >
                  <Shield size={20} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-bold">Liderança</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={() => router.push({ pathname: '/department-roster', params: { departmentId: String(id), departmentName: department.name } })}
                className="flex-1 bg-blue-600 rounded-xl px-4 py-3 flex-row items-center justify-center shadow-sm active:bg-blue-700"
              >
                <Calendar size={20} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-bold">Escala</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sub-departamentos */}
          {(subDepartments.length > 0 || isAdmin) && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Folder size={20} color="#4f46e5" style={{ marginRight: 8 }} />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Sub-departamentos</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity onPress={() => setShowSubDepartmentModal(true)} className="bg-indigo-600 rounded-lg px-3 py-1.5 flex-row items-center">
                    <Plus size={16} color="white" style={{ marginRight: 4 }} />
                    <Text className="text-white font-semibold text-xs">Criar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {subDepartments.length > 0 ? (
                <View>
                  {subDepartments.map((child, index) => (
                    <View key={child.id} className={`bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 flex-row items-center ${index !== subDepartments.length - 1 ? 'mb-3' : ''}`}>
                      <TouchableOpacity className="flex-1 flex-row items-center" onPress={() => router.push({ pathname: '/departments/[id]', params: { id: String(child.id) } })}>
                        <View className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mr-3">
                            <Folder size={20} color="#4f46e5" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 dark:text-zinc-100 font-semibold">{child.name}</Text>
                            {child.description && <Text className="text-indigo-700 dark:text-indigo-300 text-sm">{child.description}</Text>}
                        </View>
                      </TouchableOpacity>
                      {isMaster && (
                        <TouchableOpacity onPress={() => handleDeleteSubDepartment(String(child.id), String(child.name))} className="p-2 ml-2">
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
                  {isAdmin && <TouchableOpacity onPress={() => setShowSubDepartmentModal(true)} className="mt-4 bg-indigo-600 rounded-lg px-4 py-2"><Text className="text-white font-semibold text-sm">Criar</Text></TouchableOpacity>}
                </View>
              )}
            </View>
          )}

          {/* Membros */}
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
                        <TouchableOpacity onPress={() => handleRemoveMember(String(member.id), member.profiles?.full_name || 'Membro')} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
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

          {/* Funções */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Briefcase size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100">Funções</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity onPress={() => setShowModal(true)} className="bg-blue-600 rounded-lg px-3 py-1.5 flex-row items-center">
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
                        <TouchableOpacity onPress={() => handleDeleteFunction(String(func.id), String(func.name))} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
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
                {isAdmin && <TouchableOpacity onPress={() => setShowModal(true)} className="mt-4 bg-blue-600 rounded-lg px-4 py-2"><Text className="text-white font-semibold text-sm">Criar</Text></TouchableOpacity>}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* --- MODAL DE CONFIRMAÇÃO GENÉRICO --- */}
      <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
            <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
                <View className="items-center mb-4">
                    <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${confirmConfig.isDestructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                        {confirmConfig.isDestructive ? (
                            <AlertTriangle size={24} color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} />
                        ) : (
                            <Shield size={24} color={colorScheme === 'dark' ? '#3b82f6' : '#2563eb'} />
                        )}
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
                        onPress={handleConfirmAction}
                        className={`flex-1 py-3 rounded-xl flex-row justify-center items-center ${confirmConfig.isDestructive ? 'bg-red-600' : 'bg-blue-600'}`}
                        disabled={confirmConfig.loading}
                    >
                        {confirmConfig.loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-center">
                                {confirmConfig.isDestructive ? 'Excluir' : 'Confirmar'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
      {/* ------------------------------------- */}

      {/* Outros Modais (Criação) */}
      <Modal visible={showSubDepartmentModal} transparent animationType="slide" onRequestClose={() => setShowSubDepartmentModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6">
            <View className="flex-row justify-between mb-4"><Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Novo Sub-departamento</Text><TouchableOpacity onPress={() => setShowSubDepartmentModal(false)}><Text className="text-gray-500 text-lg">✕</Text></TouchableOpacity></View>
            <TextInput className="bg-gray-50 dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 mb-4" placeholder="Nome" placeholderTextColor={placeholderColor} value={newSubDepartmentName} onChangeText={setNewSubDepartmentName} />
            <TouchableOpacity onPress={handleCreateSubDepartment} className="bg-indigo-600 rounded-lg py-4 mb-3"><Text className="text-white text-center font-bold">Criar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6">
            <View className="flex-row justify-between mb-4"><Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Nova Função</Text><TouchableOpacity onPress={() => setShowModal(false)}><Text className="text-gray-500 text-lg">✕</Text></TouchableOpacity></View>
            <TextInput className="bg-gray-50 dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-700 px-4 py-3 text-gray-900 dark:text-zinc-100 mb-4" placeholder="Nome da Função" placeholderTextColor={placeholderColor} value={newFunctionName} onChangeText={setNewFunctionName} />
            <TouchableOpacity onPress={handleCreateFunction} className="bg-blue-600 rounded-lg py-4 mb-3"><Text className="text-white text-center font-bold">Criar</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}