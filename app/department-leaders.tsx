import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, UserPlus, Trash2, ShieldCheck, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

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
  
  // Debug logs
  console.log('Parâmetros recebidos:', { departmentId, departmentName });
  
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

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
      
      // Buscar líderes do departamento
      const { data, error } = await supabase
        .from('department_leaders')
        .select(`
          id,
          user_id,
          profiles:user_id (id, full_name, email, avatar_url)
        `)
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar líderes:', error);
        return;
      }

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
      
      // Buscar usuários pelo nome, filtrando pela organização
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('organization_id', currentOrgId)
        .ilike('full_name', `%${text}%`)
        .neq('org_role', 'master') // Excluir master global
        .limit(10);

      if (error) {
        console.error('Erro na busca:', error);
        return;
      }

      // Filtrar usuários que já são líderes
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
        if (error.code === '23505') { // Unique violation
          Alert.alert('Aviso', 'Este usuário já é líder deste departamento.');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('Sucesso', `${userName} adicionado como líder com sucesso!`);
      
      // Limpar busca e atualizar lista
      setSearchText('');
      setSearchResults([]);
      await fetchLeaders();
    } catch (error: any) {
      console.error('Erro ao adicionar líder:', error);
      Alert.alert('Erro', error.message || 'Não foi possível adicionar o líder.');
    }
  };

  const handleRemoveLeader = async (leaderId: string, userName: string) => {
    Alert.alert(
      'Remover Líder',
      `Tem certeza que deseja remover ${userName} como líder deste departamento?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('department_leaders')
                .delete()
                .eq('id', leaderId);

              if (error) {
                Alert.alert('Erro', 'Não foi possível remover o líder.');
                return;
              }

              Alert.alert('Sucesso', 'Líder removido com sucesso!');
              await fetchLeaders();
            } catch (error) {
              console.error('Erro ao remover líder:', error);
              Alert.alert('Erro', 'Ocorreu um erro inesperado.');
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">
              Gestão de Líderes
            </Text>
            <Text className="text-gray-600 text-sm">
              {departmentName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Busca de Novos Líderes */}
        <View className="bg-white border-b border-gray-200 px-4 py-4">
          <View className="flex-row items-center bg-gray-100 p-3 rounded-xl">
            <Search size={20} color="#666" className="mr-2" />
            <TextInput
              placeholder="Buscar membro para adicionar como líder..."
              className="flex-1 text-base"
              value={searchText}
              onChangeText={searchUsers}
            />
          </View>

          {searching && (
            <View className="mt-3 items-center">
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text className="text-gray-500 text-sm mt-1">Buscando...</Text>
            </View>
          )}

          {/* Resultados da Busca */}
          {searchResults.length > 0 && (
            <View className="mt-3">
              <Text className="text-gray-600 text-sm font-medium mb-2">
                Resultados da busca ({searchResults.length})
              </Text>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => handleAddLeader(user.id, user.full_name)}
                  className="flex-row items-center p-3 bg-gray-50 rounded-lg mb-2"
                >
                  <View className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold">
                      {user.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      {user.full_name}
                    </Text>
                    {user.email && (
                      <Text className="text-gray-500 text-sm">
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
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Líderes Atuais ({leaders.length})
          </Text>

          {loading ? (
            <View className="items-center py-8">
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text className="text-gray-500 mt-2">Carregando líderes...</Text>
            </View>
          ) : leaders.length > 0 ? (
            leaders.map((leader) => (
              <View
                key={leader.id}
                className="bg-amber-50 rounded-xl p-4 mb-3 border border-amber-200"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-amber-500 rounded-full items-center justify-center mr-3">
                      <ShieldCheck size={16} color="white" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold">
                        {leader.profiles.full_name}
                      </Text>
                      {leader.profiles.email && (
                        <Text className="text-gray-500 text-sm">
                          {leader.profiles.email}
                        </Text>
                      )}
                      <Text className="text-amber-600 text-xs mt-1">
                        Líder do departamento
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveLeader(leader.id, leader.profiles.full_name)}
                    className="p-2 bg-red-100 rounded-lg"
                  >
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View className="bg-gray-50 rounded-xl p-6 items-center border border-gray-200">
              <ShieldCheck size={32} color="#9ca3af" />
              <Text className="text-gray-500 mt-2 text-center">
                Nenhum líder definido ainda
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                Use a busca acima para adicionar líderes
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
