import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { User, Trash, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Member {
  id: string;
  user_id: string;
  dept_role: string;
  profiles: {
    full_name: string;
    avatar_url?: string | null;
    email?: string | null;
  };
  department_functions: {
    name: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  email?: string;
}

interface Function {
  id: string;
  name: string;
}

export default function MemberListScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<Function[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<Function | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadMembers();
    checkPermissions();
  }, [id]);

  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const adminStatus = profile.org_role === 'admin' || profile.org_role === 'master';
        setIsAdmin(adminStatus);
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
    }
  };

  const loadMembers = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('department_members')
        .select(`
          id,
          user_id,
          dept_role,
          profiles ( full_name, avatar_url, email ),
          department_functions ( name )
        `)
        .eq('department_id', id)
        .order('profiles(full_name)') as any;

      if (error) {
        console.error('Erro ao carregar membros:', error);
        Alert.alert('Erro', 'Não foi possível carregar os membros');
        return;
      }

      if (data) {
        setMembers(data);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProfiles = async () => {
    if (!id) return;

    try {
      // Buscar todos os perfis da organização
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      // Buscar IDs dos membros já no departamento
      const { data: existingMembers } = await supabase
        .from('department_members')
        .select('user_id')
        .eq('department_id', id);

      const existingUserIds = existingMembers?.map(m => m.user_id) || [];

      // Filtrar perfis que ainda não estão no departamento
      const available = allProfiles?.filter(p => !existingUserIds.includes(p.id)) || [];
      setAvailableProfiles(available);
    } catch (error) {
      console.error('Erro ao carregar perfis disponíveis:', error);
    }
  };

  const loadAvailableFunctions = async () => {
    if (!id) return;

    try {
      const { data } = await supabase
        .from('department_functions')
        .select('id, name')
        .eq('department_id', id)
        .order('name');

      if (data) {
        setAvailableFunctions(data);
      }
    } catch (error) {
      console.error('Erro ao carregar funções disponíveis:', error);
    }
  };

  const openAddModal = async () => {
    setModalMode('add');
    setSelectedMember(null);
    setSelectedProfile(null);
    setSelectedFunction(null);
    setSearchText(''); // Limpar pesquisa
    await loadAvailableProfiles();
    await loadAvailableFunctions();
    setShowModal(true);
  };

  const openEditModal = async (member: Member) => {
    setModalMode('edit');
    setSelectedMember(member);
    setSelectedProfile(null); // Bloqueado no modo edit
    setSearchText(''); // Limpar pesquisa
    await loadAvailableFunctions();
    // Encontrar a função atual do membro
    const currentFunction = availableFunctions.find(f => f.name === member.department_functions?.name);
    setSelectedFunction(currentFunction || null);
    setShowModal(true);
  };

  const handleSaveMember = async () => {
    if (!selectedFunction) {
      Alert.alert('Erro', 'Selecione uma função');
      return;
    }

    if (modalMode === 'add' && !selectedProfile) {
      Alert.alert('Erro', 'Selecione uma pessoa');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'add') {
        // Adicionar novo membro
        const { error } = await supabase
          .from('department_members')
          .insert({
            department_id: id,
            user_id: selectedProfile!.id,
            function_id: selectedFunction.id,
            dept_role: 'member'
          });

        if (error) {
          Alert.alert('Erro', 'Não foi possível adicionar o membro');
          return;
        }

        Alert.alert('Sucesso', 'Membro adicionado com sucesso!');
      } else {
        // Editar função do membro existente
        const { error } = await supabase
          .from('department_members')
          .update({
            function_id: selectedFunction.id
          })
          .eq('id', selectedMember!.id);

        if (error) {
          Alert.alert('Erro', 'Não foi possível atualizar a função');
          return;
        }

        Alert.alert('Sucesso', 'Função atualizada com sucesso!');
      }

      setShowModal(false);
      await loadMembers();
    } catch (error) {
      console.error('Erro ao salvar membro:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      'Remover Membro',
      `Tem certeza que deseja remover '${memberName}' do departamento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('department_members')
                .delete()
                .eq('id', memberId);

              if (error) {
                Alert.alert('Erro', 'Não foi possível remover o membro');
                return;
              }

              Alert.alert('Sucesso', 'Membro removido com sucesso!');
              await loadMembers();
            } catch (error) {
              console.error('Erro ao remover membro:', error);
              Alert.alert('Erro', 'Ocorreu um erro inesperado');
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item }: { item: Member }) => (
    <View className="bg-white rounded-xl shadow-sm border border-gray-200 mx-4 mb-3">
      <TouchableOpacity
        onPress={() => isAdmin && openEditModal(item)}
        className="flex-row items-center justify-between p-4"
        disabled={!isAdmin}
      >
        <View className="flex-row items-center flex-1">
          {item.profiles?.avatar_url ? (
            <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
              <Text className="text-blue-600 font-semibold text-lg">
                {item.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          ) : (
            <View className="w-12 h-12 rounded-full bg-gray-200 items-center justify-center mr-3">
              <User size={20} color="#6b7280" />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-gray-900 font-semibold text-base">
              {item.profiles?.full_name || 'Usuário sem nome'}
            </Text>
            <Text className="text-gray-500 text-sm mt-1">
              {item.department_functions?.name || 'Sem função definida'}
            </Text>
          </View>
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteMember(item.id, item.profiles?.full_name || 'Usuário');
            }}
            className="p-2 ml-2"
          >
            <Trash size={16} color="#ef4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-2">Carregando membros...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {members.length > 0 ? (
        <FlatList
          data={members}
          renderItem={renderMember}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <User size={48} color="#9ca3af" />
          <Text className="text-gray-500 mt-4 text-center text-lg">
            Nenhum membro encontrado neste departamento
          </Text>
          <Text className="text-gray-400 text-sm mt-2 text-center">
            Os membros aparecerão aqui quando forem adicionados
          </Text>
        </View>
      )}

      {/* Botão flutuante de adicionar membro */}
      {isAdmin && (
        <TouchableOpacity
          onPress={openAddModal}
          className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* Modal de gestão de membros */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end ">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                {modalMode === 'add' ? 'Adicionar Membro' : 'Editar Função'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
              >
                <Text className="text-gray-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Campo de Pessoa (apenas no modo add) */}
            {modalMode === 'add' && (
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Pessoa</Text>
                
                {/* Campo de Pesquisa */}
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="🔍 Pesquisar por nome..."
                  className="bg-gray-100 rounded-lg px-4 py-3 mb-3 text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
                
                <View className="bg-gray-50 rounded-xl p-3 max-h-64">
                  <FlatList
                    data={availableProfiles.filter(profile => 
                      profile.full_name.toLowerCase().includes(searchText.toLowerCase())
                    )}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => setSelectedProfile(item)}
                        className={`p-3 rounded-lg mb-2 ${
                          selectedProfile?.id === item.id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <Text className="text-gray-900 font-medium">
                          {item.full_name}
                        </Text>
                        {item.email && (
                          <Text className="text-gray-500 text-sm">
                            {item.email}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </View>
            )}
           
            {/* Campo de Função */}
           {
            availableFunctions.length > 0 && (
               <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Função</Text>
              <View className="bg-gray-50 rounded-xl p-3 max-h-32">
                <FlatList
                  data={availableFunctions}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => setSelectedFunction(item)}
                      className={`p-3 rounded-lg mb-2 ${
                        selectedFunction?.id === item.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <Text className="text-gray-900 font-medium">
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
            )
           }

            {/* Botões de ação */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setSearchText(''); // Limpar pesquisa ao fechar
                }}
                className="flex-1 bg-gray-100 rounded-xl py-4 px-6"
              >
                <Text className="text-gray-700 font-semibold text-center">Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveMember}
                disabled={saving}
                className="flex-1 bg-blue-600 rounded-xl py-4 px-6"
                style={{ opacity: saving ? 0.5 : 1 }}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-center">
                    {modalMode === 'add' ? 'Adicionar' : 'Salvar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

MemberListScreen.options = {
  title: 'Membros do Departamento',
  headerStyle: {
    backgroundColor: '#ffffff',
  },
  headerTintColor: '#3b82f6',
};
