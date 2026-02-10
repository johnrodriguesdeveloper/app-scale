import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { User, Trash, Plus, ShieldCheck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Member {
  id: string;
  user_id: string;
  dept_role: string;
  is_leader: boolean;
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

interface Function {
  id: string;
  name: string;
}

export default function MemberListScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [canEdit, setCanEdit] = useState(false);
  
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
    // Carregamos as funções disponíveis logo no início para usar na lógica do botão
    loadAvailableFunctions();
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

      const isGlobalAdmin = profile?.org_role === 'admin' || profile?.org_role === 'master';

      const { data: memberRecord } = await supabase
        .from('department_members')
        .select('is_leader')
        .eq('user_id', user.id)
        .eq('department_id', id)
        .single();

      const isDeptLeader = memberRecord?.is_leader || false;

      setCanEdit(isGlobalAdmin || isDeptLeader);

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
          is_leader,
          profiles ( full_name, avatar_url, email ),
          member_functions (
            department_functions ( id, name )
          )
        `)
        .eq('department_id', id)
        .order('is_leader', { ascending: false });

      if (error) {
        Alert.alert('Erro', 'Não foi possível carregar os membros');
        return;
      }

      if (data) {
        const sorted = (data as any).sort((a: any, b: any) => {
             if (a.is_leader && !b.is_leader) return -1;
             if (!a.is_leader && b.is_leader) return 1;
             return (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '');
        });
        setMembers(sorted);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
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

  const openAddModal = async () => {
    setModalMode('add');
    setSelectedMember(null);
    setSelectedProfile(null);
    setSelectedFunction(null);
    setSearchText('');
    await loadAvailableProfiles();
    // await loadAvailableFunctions(); // Já carregado no useEffect
    setShowModal(true);
  };

  const openEditModal = async (member: Member) => {
    setModalMode('edit');
    setSelectedMember(member);
    setSelectedProfile(null);
    setSearchText('');
    // await loadAvailableFunctions(); // Já carregado no useEffect
    setShowModal(true);
  };

  const handleSaveMember = async () => {
    if (!selectedFunction) return Alert.alert('Erro', 'Selecione uma função');
    if (modalMode === 'add' && !selectedProfile) return Alert.alert('Erro', 'Selecione uma pessoa');

    setSaving(true);
    try {
      if (modalMode === 'add') {
        const { data: newMember, error: memError } = await supabase
          .from('department_members')
          .insert({ department_id: id, user_id: selectedProfile!.id, dept_role: 'member' })
          .select()
          .single();

        if (memError) throw memError;

        const { error: funcError } = await supabase
          .from('member_functions')
          .insert({ member_id: newMember.id, function_id: selectedFunction.id });

        if (funcError) throw funcError;
        Alert.alert('Sucesso', 'Membro adicionado!');

      } else {
        const { error } = await supabase
          .from('member_functions')
          .insert({ member_id: selectedMember!.id, function_id: selectedFunction.id });

        if (error) {
           if (error.code === '23505') Alert.alert('Aviso', 'Membro já tem essa função.');
           else throw error;
        } else {
           Alert.alert('Sucesso', 'Função adicionada!');
        }
      }
      setShowModal(false);
      await loadMembers();
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    Alert.alert('Remover', 'Tem certeza?', [
      { text: 'Cancelar' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
         await supabase.from('department_members').delete().eq('id', memberId);
         loadMembers();
      }}
    ]);
  };

  const handleRemoveFunction = async (memberId: string, functionId: string) => {
      Alert.alert('Remover Função', 'Confirma?', [
          { text: 'Cancelar' },
          { text: 'Sim', style: 'destructive', onPress: async () => {
              await supabase.from('member_functions').delete().eq('member_id', memberId).eq('function_id', functionId);
              loadMembers();
          }}
      ]);
  };

  const renderMember = ({ item }: { item: Member }) => {
    const functionsList = item.member_functions?.map(mf => mf.department_functions) || [];
    
    // --- LÓGICA INTELIGENTE DO BOTÃO ---
    // Só mostra o botão "+ Add" se o membro tiver MENOS funções do que o total disponível
    const hasMoreFunctions = (item.member_functions?.length || 0) < availableFunctions.length;

    return (
      <View className="bg-white rounded-xl shadow-sm border border-gray-200 mx-4 mb-3">
        <View className="p-4">
          
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                 <Text className="text-blue-600 font-bold">{item.profiles.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text className="text-gray-900 font-bold text-base">{item.profiles?.full_name}</Text>
                {item.is_leader && (
                    <View className="bg-amber-100 px-2 py-0.5 rounded-md self-start mt-0.5 flex-row items-center">
                        <ShieldCheck size={10} color="#b45309" className="mr-1"/>
                        <Text className="text-amber-800 text-[10px] font-bold">LÍDER</Text>
                    </View>
                )}
              </View>
            </View>
            
            {canEdit && (
              <TouchableOpacity onPress={() => handleDeleteMember(item.id)} className="p-2 bg-gray-50 rounded-full">
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
                    className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex-row items-center"
                >
                    <Text className="text-blue-700 text-xs font-semibold mr-1">{func.name}</Text>
                    {canEdit && <Text className="text-blue-400 text-xs ml-1">×</Text>}
                </TouchableOpacity>
            ))}
            
            {/* SÓ RENDERIZA SE TIVER PERMISSÃO E TIVER FUNÇÕES SOBRANDO PARA ADICIONAR */}
            {canEdit && hasMoreFunctions && (
                <TouchableOpacity onPress={() => openEditModal(item)} className="bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 border-dashed">
                    <Text className="text-gray-500 text-xs font-semibold">+ Add</Text>
                </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    );
  };

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#2563eb"/></View>;

  // Filtra as funções para o modal (para não mostrar as que a pessoa já tem)
  const functionsToShow = (modalMode === 'edit' && selectedMember)
    ? availableFunctions.filter(f => 
        !selectedMember.member_functions?.some(mf => mf.department_functions.id === f.id)
      )
    : availableFunctions;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList data={members} renderItem={renderMember} keyExtractor={i => i.id} contentContainerStyle={{paddingVertical:16}} 
        ListEmptyComponent={<Text className="text-center text-gray-400 mt-10">Nenhum membro.</Text>}
      />
      
      {canEdit && (
        <TouchableOpacity onPress={openAddModal} className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg">
          <Plus size={24} color="white" />
        </TouchableOpacity>
      )}

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
         <View className="flex-1 bg-black/50 justify-end">
            <View className="bg-white rounded-t-3xl p-6 h-[70%]">
               <Text className="text-xl font-bold mb-4">{modalMode === 'add' ? 'Adicionar Membro' : 'Adicionar Função'}</Text>
               
               {modalMode === 'add' && (
                 <View className="mb-4">
                   <Text className="mb-2 font-bold">Pessoa</Text>
                   <TextInput value={searchText} onChangeText={setSearchText} placeholder="Buscar..." className="bg-gray-100 p-3 rounded-lg mb-2"/>
                   <FlatList data={availableProfiles.filter(p=>p.full_name.toLowerCase().includes(searchText.toLowerCase()))} 
                     renderItem={({item}) => (
                       <TouchableOpacity onPress={() => setSelectedProfile(item)} className={`p-3 rounded mb-1 ${selectedProfile?.id === item.id ? 'bg-blue-100 border-blue-500 border': 'bg-gray-50'}`}>
                         <Text>{item.full_name}</Text>
                       </TouchableOpacity>
                     )}
                   />
                 </View>
               )}

               <Text className="mb-2 font-bold">Função</Text>
               <FlatList data={functionsToShow} 
                 renderItem={({item}) => (
                   <TouchableOpacity onPress={() => setSelectedFunction(item)} className={`p-3 rounded mb-1 ${selectedFunction?.id === item.id ? 'bg-blue-100 border-blue-500 border': 'bg-gray-50'}`}>
                     <Text>{item.name}</Text>
                   </TouchableOpacity>
                 )}
                 ListEmptyComponent={<Text className="text-gray-400 italic text-center">Nenhuma função disponível.</Text>}
               />

               <TouchableOpacity onPress={handleSaveMember} disabled={saving} className="bg-blue-600 p-4 rounded-xl mt-4">
                 {saving ? <ActivityIndicator color="#FFF"/> : <Text className="text-white text-center font-bold">Salvar</Text>}
               </TouchableOpacity>
               <TouchableOpacity onPress={() => setShowModal(false)} className="p-4 mt-2">
                 <Text className="text-gray-500 text-center">Cancelar</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </View>
  );
}