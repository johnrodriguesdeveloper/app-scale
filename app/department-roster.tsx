import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, User, Plus, Trash2, X, Filter } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DepartmentRosterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const departmentId = String(params.departmentId);
  const departmentName = String(params.departmentName || 'Escala');
  
  // Referência para controlar o Scroll Horizontal
  const scrollViewRef = useRef<ScrollView>(null);

  // Estados
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [serviceDays, setServiceDays] = useState<number[]>([]);
  
  const [functions, setFunctions] = useState<any[]>([]);
  const [rosterEntries, setRosterEntries] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Estado do "Select" (Modal Simplificado)
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedFunctionName, setSelectedFunctionName] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, [departmentId]);

  useEffect(() => {
    if (selectedDate) {
      fetchRosterForDate(selectedDate);
    }
  }, [selectedDate]);

  // --- NOVA LÓGICA DE SCROLL AUTOMÁTICO ---
  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    return days.filter(day => serviceDays.includes(getDay(day)));
  };

  const daysToShow = getDaysInMonth();

  useEffect(() => {
    // Esse efeito roda quando mudamos de mês ou carregamos a tela
    if (daysToShow.length > 0 && scrollViewRef.current) {
      // 1. Descobrir qual o índice do dia selecionado na lista
      const index = daysToShow.findIndex(day => isSameDay(day, selectedDate));
      
      if (index !== -1) {
        // 2. Calcular a posição (Cada item tem w-14 (56px) + mr-3 (12px) = ~68px)
        const ITEM_SIZE = 68; 
        const offset = index * ITEM_SIZE;

        // 3. Rolar (com um pequeno delay para garantir que a UI desenhou)
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: offset, animated: true });
        }, 100);
      }
    }
  }, [currentDate, serviceDays]); // Dependências: quando muda o mês ou os dias carregam

  // --- FIM DA LÓGICA DE SCROLL ---

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchServiceDays(),
      fetchFunctions(),
      fetchMembers()
    ]);
    setLoading(false);
  };

  const fetchServiceDays = async () => {
    const { data } = await supabase.from('service_days').select('day_of_week');
    if (data) {
      setServiceDays(data.map(d => d.day_of_week));
    }
  };

  const fetchFunctions = async () => {
    const { data } = await supabase
      .from('department_functions')
      .select('*')
      .eq('department_id', departmentId)
      .order('name');
    if (data) setFunctions(data);
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('department_members')
      .select(`
        id,
        user_id,
        function_id,
        department_functions:function_id ( name ),
        profiles:user_id ( full_name, avatar_url )
      `)
      .eq('department_id', departmentId);

    if (error) console.error("Erro ao buscar membros:", error);
    if (data) setMembers(data);
  };

  const fetchRosterForDate = async (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('rosters')
      .select(`
        id,
        function_id,
        member_id,
        department_members:member_id (
          user_id,
          profiles:user_id ( full_name )
        )
      `)
      .eq('department_id', departmentId)
      .eq('schedule_date', formattedDate);

    if (data) setRosterEntries(data);
  };

  const handleAddMember = async (memberId: string) => {
    if (!selectedFunctionId) return;

    try {
      const { error } = await supabase.from('rosters').upsert({
        department_id: departmentId,
        function_id: selectedFunctionId,
        member_id: memberId,
        schedule_date: format(selectedDate, 'yyyy-MM-dd')
      });

      if (error) throw error;

      setShowMemberSelect(false);
      fetchRosterForDate(selectedDate);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    }
  };

  const handleRemoveFromRoster = async (rosterId: string) => {
    await supabase.from('rosters').delete().eq('id', rosterId);
    fetchRosterForDate(selectedDate);
  };

  // Filtro Inteligente
  const filteredMembers = members.filter(member => {
    if (!selectedFunctionId) return true;
    return member.function_id === selectedFunctionId;
  });

  const renderFunctionCard = (func: any) => {
    const entry = rosterEntries.find(e => e.function_id === func.id);

    return (
      <View key={func.id} className="bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm flex-row items-center justify-between">
        <View>
          <Text className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">{func.name}</Text>
          {entry ? (
            <Text className="text-gray-900 font-semibold text-lg">
              {entry.department_members?.profiles?.full_name || 'Usuário Desconhecido'}
            </Text>
          ) : (
            <Text className="text-gray-400 italic">Vago</Text>
          )}
        </View>

        {entry ? (
          <TouchableOpacity 
            onPress={() => handleRemoveFromRoster(entry.id)}
            className="w-10 h-10 bg-red-50 rounded-full items-center justify-center"
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={() => {
              setSelectedFunctionId(func.id);
              setSelectedFunctionName(func.name);
              setShowMemberSelect(true);
            }}
            className="px-4 py-2 bg-blue-600 rounded-lg"
          >
            <Text className="text-white font-bold text-sm">+ Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 bg-gray-100 rounded-full">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">{departmentName}</Text>
            <Text className="text-xs text-gray-500">Gerenciar Escala</Text>
          </View>
        </View>
      </View>

      {/* Seletor de Mês */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </Text>
        <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRight size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Scroll de Dias */}
      <View className="bg-white pb-4">
        <ScrollView 
          ref={scrollViewRef} // <--- REFERÊNCIA AQUI
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="pl-4"
        >
          {daysToShow.map((day, index) => {
            const isSelected = isSameDay(day, selectedDate);
            return (
              <TouchableOpacity 
                key={index}
                onPress={() => setSelectedDate(day)}
                className={`items-center justify-center w-14 h-16 rounded-xl mr-3 ${isSelected ? 'bg-blue-600' : 'bg-gray-100'}`}
              >
                <Text className={`text-xs mb-1 font-medium capitalize ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>
                  {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
                </Text>
                <Text className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
          {daysToShow.length === 0 && (
            <Text className="text-gray-400 p-4">Nenhum dia de culto neste mês.</Text>
          )}
          <View className="w-4" />
        </ScrollView>
      </View>

      {/* Lista de Vagas */}
      <ScrollView className="flex-1 p-4">
        <Text className="text-gray-600 font-medium mb-4">
          Escala para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
        </Text>
        
        {loading ? (
          <ActivityIndicator color="#2563eb" />
        ) : functions.length > 0 ? (
          functions.map(renderFunctionCard)
        ) : (
          <Text className="text-center text-gray-400 mt-10">
            Nenhuma função cadastrada neste departamento.
          </Text>
        )}
        <View className="h-10" />
      </ScrollView>

      {/* Bottom Sheet */}
      <Modal
        visible={showMemberSelect}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberSelect(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl h-[60%] w-full flex overflow-hidden">
            
            <View className="p-4 border-b border-gray-100 flex-row justify-between items-center bg-gray-50">
              <View>
                <Text className="text-lg font-bold text-gray-800">Selecione: {selectedFunctionName}</Text>
                <Text className="text-xs text-gray-500">Exibindo apenas membros desta função</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMemberSelect(false)} className="p-2 bg-white rounded-full">
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList 
              data={filteredMembers}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View className="items-center py-10 px-4">
                  <Filter size={40} color="#ccc" />
                  <Text className="text-gray-500 mt-4 text-center font-bold">Nenhum membro encontrado</Text>
                  <Text className="text-gray-400 text-center mt-1 text-sm">
                    Verifique se os membros estão cadastrados com a função "{selectedFunctionName}" na lista de membros.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => handleAddMember(item.id)}
                  className="flex-row items-center p-4 mb-2 bg-white border border-gray-100 rounded-xl active:bg-blue-50 active:border-blue-200"
                >
                  <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Text className="text-blue-700 font-bold text-lg">
                      {item.profiles?.full_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold text-base">
                      {item.profiles?.full_name || 'Sem nome'}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {item.department_functions?.name || 'Sem função'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}