import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, Plus, User, Folder, Briefcase, Trash, Calendar, Shield } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import DepartmentLeadersManager from '../../../components/DepartmentLeadersManager';


export default function DepartmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [department, setDepartment] = useState<any>(null);
  const [parentDepartment, setParentDepartment] = useState<any>(null);
  const [subDepartments, setSubDepartments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [savingFunction, setSavingFunction] = useState(false);
  const [showSubDepartmentModal, setShowSubDepartmentModal] = useState(false);
  const [newSubDepartmentName, setNewSubDepartmentName] = useState('');
  const [savingSubDepartment, setSavingSubDepartment] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showLeadersModal, setShowLeadersModal] = useState(false);

  const fetchFunctions = async (departmentId: string) => {
    const { data: deptFunctions } = await supabase
      .from('department_functions')
      .select('id, name, description')
      .eq('department_id', departmentId)
      .order('name');

    if (deptFunctions) {
      setFunctions(deptFunctions);
    }
  };

  const fetchSubDepartments = async (departmentId: string) => {
    const { data: children } = await supabase
      .from('departments')
      .select('id, name, description, parent_id')
      .eq('parent_id', departmentId)
      .order('name');

    if (children) {
      setSubDepartments(children);
    }
  };

  const fetchParentDepartment = async (parentId: string) => {
    const { data: parent } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', parentId)
      .single();

    if (parent) {
      setParentDepartment(parent);
    }
  };

  // Verificar se é admin e carregar dados
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setDepartment(null);
      setParentDepartment(null);
      setSubDepartments([]);
      setMembers([]);
      setFunctions([]);
      setIsAdmin(false);
      setIsMaster(false);

      if (!id) {
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Verificar se é admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const masterStatus = profile.org_role === 'master';
        const adminStatus = profile.org_role === 'admin' || profile.org_role === 'master';
        setIsMaster(masterStatus);
        setIsAdmin(adminStatus);
      }

      // Buscar detalhes do departamento
      const { data: dept } = await supabase
        .from('departments')
        .select('id, name, description, priority_order, availability_deadline_day, parent_id, organization_id')
        .eq('id', id)
        .single();

      if (dept) {
        setDepartment(dept);

        if (dept.parent_id) {
          await fetchParentDepartment(dept.parent_id);
        } else {
          setParentDepartment(null);
        }
      }

      // Buscar membros do departamento
      await fetchMembers(String(id));

      await fetchSubDepartments(String(id));
      await fetchFunctions(String(id));

      setLoading(false);
    }

    loadData();
  }, [id]);

  const fetchMembers = async (departmentId: string) => {
    const { data: deptMembers } = await supabase
      .from('department_members')
      .select(`
        id,
        user_id,
        dept_role,
        profiles:user_id ( full_name, email, avatar_url ),
        department_functions:function_id ( name )
      `)
      .eq('department_id', departmentId);

    if (deptMembers) {
      setMembers(deptMembers);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remover Membro',
      `Tem certeza que deseja remover '${memberName}' do departamento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('department_members')
              .delete()
              .eq('id', memberId);

            if (error) {
              Alert.alert('Erro', 'Não foi possível remover o membro');
              return;
            }

            await fetchMembers(String(id));
          },
        },
      ]
    );
  };

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
        await fetchFunctions(String(id));
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado');
    } finally {
      setSavingFunction(false);
    }
  };

  const handleCreateSubDepartment = async () => {
    if (!newSubDepartmentName.trim() || !id) {
      Alert.alert('Erro', 'Por favor, preencha o nome do sub-departamento');
      return;
    }

    if (!department?.organization_id) {
      Alert.alert('Erro', 'Não foi possível identificar a organização do departamento atual');
      return;
    }

    setSavingSubDepartment(true);
    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          name: newSubDepartmentName.trim(),
          parent_id: String(id),
          organization_id: department.organization_id,
          availability_deadline_day: department.availability_deadline_day || 20,
          priority_order: 99,
        });

      if (error) {
        Alert.alert('Erro ao criar sub-departamento', error.message);
      } else {
        Alert.alert('Sucesso!', 'Sub-departamento criado com sucesso.');
        setShowSubDepartmentModal(false);
        setNewSubDepartmentName('');
        await fetchSubDepartments(String(id));
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado');
    } finally {
      setSavingSubDepartment(false);
    }
  };

  const handleDeleteSubDepartment = (subDeptId: string, subDeptName: string) => {
    Alert.alert(
      'Excluir Sub-departamento',
      'Excluir Sub-departamento? Isso removerá membros e escalas vinculados a ele.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('departments')
              .delete()
              .eq('id', subDeptId);

            if (error) {
              Alert.alert(
                'Não foi possível excluir',
                'Verifique se há membros ou escalas ativas vinculadas a este sub-departamento.'
              );
              return;
            }

            // Atualização instantânea para feedback visual
            setSubDepartments((prev) => prev.filter((sub) => sub.id !== subDeptId));
            
            // Recarregar do servidor para garantir sincronia
            await fetchSubDepartments(String(id));
          },
        },
      ]
    );
  };

  const handleDeleteFunction = (funcId: string, funcName: string) => {
    Alert.alert(
      'Excluir Função',
      'Excluir Função?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('department_functions')
              .delete()
              .eq('id', funcId);

            if (error) {
              Alert.alert(
                'Não foi possível excluir',
                'Verifique se há escalas ou membros vinculados a esta função.'
              );
              return;
            }

            // Atualização instantânea para feedback visual
            setFunctions((prev) => prev.filter((func) => func.id !== funcId));
            
            // Recarregar do servidor para garantir sincronia
            await fetchFunctions(String(id));
          },
        },
      ]
    );
  };

  const handleDeleteDepartment = () => {
    if (!id) return;

    Alert.alert(
      'Apagar departamento',
      'Tem certeza que deseja apagar este departamento? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            setDeletingDepartment(true);
            try {
              const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', String(id));

              if (error) {
                Alert.alert('Erro ao apagar departamento', error.message);
                return;
              }

              Alert.alert('Sucesso!', 'Departamento apagado com sucesso.');
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)/departments');
              }
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Ocorreu um erro inesperado');
            } finally {
              setDeletingDepartment(false);
            }
          },
        },
      ]
    );
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
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)/departments');
              }
            }}
            className="mr-4"
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">{department.name}</Text>
            {department.description && (
              <Text className="text-gray-600 text-sm mt-1">{department.description}</Text>
            )}
            {department.parent_id && parentDepartment?.name && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/departments/[id]',
                    params: { id: parentDepartment.id }
                  })
                }
                className="flex-row items-center mt-1"
              >
                <Text className="text-gray-500 text-sm">{parentDepartment.name}</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* Botões de ação */}
          <View className="flex-row gap-2">
            {(isAdmin || isMaster) && (
              <TouchableOpacity
               onPress={() => setShowLeadersModal(true)}
                className="bg-amber-600 rounded-lg px-3 py-2 flex-row items-center"
              >
                <Shield size={16} color="white" style={{ marginRight: 4 }} />
                <Text className="text-white font-semibold text-sm">Liderança</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/departments/roster',
                params: {
                  departmentId: String(id),
                  departmentName: department.name
                }
              })}
              className="bg-blue-600 rounded-lg px-3 py-2 flex-row items-center"
            >
              <Calendar size={16} color="white" style={{ marginRight: 4 }} />
              <Text className="text-white font-semibold text-sm">Gerenciar Escala</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-4">
          {/* Sub-departamentos */}
          {(subDepartments.length > 0 || isAdmin) && (
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Folder size={20} color="#4f46e5" style={{ marginRight: 8 }} />
                  <Text className="text-lg font-semibold text-gray-900">Sub-departamentos</Text>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => setShowSubDepartmentModal(true)}
                    className="bg-indigo-600 rounded-lg px-3 py-1.5 flex-row items-center"
                  >
                    <Plus size={16} color="white" style={{ marginRight: 4 }} />
                    <Text className="text-white font-semibold text-xs">Criar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {subDepartments.length > 0 ? (
                <View>
                  {subDepartments.map((child, index) => (
                    <View
                      key={child.id}
                      className={`bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex-row items-center ${index !== subDepartments.length - 1 ? 'mb-3' : ''}`}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/departments/[id]',
                            params: { id: String(child.id) },
                          })
                        }
                        className="flex-1 flex-row items-center"
                      >
                        <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
                          <Folder size={20} color="#4f46e5" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-gray-900 font-semibold">{child.name}</Text>
                          {child.description && (
                            <Text className="text-indigo-700 text-sm mt-1">{child.description}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      {isMaster && (
                        <TouchableOpacity
                          onPress={() => handleDeleteSubDepartment(String(child.id), String(child.name))}
                        className="p-2 ml-2"
                      >
                        <Trash size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-6 items-center border border-gray-200">
                <Folder size={32} color="#9ca3af" />
                <Text className="text-gray-500 mt-2">Nenhum sub-departamento encontrado</Text>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => setShowSubDepartmentModal(true)}
                    className="mt-4 bg-indigo-600 rounded-lg px-4 py-2"
                  >
                    <Text className="text-white font-semibold text-sm">Criar sub-departamento</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
          )}

          {/* Membros do Departamento */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => router.push({
                pathname: '/(tabs)/departments/member-list',
                params: { id: String(id), name: department?.name || 'Departamento' }
              })}
              className="flex-row items-center justify-between mb-4"
            >
              <View className="flex-row items-center">
                <Users size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-lg font-semibold text-gray-900">Membros</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 text-sm mr-2">{members.length} membro(s)</Text>
                <Text className="text-blue-600 text-sm">Ver Lista Completa →</Text>
              </View>
            </TouchableOpacity>

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

          {/* Funções */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Briefcase size={20} color="#3b82f6" style={{ marginRight: 8 }} />
                <Text className="text-lg font-semibold text-gray-900">Funções</Text>
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
                    <View className="flex-row items-center">
                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium">{func.name}</Text>
                        {func.description && (
                          <Text className="text-gray-500 text-sm mt-1">{func.description}</Text>
                        )}
                      </View>
                      {isAdmin && (
                        <TouchableOpacity
                          onPress={() => handleDeleteFunction(String(func.id), String(func.name))}
                          className="p-2 ml-2"
                        >
                          <Trash size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-white rounded-xl p-6 items-center border border-gray-200">
                <Briefcase size={32} color="#9ca3af" />
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

      {/* Modal para criar novo sub-departamento */}
      <Modal
        visible={showSubDepartmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubDepartmentModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Novo Sub-departamento</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSubDepartmentModal(false);
                  setNewSubDepartmentName('');
                }}
              >
                <Text className="text-gray-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Nome do Sub-departamento
              </Text>
              <TextInput
                className="bg-gray-50 rounded-lg border border-gray-200 px-4 py-3 text-gray-900 text-base"
                placeholder="Ex: Louvor, Infantil, Administrativo..."
                placeholderTextColor="#9ca3af"
                value={newSubDepartmentName}
                onChangeText={setNewSubDepartmentName}
                editable={!savingSubDepartment}
              />
            </View>

            <TouchableOpacity
              onPress={handleCreateSubDepartment}
              disabled={savingSubDepartment || !newSubDepartmentName.trim()}
              className="bg-indigo-600 rounded-lg py-4 px-6 mb-3"
              style={{ opacity: savingSubDepartment || !newSubDepartmentName.trim() ? 0.5 : 1 }}
            >
              {savingSubDepartment ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-center">Criar Sub-departamento</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowSubDepartmentModal(false);
                setNewSubDepartmentName('');
              }}
              className="bg-gray-100 rounded-lg py-4 px-6"
            >
              <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      {/* Modal para visualizar membros */}
      <Modal
        visible={showMembersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-gray-900">Membros do Departamento</Text>
              <TouchableOpacity
                onPress={() => setShowMembersModal(false)}
              >
                <Text className="text-gray-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              {members.length > 0 ? (
                <View className="flex-1">
                  {members.map((member) => (
                    <View
                      key={member.id}
                      className="flex-row items-center justify-between p-4 border-b border-gray-100"
                    >
                      <View className="flex-row items-center flex-1">
                        {member.profiles?.avatar_url ? (
                          <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                            <Text className="text-blue-600 font-semibold text-lg">
                              {member.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                            </Text>
                          </View>
                        ) : (
                          <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center mr-3">
                            <User size={20} color="#6b7280" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-gray-900 font-semibold">
                            {member.profiles?.full_name || 'Usuário sem nome'}
                          </Text>
                          <Text className="text-gray-500 text-sm">
                            {member.department_functions?.name || 'Sem função definida'}
                          </Text>
                        </View>
                      </View>
                      {isMaster && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member.id, member.profiles?.full_name || 'Usuário')}
                          className="p-2"
                        >
                          <Trash size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View className="flex-1 items-center justify-center py-8">
                  <User size={48} color="#9ca3af" />
                  <Text className="text-gray-500 mt-4 text-center">
                    Nenhum membro encontrado neste departamento
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Modal de Gestão de Líderes */}
      <DepartmentLeadersManager
        departmentId={String(id)}
        visible={showLeadersModal}
        onClose={() => setShowLeadersModal(false)}
      />
    </>
  );
}
