import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Plus, User } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DepartmentFunction {
  id: string;
  name: string;
  description?: string;
}

interface Member {
  id: string;
  user_id: string;
  name: string;
  email?: string;
}

interface Roster {
  id: string;
  department_id: string;
  function_id: string;
  member_id: string;
  schedule_date: string;
  member?: Member;
}

export default function RosterManagementScreen() {
  const router = useRouter();
  const { departmentId, departmentName } = useLocalSearchParams<{ 
    departmentId: string; 
    departmentName: string; 
  }>();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [functions, setFunctions] = useState<DepartmentFunction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<DepartmentFunction | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [departmentId]);

  useEffect(() => {
    loadRosters();
  }, [selectedDate, departmentId]);

  const loadData = async () => {
    try {
      if (!departmentId) return;

      // Buscar funções do departamento
      const { data: functionsData, error: functionsError } = await supabase
        .from('department_functions')
        .select('*')
        .eq('department_id', departmentId)
        .order('name');

      if (functionsError) {
        console.error('Erro ao carregar funções:', functionsError);
        return;
      }

      if (functionsData) {
        setFunctions(functionsData);
      }

      // Buscar membros do departamento
      const { data: membersData, error: membersError } = await supabase
        .from('department_members')
        .select(`
          id,
          user_id,
          profiles!department_members_user_id_fkey (
            name,
            email
          )
        `)
        .eq('department_id', departmentId);

      if (membersError) {
        console.error('Erro ao carregar membros:', membersError);
        return;
      }

      if (membersData) {
        const formattedMembers = membersData.map((member: any) => ({
          id: member.id,
          user_id: member.user_id,
          name: member.profiles?.name || 'Sem nome',
          email: member.profiles?.email
        }));
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRosters = async () => {
    try {
      if (!departmentId) return;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data: rostersData, error: rostersError } = await supabase
        .from('rosters')
        .select(`
          id,
          department_id,
          function_id,
          member_id,
          schedule_date,
          profiles!rosters_member_id_fkey (
            name,
            email
          )
        `)
        .eq('department_id', departmentId)
        .eq('schedule_date', dateStr);

      if (rostersError) {
        console.error('Erro ao carregar escalas:', rostersError);
        return;
      }

      if (rostersData) {
        const formattedRosters = rostersData.map((roster: any) => ({
          id: roster.id,
          department_id: roster.department_id,
          function_id: roster.function_id,
          member_id: roster.member_id,
          schedule_date: roster.schedule_date,
          member: roster.profiles ? {
            id: roster.member_id,
            user_id: roster.member_id,
            name: roster.profiles.name,
            email: roster.profiles.email
          } : undefined
        }));
        setRosters(formattedRosters);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar escalas:', error);
    }
  };

  const getRosterForFunction = (functionId: string) => {
    return rosters.find(r => r.function_id === functionId);
  };

  const handleAddMember = (functionItem: DepartmentFunction) => {
    setSelectedFunction(functionItem);
    setShowMemberModal(true);
  };

  const handleSelectMember = async (member: Member) => {
    if (!selectedFunction || !departmentId) return;

    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('rosters')
        .insert({
          department_id: departmentId,
          function_id: selectedFunction.id,
          member_id: member.user_id,
          schedule_date: dateStr
        });

      if (error) {
        Alert.alert('Erro', 'Não foi possível adicionar o membro à escala');
        return;
      }

      setShowMemberModal(false);
      setSelectedFunction(null);
      await loadRosters();
    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (roster: Roster) => {
    Alert.alert(
      'Remover da Escala',
      `Tem certeza que deseja remover ${roster.member?.name} da escala?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('rosters')
                .delete()
                .eq('id', roster.id);

              if (error) {
                Alert.alert('Erro', 'Não foi possível remover da escala');
                return;
              }

              await loadRosters();
            } catch (error) {
              console.error('Erro ao remover:', error);
              Alert.alert('Erro', 'Ocorreu um erro inesperado');
            }
          },
        },
      ]
    );
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-2">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#3b82f6" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">{departmentName}</Text>
            <Text className="text-gray-600 text-sm">Gerenciar Escala</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Seletor de Mês */}
        <View className="bg-white border-b border-gray-200 px-4 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 rounded-lg bg-gray-100"
            >
              <ChevronLeft size={20} color="#374151" />
            </TouchableOpacity>
            
            <Text className="text-gray-900 font-semibold text-lg capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </Text>
            
            <TouchableOpacity
              onPress={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-lg bg-gray-100"
            >
              <ChevronRight size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Scroll Horizontal de Dias */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {getDaysInMonth().map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const dayName = format(date, 'EEE', { locale: ptBR });

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    onPress={() => setSelectedDate(date)}
                    className={`w-14 h-14 rounded-lg items-center justify-center ${
                      isSelected
                        ? 'bg-blue-600 border-2 border-blue-700'
                        : 'bg-gray-100 border-2 border-gray-200'
                    }`}
                  >
                    <Text className={`font-bold ${
                      isSelected ? 'text-white' : 'text-gray-700'
                    }`}>
                      {format(date, 'd')}
                    </Text>
                    <Text className={`text-xs capitalize ${
                      isSelected ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {dayName.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Lista de Funções */}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Escala para {format(selectedDate, 'dd/MM/yyyy')}
          </Text>

          {functions.length > 0 ? (
            functions.map((func) => {
              const roster = getRosterForFunction(func.id);
              const isFilled = !!roster;

              return (
                <View
                  key={func.id}
                  className={`rounded-xl p-4 mb-3 border ${
                    isFilled
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-lg">
                        {func.name}
                      </Text>
                      {func.description && (
                        <Text className="text-gray-500 text-sm mt-1">
                          {func.description}
                        </Text>
                      )}
                      {isFilled && roster.member && (
                        <View className="flex-row items-center mt-2">
                          <User size={16} color="#10b981" className="mr-2" />
                          <Text className="text-green-700 font-medium">
                            {roster.member.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {isFilled ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(roster)}
                        className="p-2 bg-red-100 rounded-lg"
                      >
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleAddMember(func)}
                        className="bg-blue-600 rounded-lg px-3 py-2 flex-row items-center"
                      >
                        <Plus size={16} color="white" className="mr-1" />
                        <Text className="text-white font-semibold text-sm">Adicionar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View className="bg-white rounded-xl p-6 items-center border border-gray-200">
              <Text className="text-gray-500 text-center">
                Nenhuma função cadastrada neste departamento.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Seleção de Membro */}
      <Modal
        visible={showMemberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Selecionar Membro
              </Text>
              <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                <Text className="text-gray-500 text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-4">
              Função: {selectedFunction?.name}
            </Text>

            <ScrollView className="flex-1">
              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => handleSelectMember(member)}
                  disabled={saving}
                  className="bg-gray-50 rounded-lg p-4 mb-2 flex-row items-center"
                >
                  <View className="w-10 h-10 bg-blue-600 rounded-full items-center justify-center mr-3">
                    <Text className="text-white font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      {member.name}
                    </Text>
                    {member.email && (
                      <Text className="text-gray-500 text-sm">
                        {member.email}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
