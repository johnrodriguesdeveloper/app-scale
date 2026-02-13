import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { X, Search, UserPlus, Trash2, ShieldCheck, User } from 'lucide-react-native';

interface Props {
  departmentId: string;
  visible: boolean;
  onClose: () => void;
}

export default function DepartmentLeadersManager({ departmentId, visible, onClose }: Props) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para adicionar novo líder
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchLeaders();
    }
  }, [visible]);

  const fetchLeaders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('department_leaders')
      .select(`
        id,
        user_id,
        profiles:user_id (id, full_name, email, avatar_url)
      `)
      .eq('department_id', departmentId);

    if (!error && data) {
      setLeaders(data);
    }
    setLoading(false);
  };

  const searchUsers = async (text: string) => {
    setSearchText(text);
    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    // Busca usuários pelo nome ou email
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .ilike('full_name', `%${text}%`)
      .limit(10);

    if (data) setSearchResults(data);
    setSearching(false);
  };

  const handleAddLeader = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('department_leaders')
        .insert({ department_id: departmentId, user_id: userId });

      if (error) {
        if (error.code === '23505') { // Unique violation
          Alert.alert('Aviso', 'Este usuário já é líder deste departamento.');
        } else {
          throw error;
        }
      } else {
        Alert.alert('Sucesso', 'Líder adicionado com sucesso!');
        setShowAddModal(false);
        setSearchText('');
        fetchLeaders();
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    }
  };

  const handleRemoveLeader = async (leaderId: string, name: string) => {
    Alert.alert(
      'Remover Líder',
      `Tem certeza que deseja remover a liderança de ${name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('department_leaders')
              .delete()
              .eq('id', leaderId);

            if (!error) fetchLeaders();
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl h-[80%] w-full flex overflow-hidden">
          {/* Header do Modal */}
          <View className="px-5 py-4 border-b border-gray-100 flex-row justify-between items-center bg-white">
            <View className="flex-row items-center gap-2">
              <ShieldCheck size={24} color="#d97706" />
              <Text className="text-xl font-bold text-gray-800">Gerenciar Líderes</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 rounded-full">
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Lista de Líderes Atuais */}
          <View className="flex-1 p-5">
            <Text className="text-gray-500 font-medium mb-4">Líderes Atuais ({leaders.length})</Text>
            
            {loading ? (
              <ActivityIndicator color="#d97706" />
            ) : (
              <FlatList
                data={leaders}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <Text className="text-center text-gray-400 mt-4">Nenhum líder definido.</Text>
                }
                renderItem={({ item }) => (
                  <View className="flex-row items-center justify-between bg-gray-50 p-3 rounded-xl mb-3 border border-gray-100">
                    <View className="flex-row items-center gap-3">
                      {item.profiles?.avatar_url ? (
                         // Aqui você usaria seu componente de Avatar ou Image
                         <View className="w-10 h-10 bg-amber-100 rounded-full items-center justify-center">
                            <Text className="text-amber-700 font-bold">{item.profiles.full_name?.charAt(0)}</Text>
                         </View>
                      ) : (
                        <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center">
                          <User size={20} color="#666" />
                        </View>
                      )}
                      <View>
                        <Text className="font-semibold text-gray-800">{item.profiles?.full_name}</Text>
                        <Text className="text-xs text-gray-500">Líder</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleRemoveLeader(item.id, item.profiles?.full_name)}
                      className="p-2 bg-white border border-gray-200 rounded-lg"
                    >
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>

          {/* Footer com Botão de Adicionar */}
          <View className="p-5 border-t border-gray-100 bg-white pb-8">
            <TouchableOpacity 
              onPress={() => setShowAddModal(true)}
              className="bg-amber-600 p-4 rounded-xl flex-row justify-center items-center gap-2 shadow-sm"
            >
              <UserPlus size={20} color="white" />
              <Text className="text-white font-bold text-lg">Adicionar Líder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal Interno de Busca (Nested Modal) */}
      <Modal visible={showAddModal} animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View className="flex-1 bg-white pt-12 px-4">
          <View className="flex-row items-center gap-3 mb-6">
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <ArrowLeftIcon />
            </TouchableOpacity>
            <Text className="text-xl font-bold">Buscar Membro</Text>
          </View>

          <View className="flex-row items-center bg-gray-100 p-3 rounded-xl mb-4">
            <Search size={20} color="#666" />
            <TextInput 
              placeholder="Digite o nome..." 
              className="flex-1 ml-2 text-base"
              value={searchText}
              onChangeText={searchUsers}
              autoFocus
            />
          </View>

          {searching && <ActivityIndicator className="mt-4" />}

          <FlatList 
            data={searchResults}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                onPress={() => handleAddLeader(item.id)}
                className="flex-row items-center p-4 border-b border-gray-100"
              >
                <View className="w-10 h-10 bg-gray-200 rounded-full items-center justify-center mr-3">
                  <Text className="font-bold text-gray-600">{item.full_name?.charAt(0)}</Text>
                </View>
                <View>
                  <Text className="font-semibold text-lg">{item.full_name}</Text>
                  <Text className="text-gray-500">{item.email}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </Modal>
  );
}

// Pequeno helper para icone de voltar no modal interno
const ArrowLeftIcon = () => (
    <View className="p-2 bg-gray-100 rounded-full"><X size={20} color="black" /></View>
);