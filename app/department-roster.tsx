import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2, X, Filter } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceDay {
  id: string;
  day_of_week: number;
  name: string;
}

export default function DepartmentRosterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const departmentId = String(params.departmentId);
  const departmentName = String(params.departmentName || 'Escala');
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Estados
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Dados
  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [dayServices, setDayServices] = useState<string[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [rosterEntries, setRosterEntries] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  // Filtro
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedFunctionName, setSelectedFunctionName] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, [departmentId]);

  useEffect(() => {
    if (selectedDate && serviceDays.length > 0 && members.length > 0) {
      setCalculating(true);
      Promise.all([
        fetchRosterForDate(selectedDate),
        calculateHiddenUsers(selectedDate),
        fetchDayServices(selectedDate)
      ]).finally(() => setCalculating(false));
    }
  }, [selectedDate, serviceDays, members]);

  // Scroll Automático
  useEffect(() => {
    if (daysToShow.length > 0 && scrollViewRef.current) {
      const index = daysToShow.findIndex(day => isSameDay(day, selectedDate));
      if (index !== -1) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: index * 68, animated: true });
        }, 100);
      }
    }
  }, [currentDate, serviceDays]);

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    const serviceDayIndexes = serviceDays.map(sd => sd.day_of_week);
    return days.filter(day => serviceDayIndexes.includes(getDay(day)));
  };

  const daysToShow = getDaysInMonth();

  const loadInitialData = async () => {
    setLoading(true);
    await fetchServiceDays();
    await Promise.all([
      fetchFunctions(),
      fetchMembers()
    ]);
    setLoading(false);
  };

  const fetchServiceDays = async () => {
    const { data } = await supabase.from('service_days').select('*');
    if (data) setServiceDays(data);
  };

  const fetchDayServices = async (date: Date) => {
    try {
      const dayOfWeek = getDay(date);
      const { data } = await supabase
        .from('service_days')
        .select('name')
        .eq('day_of_week', dayOfWeek);

      if (data) {
        setDayServices(data.map(s => s.name));
      } else {
        setDayServices([]);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      setDayServices([]);
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
    // ATUALIZADO: Agora busca na tabela NOVA de member_functions
    const { data } = await supabase
      .from('department_members')
      .select(`
        id, user_id,
        member_functions ( function_id ), 
        profiles:user_id ( full_name, avatar_url )
      `)
      .eq('department_id', departmentId);
      
    if (data) setMembers(data);
  };

  const fetchRosterForDate = async (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('rosters')
      .select(`
        id, function_id, member_id,
        department_members:member_id ( user_id, profiles:user_id ( full_name ) )
      `)
      .eq('department_id', departmentId)
      .eq('schedule_date', formattedDate);
    if (data) setRosterEntries(data);
  };

  const calculateHiddenUsers = async (date: Date) => {
    try {
      const dayOfWeek = getDay(date); 
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const currentServiceDay = serviceDays.find(sd => sd.day_of_week === dayOfWeek);

      // 1. Exceções
      const { data: exceptions } = await supabase
        .from('availability_exceptions')
        .select('user_id, is_available')
        .eq('specific_date', dateStr);

      // 2. Rotinas
      let routines: any[] = [];
      if (currentServiceDay) {
        const { data: routineData } = await supabase
          .from('availability_routine')
          .select('user_id, is_available')
          .eq('service_day_id', currentServiceDay.id);
        routines = routineData || [];
      }

      // 3. Conflitos (Já escalado)
      const { data: conflicts } = await supabase
        .from('rosters')
        .select(`
          member_id,
          department_members!inner ( user_id )
        `)
        .eq('schedule_date', dateStr);
      
      const busyUserIds = new Set(
        conflicts?.map((c: any) => c.department_members?.user_id) || []
      );

      const hiddenSet = new Set<string>();

      members.forEach(member => {
        const userId = member.user_id;
        
        if (busyUserIds.has(userId)) {
          hiddenSet.add(userId);
          return;
        }

        let finalAvailability = true;

        if (currentServiceDay) {
          const userRoutine = routines.find(r => r.user_id === userId);
          if (userRoutine) {
            finalAvailability = userRoutine.is_available;
          }
        }

        const userException = exceptions?.find(e => e.user_id === userId);
        if (userException) {
          finalAvailability = userException.is_available;
        }

        if (!finalAvailability) {
          hiddenSet.add(userId);
        }
      });

      setHiddenUserIds(Array.from(hiddenSet));

    } catch (error) {
      console.error("Erro no cálculo:", error);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/departments');
    }
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
      calculateHiddenUsers(selectedDate);
    } catch (err: any) {
      Alert.alert("Erro", err.message);
    }
  };

  const handleRemoveFromRoster = async (rosterId: string) => {
    await supabase.from('rosters').delete().eq('id', rosterId);
    fetchRosterForDate(selectedDate);
    calculateHiddenUsers(selectedDate);
  };

  // --- NOVO FILTRO DE MEMBROS ---
  const filteredMembers = members.filter(member => {
    // Verifica se a função selecionada existe na lista de funções do membro
    const hasFunction = member.member_functions?.some(
      (mf: any) => mf.function_id === selectedFunctionId
    );
    
    // Verifica disponibilidade
    const isAvailable = !hiddenUserIds.includes(member.user_id);
    
    return hasFunction && isAvailable;
  });

  const renderFunctionCard = (func: any) => {
    const entry = rosterEntries.find(e => e.function_id === func.id);

    return (
      <View key={func.id} className="bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm flex-row items-center justify-between">
        <View>
          <Text className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">{func.name}</Text>
          {entry ? (
            <Text className="text-gray-900 font-semibold text-lg">
              {entry.department_members?.profiles?.full_name || 'Usuário'}
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

  const renderModalContent = () => {
    if (calculating) {
      return (
        <View className="p-10 items-center">
          <ActivityIndicator color="#2563eb" />
          <Text className="text-gray-400 mt-2">Verificando agenda de todos...</Text>
        </View>
      );
    }

    return (
      <FlatList 
        data={filteredMembers}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center py-10 px-4">
            <Filter size={40} color="#ccc" />
            <Text className="text-gray-500 mt-4 text-center font-bold">Ninguém disponível</Text>
            <Text className="text-gray-400 text-center mt-1 text-sm">
              Todos os membros já estão escalados, indisponíveis ou não tocam {selectedFunctionName}.
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
            </View>
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-3 p-2 bg-gray-100 rounded-full">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900">{departmentName}</Text>
            <Text className="text-xs text-gray-500">Gerenciar Escala</Text>
          </View>
        </View>
      </View>

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

      <View className="bg-white pb-4">
        <ScrollView 
          ref={scrollViewRef}
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
          <View className="w-4" />
        </ScrollView>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Mostrador de Eventos do Dia */}
        {dayServices.length > 0 && (
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <Text className="text-blue-900 font-semibold text-sm mb-1">
              Eventos do dia: {dayServices.join(', ')}
            </Text>
            <Text className="text-blue-700 text-xs">
              Escalando para os serviços acima
            </Text>
          </View>
        )}

        <Text className="text-gray-600 font-medium mb-4">
          Escala para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
        </Text>
        
        {loading ? (
          <ActivityIndicator color="#2563eb" />
        ) : functions.length > 0 ? (
          functions.map(renderFunctionCard)
        ) : (
          <Text className="text-center text-gray-400 mt-10">Nenhuma função cadastrada.</Text>
        )}
        <View className="h-10" />
      </ScrollView>

      {/* Bottom Sheet (Modal) */}
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
                <Text className="text-lg font-bold text-gray-800">Selecionar: {selectedFunctionName}</Text>
                <Text className="text-xs text-gray-500">
                  {calculating ? 'Calculando disponibilidade...' : 'Exibindo apenas membros disponíveis'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMemberSelect(false)} className="p-2 bg-white rounded-full">
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Conteúdo renderizado via função para evitar erro de JSX */}
            {renderModalContent()}

          </View>
        </View>
      </Modal>
    </View>
  );
}