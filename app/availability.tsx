import { View, Text, Switch, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceDay {
  id: string;
  day_of_week: number;
  name: string;
}

interface AvailabilityRoutine {
  user_id: string;
  service_day_id: string;
  is_available: boolean;
}

interface AvailabilityException {
  user_id: string;
  specific_date: string;
  service_day_id?: string;
  is_available: boolean;
}

const fullDayNames = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export default function AvailabilityRoutineScreen() {
  const router = useRouter();
  
  // Data mínima: próximo mês
  const minDate = startOfMonth(addMonths(new Date(), 1));

  const [currentMonth, setCurrentMonth] = useState(minDate);
  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRoutine[]>([]);
  const [monthExceptions, setMonthExceptions] = useState<AvailabilityException[]>([]);
  
  const [expandedCalendar, setExpandedCalendar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  // 1. Carga Inicial
  useEffect(() => {
    loadData();
  }, []);

  // 2. Carrega Exceções quando muda o mês
  useEffect(() => {
    if (serviceDays.length > 0) {
      loadMonthExceptions();
    }
  }, [currentMonth, serviceDays]);

  // 3. O SEGREDO: Recalcula o visual sempre que qualquer dado mudar (Rotina ou Exceção)
  useEffect(() => {
    if (serviceDays.length > 0) {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      generateExpandedCalendar(start, end, serviceDays, monthExceptions, availability);
    }
  }, [availability, monthExceptions, currentMonth, serviceDays]);

  const loadData = async () => {
    try {
      const { data: serviceData } = await supabase
        .from('service_days')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (serviceData) setServiceDays(serviceData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: routineData } = await supabase
        .from('availability_routine')
        .select('*')
        .eq('user_id', user.id);

      if (routineData) setAvailability(routineData);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthExceptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      const { data } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('user_id', user.id)
        .gte('specific_date', start.toISOString())
        .lte('specific_date', end.toISOString());

      if (data) setMonthExceptions(data);
      
      // Nota: Não chamamos generateExpandedCalendar aqui, o useEffect cuida disso

    } catch (error) {
      console.error(error);
    }
  };

  const generateExpandedCalendar = (
    start: Date, 
    end: Date, 
    services: ServiceDay[], 
    exceptions: AvailabilityException[],
    currentAvailability: AvailabilityRoutine[] // Recebe a rotina atualizada
  ) => {
    const daysInterval = eachDayOfInterval({ start, end });
    const calendarItems: any[] = [];

    daysInterval.forEach(date => {
      const dayOfWeek = getDay(date);
      const daysServices = services.filter(s => s.day_of_week === dayOfWeek);

      daysServices.forEach(service => {
        // Status Padrão (Rotina) - Usa a variável atualizada
        const routine = currentAvailability.find(r => r.service_day_id === service.id);
        const isRoutineAvailable = routine ? routine.is_available : true; 

        // Status Exceção
        const dateStr = format(date, 'yyyy-MM-dd');
        const exception = exceptions.find(e => 
          e.specific_date === dateStr && 
          (e.service_day_id === service.id || e.service_day_id === null)
        );

        // A Lógica: Se tem exceção, ela manda. Se não, manda a rotina.
        const finalStatus = exception ? exception.is_available : isRoutineAvailable;

        calendarItems.push({
          date: date,
          dateStr: dateStr,
          service: service,
          isAvailable: finalStatus,
          isException: !!exception,
          key: `${dateStr}-${service.id}`
        });
      });
    });

    setExpandedCalendar(calendarItems);
  };

  const handleToggleException = async (item: any, newValue: boolean) => {
    const itemKey = item.key;
    setSaving(prev => ({ ...prev, [itemKey]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Atualização Otimista (Visual instantâneo)
      const optimisticException = {
        user_id: user.id,
        specific_date: item.dateStr,
        service_day_id: item.service.id,
        is_available: newValue
      };

      setMonthExceptions(prev => {
        // Remove antiga se existir e adiciona nova
        const filtered = prev.filter(e => 
          !(e.specific_date === item.dateStr && e.service_day_id === item.service.id)
        );
        return [...filtered, optimisticException];
      });

      // Atualiza Banco
      const { error } = await supabase
        .from('availability_exceptions')
        .upsert(optimisticException, {
          onConflict: 'user_id,specific_date,service_day_id'
        });

      if (error) throw error;

    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar.");
      // Rollback se der erro (recarrega do banco)
      loadMonthExceptions();
    } finally {
      setSaving(prev => ({ ...prev, [itemKey]: false }));
    }
  };

  const handleToggleRoutine = async (serviceDayId: string, value: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // 1. Atualiza visualmente IMEDIATAMENTE (Otimista)
      setAvailability(prev => {
        const filtered = prev.filter(a => a.service_day_id !== serviceDayId);
        return [...filtered, { user_id: user.id, service_day_id: serviceDayId, is_available: value }];
      });

      // 2. Salva no banco em segundo plano
      await supabase.from('availability_routine').upsert({
        user_id: user.id, service_day_id: serviceDayId, is_available: value
      }, { onConflict: 'user_id,service_day_id' });
      
    } catch (e) { 
      console.error(e); 
      // Se der erro, poderíamos reverter aqui, mas loadData na montagem garante consistência
    }
  };

  const isAtMinDate = isSameDay(startOfMonth(currentMonth), minDate);

  if (loading) return <View className="flex-1 items-center justify-center bg-white dark:bg-zinc-900"><ActivityIndicator color="#2563eb"/></View>;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white dark:bg-zinc-900 px-4 pt-12 pb-4 border-b border-gray-200 dark:border-zinc-800 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Minha Disponibilidade</Text>
        </View>

        <ScrollView className="flex-1 p-4">
          
          {/* Aviso */}
          <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-6 border border-amber-200 dark:border-amber-700 flex-row items-center justify-center">
             <AlertCircle size={16} color="#92400e" className="mr-2"/>
             <Text className="text-amber-900 dark:text-amber-100 font-medium text-xs">
               Ajustes aqui sobrepõem a rotina padrão.
             </Text>
          </View>

          {/* --- SEÇÃO 1: ROTINA PADRÃO --- */}
          <Text className="text-gray-900 dark:text-zinc-100 font-bold text-lg mb-3">Rotina Semanal (Padrão)</Text>
          <View className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden mb-8 shadow-sm">
            {serviceDays.map((day, index) => {
              const routine = availability.find(r => r.service_day_id === day.id);
              const isOn = routine ? routine.is_available : true; 
              return (
                <View key={day.id} className={`p-4 flex-row justify-between items-center ${index < serviceDays.length -1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}`}>
                  <View>
                    <Text className="font-bold text-gray-800 dark:text-zinc-200 text-base">{fullDayNames[day.day_of_week]}</Text>
                    <Text className="text-gray-500 dark:text-zinc-400 text-sm">{day.name}</Text>
                  </View>
                  <Switch 
                    value={isOn} 
                    onValueChange={(val) => handleToggleRoutine(day.id, val)}
                    trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
                  />
                </View>
              );
            })}
          </View>

          {/* --- SEÇÃO 2: EXCEÇÕES (LISTA VERTICAL) --- */}
          <View className="flex-row items-center justify-between mb-4 mt-2">
             <TouchableOpacity 
               disabled={isAtMinDate}
               onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
               className={`p-2 rounded-full ${isAtMinDate ? 'opacity-30' : 'bg-gray-200 dark:bg-zinc-700'}`}
             >
               <ChevronLeft size={20} color="#000"/>
             </TouchableOpacity>
             <Text className="text-lg font-bold capitalize text-gray-900 dark:text-zinc-100">
               {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
             </Text>
             <TouchableOpacity 
               onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
               className="p-2 rounded-full bg-gray-200 dark:bg-zinc-700"
             >
               <ChevronRight size={20} color="#000"/>
             </TouchableOpacity>
          </View>

          {/* LISTA VERTICAL DE DATAS */}
          <View className="pb-10">
            {expandedCalendar.map((item) => (
              <View 
                key={item.key} 
                className={`mb-3 bg-white dark:bg-zinc-900 rounded-xl p-3 border flex-row items-center shadow-sm ${
                  item.isAvailable ? 'border-gray-100 dark:border-zinc-800' : 'border-red-100 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                }`}
              >
                 {/* Box da Data */}
                 <View className={`w-14 h-14 rounded-lg items-center justify-center mr-4 ${
                   item.isAvailable ? 'bg-gray-100 dark:bg-zinc-800' : 'bg-red-100 dark:bg-red-900/20'
                 }`}>
                    <Text className={`text-xs font-bold uppercase ${
                      item.isAvailable ? 'text-gray-500 dark:text-zinc-400' : 'text-red-500'
                    }`}>
                      {format(item.date, 'EEE', { locale: ptBR })}
                    </Text>
                    <Text className={`text-xl font-bold ${
                      item.isAvailable ? 'text-gray-900 dark:text-zinc-100' : 'text-red-700'
                    }`}>
                      {format(item.date, 'dd')}
                    </Text>
                 </View>

                 {/* Informações */}
                 <View className="flex-1 mr-2">
                    <Text className={`text-base font-semibold ${
                      item.isAvailable ? 'text-gray-800 dark:text-zinc-200' : 'text-red-800'
                    }`}>
                      {item.service.name}
                    </Text>
                    <Text className={`text-xs font-medium ${
                      item.isAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-600'
                    }`}>
                      {item.isAvailable ? 'Disponível' : 'Indisponível'}
                    </Text>
                 </View>

                 {/* Switch de Ação */}
                 {saving[item.key] ? (
                   <ActivityIndicator size="small" color="#2563eb" />
                 ) : (
                   <Switch 
                      value={item.isAvailable} 
                      onValueChange={(val) => handleToggleException(item, val)}
                      trackColor={{ false: '#ef4444', true: '#10b981' }}
                   />
                 )}
              </View>
            ))}
            
            {expandedCalendar.length === 0 && (
               <Text className="text-center text-gray-400 dark:text-zinc-600 mt-4">Nenhum evento neste mês.</Text>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}