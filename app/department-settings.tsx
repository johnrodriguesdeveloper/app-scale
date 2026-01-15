import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Plus, Trash2, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function DepartmentSettingsScreen() {
  const router = useRouter();
  const { departmentId } = useLocalSearchParams<{ departmentId: string }>();
  const [functions, setFunctions] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newFunctionName, setNewFunctionName] = useState('');
  const [loading, setLoading] = useState(false);

  // Carregar funções do departamento
  useEffect(() => {
    if (!departmentId) return;

    async function loadFunctions() {
      const { data } = await supabase
        .from('department_functions')
        .select('id, name')
        .eq('department_id', departmentId)
        .order('name');

      if (data) {
        setFunctions(data);
      }
    }

    loadFunctions();
  }, [departmentId]);

  // Carregar membros do departamento
  useEffect(() => {
    if (!departmentId) return;

    async function loadMembers() {
      const { data } = await supabase
        .from('department_members')
        .select(`
          user_id,
          profiles(id, full_name, email),
          member_functions(function_id, department_functions(id, name))
        `)
        .eq('department_id', departmentId);

      if (data) {
        setMembers(data);
      }
    }

    loadMembers();
  }, [departmentId]);

  const addFunction = async () => {
    if (!newFunctionName.trim() || !departmentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('department_functions')
        .insert({
          department_id: departmentId,
          name: newFunctionName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setFunctions([...functions, data]);
      setNewFunctionName('');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao adicionar função');
    } finally {
      setLoading(false);
    }
  };

  const deleteFunction = async (functionId: string) => {
    Alert.alert(
      'Confirmar',
      'Tem certeza que deseja remover esta função?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('department_functions')
              .delete()
              .eq('id', functionId);

            if (error) {
              Alert.alert('Erro', error.message);
            } else {
              setFunctions(functions.filter((f) => f.id !== functionId));
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Configurações</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* CRUD de Funções */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Funções</Text>

          {/* Adicionar Nova Função */}
          <View className="flex-row mb-4">
            <TextInput
              value={newFunctionName}
              onChangeText={setNewFunctionName}
              placeholder="Nome da função (ex: Baixo, Violino)"
              className="flex-1 bg-gray-100 rounded-lg px-4 py-2 mr-2"
            />
            <TouchableOpacity
              onPress={addFunction}
              disabled={loading || !newFunctionName.trim()}
              className="bg-blue-500 rounded-lg px-4 py-2 justify-center"
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Lista de Funções */}
          {functions.map((func) => (
            <View
              key={func.id}
              className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
            >
              <Text className="text-gray-900 font-medium flex-1">{func.name}</Text>
              <TouchableOpacity
                onPress={() => deleteFunction(func.id)}
                className="ml-2"
              >
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Atribuir Funções aos Membros */}
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Atribuir Funções aos Membros
          </Text>

          {members.map((member: any) => (
            <View
              key={member.user_id}
              className="py-3 border-b border-gray-100 last:border-b-0"
            >
              <Text className="text-gray-900 font-medium mb-2">
                {member.profiles?.full_name || 'Sem nome'}
              </Text>
              <Text className="text-gray-600 text-sm mb-2">
                {member.profiles?.email}
              </Text>
              <View className="flex-row flex-wrap">
                {functions.map((func) => {
                  const hasFunction = member.member_functions?.some(
                    (mf: any) => mf.function_id === func.id
                  );
                  return (
                    <TouchableOpacity
                      key={func.id}
                      onPress={async () => {
                        if (hasFunction) {
                          // Remover função
                          const { error } = await supabase
                            .from('member_functions')
                            .delete()
                            .eq('user_id', member.user_id)
                            .eq('function_id', func.id);

                          if (!error) {
                            // Recarregar membros
                            const { data } = await supabase
                              .from('department_members')
                              .select(`
                                user_id,
                                profiles(id, full_name, email),
                                member_functions(function_id, department_functions(id, name))
                              `)
                              .eq('department_id', departmentId);

                            if (data) setMembers(data);
                          }
                        } else {
                          // Adicionar função
                          const { error } = await supabase
                            .from('member_functions')
                            .insert({
                              user_id: member.user_id,
                              function_id: func.id,
                            });

                          if (!error) {
                            // Recarregar membros
                            const { data } = await supabase
                              .from('department_members')
                              .select(`
                                user_id,
                                profiles(id, full_name, email),
                                member_functions(function_id, department_functions(id, name))
                              `)
                              .eq('department_id', departmentId);

                            if (data) setMembers(data);
                          }
                        }
                      }}
                      className={`px-3 py-1 rounded-full mr-2 mb-2 ${
                        hasFunction
                          ? 'bg-blue-500'
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text
                        className={
                          hasFunction
                            ? 'text-white text-xs font-semibold'
                            : 'text-gray-700 text-xs'
                        }
                      >
                        {func.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
