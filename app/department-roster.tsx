import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2, X, Filter, Clock } from 'lucide-react-native';
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
  const [allServiceDays, setAllServiceDays] = useState<ServiceDay[]>([]); // Todos os serviços cadastrados
  const [currentDayServices, setCurrentDayServices] = useState<ServiceDay[]>([]); // Serviços do dia selecionado
  const [functions, setFunctions] = useState<any[]>([]);
  const [rosterEntries, setRosterEntries] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  // Filtro e Seleção
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [busyUsers, setBusyUsers] = useState<{user_id: string, service_day_id: string}[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null); // Novo: Saber pra qual culto estamos escalando
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [selectedFunctionName, setSelectedFunctionName] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [showMemberSelect, setShowMemberSelect] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [departmentId]);

  useEffect(() => {
    if (selectedDate && allServiceDays.length > 0) {
      updateServicesForSelectedDate(selectedDate);
      fetchRosterForDate(selectedDate);
      
      if (members.length > 0) {
        setCalculating(true);
        calculateHiddenUsers(selectedDate).finally(() => setCalculating(false));
      }
    }
  }, [selectedDate, allServiceDays, members]);

  // Scroll Automático do Calendário
  useEffect(() => {
    if (daysToShow.length > 0 && scrollViewRef.current) {
      const index = daysToShow.findIndex(day => isSameDay(day, selectedDate));
      if (index !== -1) {
        // Pequeno delay para garantir layout
        setTimeout(() => {
          try {
             scrollViewRef.current?.scrollTo({ x: index * 68, animated: true });
          } catch (e) {}
        }, 100);
      }
    }
  }, [currentDate, allServiceDays]); // Dependência ajustada

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    // Filtra apenas dias que tenham algum serviço cadastrado
    const serviceWeekDays = allServiceDays.map(sd => sd.day_of_week);
    return days.filter(day => serviceWeekDays.includes(getDay(day)));
  };

  const daysToShow = getDaysInMonth();

  const loadInitialData = async () => {
    setLoading(true);
    await fetchServiceDays(); // Busca todos os tipos de serviço
    await Promise.all([
      fetchFunctions(),
      fetchMembers()
    ]);
    setLoading(false);
  };

  const fetchServiceDays = async () => {
    const { data } = await supabase.from('service_days').select('*').order('day_of_week');
    if (data) setAllServiceDays(data);
  };

  // Atualiza a lista de cultos (seções) baseada no dia da semana escolhido
  const updateServicesForSelectedDate = (date: Date) => {
    const dayOfWeek = getDay(date);
    const services = allServiceDays.filter(sd => sd.day_of_week === dayOfWeek);
    setCurrentDayServices(services);
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
    // IMPORTANTE: Buscamos service_day_id para saber em qual card colocar
    const { data } = await supabase
      .from('rosters')
      .select(`
        id, function_id, member_id, service_day_id,
        department_members:member_id ( user_id, profiles:user_id ( full_name ) )
      `)
      .eq('department_id', departmentId)
      .eq('schedule_date', formattedDate);
    if (data) setRosterEntries(data);
  };

