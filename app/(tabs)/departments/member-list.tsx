import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Trash, Plus, ShieldCheck, ArrowLeft, X, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind';

interface Member {
  id: string;
  user_id: string;
  dept_role: string;
  profiles: {
    full_name: string;
    avatar_url?: string | null;
    email?: string | null;
  };
  member_functions?: {
    department_functions: {
      id: string;
      name: string;
    };
  }[];
}

interface Profile {
  id: string;
  full_name: string;
  email?: string;
}

interface FunctionItem {
  id: string;
  name: string;
}

export default function MemberListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; name: string }>();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';
  
  const [members, setMembers] = useState<Member[]>([]);
  // NOVO: Estado para guardar quem são os líderes deste departamento
  const [departmentLeaders, setDepartmentLeaders] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  
  // Estados do Modal de Adição
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add_member' | 'add_function'>('add_member');
  
  // Estados do Modal de Confirmação (Exclusão)
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: async () => {},
    isDestructive: false,
    loading: false
  });

  // Seleções para Adição
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<FunctionItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<FunctionItem | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    loadMembers();
    checkPermissions();
    loadAvailableFunctions();
  }, [id]);

  // --- CONFIGURAÇÃO DO MODAL DE CONFIRMAÇÃO ---
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
      console.error('Erro na ação:', error);
      Alert.alert('Erro', error.message || 'Falha ao executar ação.');
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  // --- PERMISSÕES (AGORA USA A TABELA CORRETA) ---
  const checkPermissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_role')
        .eq('user_id', user.id)
        .single();

      const isGlobalAdmin = profile?.org_role === 'admin' || profile?.org_role === 'master';

      // Busca na tabela de líderes reais que o Master configurou
      const { data: leaderRecord } = await supabase
        .from('department_leaders')
        .select('id')
        .eq('user_id', user.id)
        .eq('department_id', id)
        .maybeSingle();

      const isDeptLeader = !!leaderRecord; // Se encontrou registro, é líder
      setCanEdit(isGlobalAdmin || isDeptLeader);

    } catch (error) {
      console.error(error);
    }
  };

  // --- CARREGAR DADOS (AGORA ORDENA PELOS LÍDERES REAIS) ---
  const loadMembers = async () => {
    if (!id) return;
    try {
      // 1. Primeiro descobre quem são os líderes
      const { data: leadersData } = await supabase
        .from('department_leaders')
        .select('user_id')
        .eq('department_id', id);

      const leaderIds = leadersData?.map(l => l.user_id) || [];
      setDepartmentLeaders(leaderIds);

      // 2. Busca os membros normais
      const { data, error } = await supabase
        .from('department_members')
        .select(`
          id, user_id, dept_role,
          profiles ( full_name, avatar_url, email ),
          member_functions (
            department_functions ( id, name )
          )
        `)
        .eq('department_id', id);

      if (error) throw error;

      if (data) {
        // Ordena colocando os líderes reais no topo
        const sorted = (data as any).sort((a: any, b: any) => {
             const aIsLeader = leaderIds.includes(a.user_id);
             const bIsLeader = leaderIds.includes(b.user_id);
             
             if (aIsLeader && !bIsLeader) return -1;
             if (!aIsLeader && bIsLeader) return 1;
             return (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '');
        });
        setMembers(sorted);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableProfiles = async () => {
    if (!id) return;
    try {
      const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
      const { data: existing } = await supabase.from('department_members').select('user_id').eq('department_id', id);
      const existingIds = existing?.map(m => m.user_id) || [];
      setAvailableProfiles(allProfiles?.filter(p => !existingIds.includes(p.id)) || []);
    } catch (e) { console.error(e); }
  };

  const loadAvailableFunctions = async () => {
    if (!id) return;
    try {
      const { data } = await supabase.from('department_functions').select('id, name').eq('department_id', id).order('name');
      setAvailableFunctions(data || []);
    } catch (e) { console.error(e); }
  };

  // --- AÇÕES DO MODAL DE ADIÇÃO ---
  const openAddMemberModal = async () => {
    setModalMode('add_member');
    setSelectedMemberId(null);
    setSelectedProfile(null);
    setSelectedFunction(null);
    setSearchText('');
    await loadAvailableProfiles();
    setShowModal(true);
  };

  const openAddFunctionModal = (member: Member) => {
    setModalMode('add_function');
    setSelectedMemberId(member.id);
    setSelectedProfile({ id: member.user_id, full_name: member.profiles.full_name });
    setSelectedFunction(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedFunction) return Alert.alert('Erro', 'Selecione uma função');
    
    setSaving(true);
    try {
      if (modalMode === 'add_member') {
        if (!selectedProfile) return Alert.alert('Erro', 'Selecione uma pessoa');

        const { data: newMember, error: memError } = await supabase
          .from('department_members')
          .insert({ department_id: id, user_id: selectedProfile.id, dept_role: 'member' })
          .select()
          .single();

        if (memError) throw memError;

        const { error: funcError } = await supabase
          .from('member_functions')
          .insert({ member_id: newMember.id, function_id: selectedFunction.id });

        if (funcError) throw funcError;

      } else {
        if (!selectedMemberId) return;

        const { error } = await supabase
          .from('member_functions')
          .insert({ member_id: selectedMemberId, function_id: selectedFunction.id });

        if (error) {
           if (error.code === '23505') Alert.alert('Aviso', 'Este membro já possui essa função.');
           else throw error;
        } 
      }

      setShowModal(false);
      await loadMembers(); // Recarrega para mostrar a mudança
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- DELETAR (USANDO O NOVO MODAL) ---
  const handleDeleteMember = (memberId: string) => {
    requestConfirmation(
      'Remover Membro',
      'Tem certeza que deseja remover este membro? Todas as escalas futuras dele serão apagadas.',
      async () => {
        await supabase.from('rosters').delete().eq('member_id', memberId);
        await supabase.from('member_functions').delete().eq('member_id', memberId);
        const { error } = await supabase.from('department_members').delete().eq('id', memberId);
        if (error) throw error;
        setMembers(prev => prev.filter(m => m.id !== memberId));
      },
      true
    );
  };

  const handleRemoveFunction = (memberId: string, functionId: string) => {
    requestConfirmation(
        'Remover Função',
        'Deseja remover esta função do membro?',
        async () => {
            const { error } = await supabase
                .from('member_functions')
                .delete()
                .eq('member_id', memberId)
                .eq('function_id', functionId);
            
            if (error) throw error;
            await loadMembers();
        },
        true
    );
  };

  // --- RENDERIZAÇÃO ---
  const filteredProfiles = availableProfiles.filter(p => 
    p.full_name.toLowerCase().includes(searchText.toLowerCase())
  );

  const getFunctionsToShow = () => {
      if (modalMode === 'add_function' && selectedMemberId) {
          const member = members.find(m => m.id === selectedMemberId);
          if (!member) return availableFunctions;
          
          return availableFunctions.filter(f => 
             !member.member_functions?.some(mf => mf.department_functions.id === f.id)
          );
      }
      return availableFunctions;
  };

  const functionsToShow = getFunctionsToShow();

  const renderMember = ({ item }: { item: Member }) => {
    const functionsList = item.member_functions?.map(mf => mf.department_functions) || [];
    const hasMoreFunctions = functionsList.length < availableFunctions.length;
    
    // VERIFICA SE ESTE USUÁRIO ESTÁ NA LISTA DE LÍDERES
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
                
                {/* SELO DE LÍDER DINÂMICO */}
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
                <TouchableOpacity onPress={() => openAddFunctionModal(item)} className="bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 border-dashed">
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
      
      {/* HEADER CORRIGIDO COM NAVEGAÇÃO SEGURA */}
      <View className="bg-white dark:bg-zinc-900 px-4 pt-12 pb-4 border-b border-gray-200 dark:border-zinc-800 flex-row items-center">
        <TouchableOpacity 
          onPress={() => {
              router.push({
                  pathname: '/(tabs)/departments/[id]',
                  params: { id: id }
              });
          }} 
          className="mr-3 p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg"
        >
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
        <TouchableOpacity 
          onPress={openAddMemberModal} 
          className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      )}

      {/* MODAL DE ADIÇÃO/EDIÇÃO */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 h-[80%]">
            
            <View className="flex-row justify-between items-center mb-6">
                <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                {modalMode === 'add_member' ? 'Adicionar Novo Membro' : `Adicionar Função`}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                    <X size={24} color="#9ca3af" />
                </TouchableOpacity>
            </View>

            {/* SEÇÃO 1: BUSCAR USUÁRIO */}
            {modalMode === 'add_member' && (
                <View className="mb-6">
                    <Text className="mb-2 font-bold text-gray-700 dark:text-zinc-300">1. Selecione a Pessoa</Text>
                    <TextInput
                        value={searchText}
                        onChangeText={setSearchText}
                        placeholder="Buscar por nome..."
                        placeholderTextColor={colorScheme === 'dark' ? '#52525b' : '#9ca3af'}
                        className="border border-gray-300 dark:border-zinc-700 rounded-lg p-3 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 mb-2"
                    />
                    
                    <View className="h-40 border border-gray-100 dark:border-zinc-800 rounded-lg bg-gray-50 dark:bg-zinc-900/50">
                        <FlatList 
                            data={filteredProfiles} 
                            keyExtractor={i => i.id}
                            renderItem={({item}) => (
                            <TouchableOpacity 
                                onPress={() => setSelectedProfile(item)} 
                                className={`p-3 border-b border-gray-100 dark:border-zinc-800 ${
                                selectedProfile?.id === item.id 
                                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                                    : ''
                                }`}
                            >
                                <Text className="text-gray-900 dark:text-zinc-100 font-medium">{item.full_name}</Text>
                                <Text className="text-gray-500 text-xs">{item.email}</Text>
                            </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text className="p-4 text-gray-400 text-center text-sm">Nenhum usuário disponível encontrado.</Text>}
                        />
                    </View>
                </View>
            )}

            {/* SEÇÃO 2: SELECIONAR FUNÇÃO */}
            <View className="flex-1">
                <Text className="mb-2 font-bold text-gray-700 dark:text-zinc-300">
                    {modalMode === 'add_member' ? '2. Selecione a Primeira Função' : 'Selecione a Nova Função'}
                </Text>
                <FlatList 
                    data={functionsToShow} 
                    keyExtractor={i => i.id}
                    renderItem={({item}) => (
                    <TouchableOpacity 
                        onPress={() => setSelectedFunction(item)} 
                        className={`p-4 rounded-xl mb-2 border ${
                        selectedFunction?.id === item.id 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                        }`}
                    >
                        <Text className={`font-bold ${selectedFunction?.id === item.id ? 'text-white' : 'text-gray-700 dark:text-zinc-200'}`}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text className="text-gray-400 dark:text-zinc-600 italic text-center mt-4">Todas as funções já foram adicionadas.</Text>}
                />
            </View>

            <View className="mt-4">
                <TouchableOpacity 
                onPress={handleSave} 
                disabled={saving || !selectedFunction || (modalMode === 'add_member' && !selectedProfile)} 
                className={`p-4 rounded-xl ${
                    saving || !selectedFunction || (modalMode === 'add_member' && !selectedProfile)
                    ? 'bg-gray-300 dark:bg-zinc-700'
                    : 'bg-blue-600'
                }`}
                >
                {saving ? <ActivityIndicator color="#FFF"/> : <Text className="text-white text-center font-bold text-lg">Confirmar</Text>}
                </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO (DELETE) */}
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
                        onPress={handleConfirmAction}
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

    </View>
  );
}