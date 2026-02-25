import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, UserPlus, Trash2, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from 'nativewind';

interface Leader {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    email?: string;
    avatar_url?: string;
  };
}

interface SearchResult {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
}

export default function ManageLeadersScreen() {
  const router = useRouter();
  const { departmentId, departmentName } = useLocalSearchParams<{ 
    departmentId: string; 
    departmentName: string; 
  }>();
  const { colorScheme } = useColorScheme();
  
  // Cores dinâmicas para ícones e inputs
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';
  const placeholderColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';
  
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  // --- ESTADOS DO MODAL DE CONFIRMAÇÃO ---
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: async () => {},
    loading: false
  });

  useEffect(() => {
    fetchLeaders();
    fetchOrganizationId();
  }, [departmentId]);

  const fetchOrganizationId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profile?.organization_id) {
        setCurrentOrgId(profile.organization_id);
      }
    } catch (error) {
      console.error('Erro ao buscar organization_id:', error);
    }
  };

  const fetchLeaders = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('department_leaders')
        .select(`
          id,
          user_id,
          profiles:user_id (id, full_name, email, avatar_url)
        `)
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedLeaders = data.map((leader: any) => ({
          id: leader.id,
          user_id: leader.user_id,
          profiles: leader.profiles
        }));
        setLeaders(formattedLeaders);
      }
    } catch (error) {
      console.error('Erro inesperado ao buscar líderes:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (text: string) => {
    setSearchText(text);
    
    if (text.length < 3 || !currentOrgId) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('organization_id', currentOrgId)
        .ilike('full_name', `%${text}%`)
        .neq('org_role', 'master')
        .limit(10);

      if (error) throw error;

      const leaderUserIds = leaders.map(leader => leader.user_id);
      const availableUsers = (data || []).filter(
        user => !leaderUserIds.includes(user.id)
      );

      setSearchResults(availableUsers as SearchResult[]);
    } catch (error) {
      console.error('Erro inesperado na busca:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddLeader = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('department_leaders')
        .insert({
          department_id: departmentId,
          user_id: userId
        });

      if (error) {
        if (error.code === '23505') {
          if (Platform.OS === 'web') window.alert('Este usuário já é líder deste departamento.');
          else Alert.alert('Aviso', 'Este usuário já é líder deste departamento.');
        } else {
          throw error;
        }
        return;
      }

      setSearchText('');
      setSearchResults([]);
      await fetchLeaders();
    } catch (error: any) {
      const msg = error.message || 'Não foi possível adicionar o líder.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Erro', msg);
    }
  };

  // --- NOVA FUNÇÃO DE REMOVER (Usando Modal) ---
  const handleRemoveLeader = (leaderId: string, userName: string) => {
    setConfirmConfig({
      title: 'Remover Líder',
      message: `Tem certeza que deseja remover ${userName} como líder deste departamento?`,
      loading: false,
      onConfirm: async () => {
        const { error } = await supabase
          .from('department_leaders')
          .delete()
          .eq('id', leaderId);

        if (error) throw error;
        await fetchLeaders();
      }
    });
    setConfirmModalVisible(true);
  };

  const executeConfirmAction = async () => {
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    try {
      await confirmConfig.onConfirm();
      setConfirmModalVisible(false);
    } catch (error) {
      if (Platform.OS === 'web') window.alert('Não foi possível remover o líder.');
      else Alert.alert('Erro', 'Não foi possível remover o líder.');
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-4">
        <View className="flex-row items-center mt-8">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <ArrowLeft size={20} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">
              Gestão de Líderes
            </Text>
            <Text className="text-gray-600 dark:text-zinc-400 text-sm">
              {departmentName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Busca de Novos Líderes */}
        <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-4">
          <View className="flex-row items-center bg-gray-100 dark:bg-zinc-800 p-3 rounded-xl">
            <Search size={20} color={placeholderColor} className="mr-2" />
            <TextInput
              placeholder="Buscar membro para adicionar como líder..."
              placeholderTextColor={placeholderColor}
              className="flex-1 text-base text-gray-900 dark:text-zinc-100 outline-none"
              style={{ backgroundColor: 'transparent' }}
              value={searchText}
              onChangeText={searchUsers}
            />
          </View>

          {searching && (
            <View className="mt-3 items-center">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-1">Buscando...</Text>
            </View>
          )}

          {/* Resultados da Busca */}
          {searchResults.length > 0 && (
            <View className="mt-3">
              <Text className="text-gray-600 dark:text-zinc-400 text-sm font-medium mb-2">
                Resultados da busca ({searchResults.length})
              </Text>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleAddLeader(user.id, user.full_name)}
                  className="flex-row items-center p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg mb-2"
                >
                  <View className="w-10 h-10 bg-blue-600 dark:bg-blue-700 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 dark:text-zinc-100 font-medium">
                      {user.full_name}
                    </Text>
                    {user.email && (
                      <Text className="text-gray-500 dark:text-zinc-400 text-sm">
                        {user.email}
                      </Text>
                    )}
                  </View>
                  <UserPlus size={20} color="#3b82f6" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Lista de Líderes Atuais */}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4">
            Líderes Atuais ({leaders.length})
          </Text>

          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-gray-500 dark:text-zinc-400 mt-2">Carregando líderes...</Text>
            </View>
          ) : leaders.length > 0 ? (
            leaders.map((leader) => (
              <View
                key={leader.id}
                className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 mb-3 border border-amber-200 dark:border-amber-800/50"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-amber-500 rounded-full items-center justify-center mr-3">
                      <ShieldCheck size={16} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 dark:text-zinc-100 font-semibold">
                        {leader.profiles.full_name}
                      </Text>
                      {leader.profiles.email && (
                        <Text className="text-gray-500 dark:text-zinc-400 text-sm">
                          {leader.profiles.email}
                        </Text>
                      )}
                      <Text className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                        Líder do departamento
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveLeader(leader.id, leader.profiles.full_name)}
                    className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 items-center border border-gray-200 dark:border-zinc-800">
              <ShieldCheck size={32} color={placeholderColor} />
              <Text className="text-gray-500 dark:text-zinc-400 mt-2 text-center">
                Nenhum líder definido ainda
              </Text>
              <Text className="text-gray-400 dark:text-zinc-500 text-sm text-center mt-1">
                Use a busca acima para adicionar líderes
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
                        onPress={executeConfirmAction}
                        className="flex-1 bg-red-600 py-3 rounded-xl flex-row justify-center items-center"
                        disabled={confirmConfig.loading}
                    >
                        {confirmConfig.loading ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Text className="text-white font-semibold text-center">Remover</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
}