const calculateHiddenUsers = async (date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // 1. Exceções (Indisponibilidade pontual do membro)
      const { data: exceptions } = await supabase
        .from('availability_exceptions')
        .select('user_id, is_available')
        .eq('specific_date', dateStr);

      const hiddenSet = new Set<string>();
      members.forEach(member => {
        const userException = exceptions?.find(e => e.user_id === member.user_id);
        if (userException && !userException.is_available) {
          hiddenSet.add(member.user_id);
        }
      });
      setHiddenUserIds(Array.from(hiddenSet));

      // 2. Conflitos (Buscar todas as escalas em TODOS os departamentos neste dia)
      const { data: conflicts } = await supabase
        .from('rosters')
        .select(`
          service_day_id,
          department_members!inner ( user_id )
        `)
        .eq('schedule_date', dateStr);
      
      // Mapeia quem está ocupado e em qual culto
      const busyList = conflicts?.map((c: any) => ({
        user_id: c.department_members?.user_id,
        service_day_id: c.service_day_id
      })) || [];

      setBusyUsers(busyList);

    } catch (error) {
      console.error("Erro no cálculo:", error);
    }
  };

  // --- CORREÇÃO DO BOTÃO VOLTAR ---
  const handleBack = () => {
    // Força a volta para o DETALHE do departamento atual
    router.push({
        pathname: '/(tabs)/departments/[id]',
        params: { id: departmentId }
    });
  };

 const handleAddMember = async (memberId: string) => {
    if (!selectedFunctionId || !selectedServiceId) return;

    try {
      const { error } = await supabase.from('rosters').insert({
        department_id: departmentId,
        function_id: selectedFunctionId,
        member_id: memberId,
        service_day_id: selectedServiceId, 
        schedule_date: format(selectedDate, 'yyyy-MM-dd')
      });

      if (error) throw error;

      // SUCESSO: Apenas fecha o modal e recarrega os dados (sem avisos chatos)
      setShowMemberSelect(false);
      fetchRosterForDate(selectedDate);
      
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      
      // ERRO: Mostra o alerta de forma compatível com a Web para podermos debugar
      const msg = err.message || JSON.stringify(err);
      if (Platform.OS === 'web') {
        window.alert(`Erro ao escalar: ${msg}`);
      } else {
        Alert.alert("Erro ao escalar", msg);
      }
    }
  };

  const handleRemoveFromRoster = async (rosterId: string) => {
    await supabase.from('rosters').delete().eq('id', rosterId);
    fetchRosterForDate(selectedDate);
  };

 const filteredMembers = members.filter(member => {
    // 1. O membro tem a função necessária? (ex: é baixista?)
    const hasFunction = member.member_functions?.some(
      (mf: any) => mf.function_id === selectedFunctionId
    );
    
    // 2. Ele marcou que NÃO PODE neste dia inteiro?
    const isAvailable = !hiddenUserIds.includes(member.user_id);
    
    // 3. Ele JÁ ESTÁ ESCALADO em outro departamento exatamente NESTE CULTO?
    const isAlreadyBusyInThisService = busyUsers.some(
      b => b.user_id === member.user_id && b.service_day_id === selectedServiceId
    );
    
    return hasFunction && isAvailable && !isAlreadyBusyInThisService;
  });

  // Renderiza um Card de Função DENTRO de um serviço específico
  const renderFunctionCard = (func: any, serviceId: string) => {
    // Busca entrada no roster que bate com Função, Data E SERVIÇO
    const entry = rosterEntries.find(e => 
        e.function_id === func.id && 
        e.service_day_id === serviceId
    );

    return (
      <View key={`${func.id}-${serviceId}`} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 mb-2 shadow-sm flex-row items-center justify-between">
        <View>
          <Text className="text-gray-500 dark:text-zinc-400 text-xs uppercase font-bold tracking-wider mb-1">{func.name}</Text>
          {entry ? (
            <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-lg">
              {entry.department_members?.profiles?.full_name || 'Usuário'}
            </Text>
          ) : (
            <Text className="text-gray-400 dark:text-zinc-600 italic">Vago</Text>
          )}
        </View>

        {entry ? (
          <TouchableOpacity 
            onPress={() => handleRemoveFromRoster(entry.id)}
            className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-full items-center justify-center"
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={() => {
              setSelectedFunctionId(func.id);
              setSelectedFunctionName(func.name);
              setSelectedServiceId(serviceId); // Guarda o ID do serviço (ex: EBD ou Noite)
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
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      
      {/* Header */}
      <View className="bg-white dark:bg-zinc-900 px-4 pt-12 pb-4 border-b border-gray-200 dark:border-zinc-800 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-3 p-2 bg-gray-100 rounded-lg">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">{departmentName}</Text>
            <Text className="text-xs text-gray-500 dark:text-zinc-400">Gerenciar Escala</Text>
          </View>
        </View>
      </View>

      {/* Navegador de Mês */}
      <View className="flex-row items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
        <TouchableOpacity onPress={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronLeft size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800 dark:text-zinc-200 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </Text>
        <TouchableOpacity onPress={() => setCurrentDate(addMonths(currentDate, 1))}>
          <ChevronRight size={24} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Calendário Horizontal */}
      <View className="bg-white dark:bg-zinc-900 py-4 shadow-sm mb-1">
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
                className={`items-center justify-center w-14 h-16 rounded-xl mr-3 ${isSelected ? 'bg-blue-600' : 'bg-gray-100 dark:bg-zinc-800'}`}
              >
                <Text className={`text-xs mb-1 font-medium capitalize ${isSelected ? 'text-blue-200' : 'text-gray-500 dark:text-zinc-400'}`}>
                  {format(day, 'EEE', { locale: ptBR }).replace('.', '')}
                </Text>
                <Text className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-zinc-100'}`}>
                  {format(day, 'd')}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View className="w-6" />
        </ScrollView>
      </View>

      {/* Corpo da Escala */}
      <ScrollView className="flex-1 p-4">
        
        {loading ? (
          <ActivityIndicator color="#2563eb" className="mt-10"/>
        ) : (
          <>
            {/* LÓGICA PRINCIPAL: Loop pelos Serviços do Dia */}
            {currentDayServices.length > 0 ? (
                currentDayServices.map((service) => (
                    <View key={service.id} className="mb-8">
                        {/* Cabeçalho do Serviço (ex: EBD, Culto Noite) */}
                        <View className="flex-row items-center mb-3">
                            <Clock size={18} color="#3b82f6" style={{marginRight: 8}} />
                            <Text className="text-xl font-bold text-gray-800 dark:text-zinc-100">
                                {service.name}
                            </Text>
                        </View>

                        {/* Lista de Funções para este Serviço */}
                        {functions.length > 0 ? (
                            functions.map(func => renderFunctionCard(func, service.id))
                        ) : (
                            <Text className="text-gray-400 dark:text-zinc-600 italic">Sem funções definidas.</Text>
                        )}
                    </View>
                ))
            ) : (
                <View className="items-center justify-center mt-10">
                    <Text className="text-gray-400 dark:text-zinc-600">Nenhum evento configurado para este dia.</Text>
                </View>
            )}
          </>
        )}
        
        <View className="h-20" />
      </ScrollView>

      {/* Modal de Seleção */}
      <Modal
        visible={showMemberSelect}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMemberSelect(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-zinc-900 rounded-t-3xl h-[60%] w-full flex overflow-hidden">
            
            <View className="p-4 border-b border-gray-100 dark:border-zinc-800 flex-row justify-between items-center bg-gray-50 dark:bg-zinc-800">
              <View>
                <Text className="text-lg font-bold text-gray-800 dark:text-zinc-200">
                    Selecionar: {selectedFunctionName}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-zinc-400">
                  {calculating ? 'Verificando agenda...' : 'Membros disponíveis'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMemberSelect(false)} className="p-2 bg-white dark:bg-zinc-700 rounded-full">
                <X size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Lista de Membros no Modal */}
            <FlatList 
              data={filteredMembers}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View className="items-center py-10 px-4">
                  <Filter size={40} color="#ccc" />
                  <Text className="text-gray-500 dark:text-zinc-400 mt-4 text-center font-bold">Ninguém disponível</Text>
                  <Text className="text-gray-400 dark:text-zinc-600 text-center mt-1 text-sm">
                    Todos os membros habilitados estão indisponíveis ou já escalados.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => handleAddMember(item.id)}
                  className="flex-row items-center p-4 mb-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl active:bg-blue-50 dark:active:bg-blue-900/20"
                >
                  <View className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 rounded-full items-center justify-center mr-3">
                    <Text className="text-blue-700 dark:text-blue-400 font-bold text-lg">
                      {item.profiles?.full_name?.charAt(0) || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-base">
                      {item.profiles?.full_name || 'Sem nome'}
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