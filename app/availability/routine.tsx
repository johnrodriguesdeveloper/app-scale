import { View, Text, Switch, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'; // Adicionei Alert
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, isBefore } from 'date-fns'; // Adicionei isBefore
import { ptBR } from 'date-fns/locale';

// ... (Interfaces e fullDayNames continuam iguais)
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
  is_available: boolean;
}

const fullDayNames = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
];

export default function AvailabilityRoutineScreen() {
  const router = useRouter();
  
  // 1. AJUSTE: Data mínima permitida é o início do próximo mês
  const minDate = startOfMonth(addMonths(new Date(), 1));

  // 2. AJUSTE: Estado inicial já começa no próximo mês
  const [currentDate, setCurrentDate] = useState(minDate);
  
  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRoutine[]>([]);
  const [monthExceptions, setMonthExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMonthExceptions();
  }, [currentDate]);

  // Função para controlar o "Voltar Mês"
  const handlePrevMonth = () => {
    const prevMonth = subMonths(currentDate, 1);
    
    // Se tentar voltar para antes da data mínima, bloqueia
    if (isBefore(prevMonth, minDate)) {
      Alert.alert("Bloqueado", "Você só pode alterar a disponibilidade a partir do próximo mês.");
      return;
    }
    
    setCurrentDate(prevMonth);
  };

  const loadData = async () => {
    try {
      // Buscar dias de culto
      const { data: serviceData, error: serviceError } = await supabase
        .from('service_days')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (serviceError) throw serviceError;
      if (serviceData) setServiceDays(serviceData);

      // Buscar rotina
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability_routine')
        .select('*')
        .eq('user_id', user.id);

      if (availabilityError) throw availabilityError;
      if (availabilityData) setAvailability(availabilityData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthExceptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startOfMonthDate = startOfMonth(currentDate);
      const endOfMonthDate = endOfMonth(currentDate);

      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('user_id', user.id)
        .gte('specific_date', startOfMonthDate.toISOString().split('T')[0])
        .lte('specific_date', endOfMonthDate.toISOString().split('T')[0]);

      if (exceptionsError) throw exceptionsError;
      if (exceptionsData) setMonthExceptions(exceptionsData);
      
    } catch (error) {
      console.error('Erro ao carregar exceções:', error);
    }
  };

  const isAvailable = (serviceDayId: string) => {
    const dayAvailability = availability.find(a => a.service_day_id === serviceDayId);
    return dayAvailability ? dayAvailability.is_available : true;
  };

  const getDayAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const exception = monthExceptions.find(e => e.specific_date === dateStr);
    if (exception) return exception.is_available;
    
    const dayOfWeek = getDay(date);
    const dayServiceDays = serviceDays.filter(sd => sd.day_of_week === dayOfWeek);
    
    if (dayServiceDays.length === 0) return true;
    return dayServiceDays.some(sd => isAvailable(sd.id));
  };

  const handleToggleDateAvailability = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const currentAvailability = getDayAvailabilityForDate(date);
    const newAvailability = !currentAvailability;
    
    setSaving(prev => ({ ...prev, [dateStr]: true }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('availability_exceptions')
        .upsert({
          user_id: user.id,
          specific_date: dateStr,
          is_available: newAvailability
        }, {
          onConflict: 'user_id,specific_date'
        });

      if (error) throw error;
      await loadMonthExceptions();
      
    } catch (error) {
      console.error('Erro ao salvar exceção:', error);
      Alert.alert('Erro', 'Não foi possível salvar a alteração.');
    } finally {
      setSaving(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  const getFilteredDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const allDays = eachDayOfInterval({ start, end });
    const serviceDayOfWeeks = serviceDays.map(sd => sd.day_of_week);
    return allDays.filter(day => serviceDayOfWeeks.includes(getDay(day)));
  };

  const handleToggleAvailability = async (serviceDayId: string, newValue: boolean) => {
    setSaving(prev => ({ ...prev, [serviceDayId]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('availability_routine')
        .upsert({
          user_id: user.id,
          service_day_id: serviceDayId,
          is_available: newValue
        }, {
          onConflict: 'user_id,service_day_id'
        });

      if (error) throw error;

      setAvailability(prev => {
        const filtered = prev.filter(a => a.service_day_id !== serviceDayId);
        return [...filtered, {
          user_id: user.id,
          service_day_id: serviceDayId,
          is_available: newValue
        }];
      });
    } catch (error) {
      console.error('Erro ao salvar rotina:', error);
      Alert.alert('Erro', 'Não foi possível salvar a rotina.');
    } finally {
      setSaving(prev => ({ ...prev, [serviceDayId]: false }));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Verifica se estamos no mês mínimo para desabilitar visualmente a seta
  const isAtMinDate = isSameDay(startOfMonth(currentDate), minDate);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Minha Disponibilidade</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Aviso de Regra */}
        <View className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200">
          <Text className="text-amber-900 font-medium text-center text-sm">
            📅 O sistema libera a agenda apenas a partir do próximo mês.
          </Text>
        </View>

        {/* ... (Lista de Dias da Rotina Padrão - Mantida igual) ... */}
        {serviceDays.length > 0 ? (
          serviceDays.map((serviceDay) => {
            const available = isAvailable(serviceDay.id);
            const isSaving = saving[serviceDay.id];
            return (
              <View key={serviceDay.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-lg">{fullDayNames[serviceDay.day_of_week]}</Text>
                    <Text className="text-gray-500 text-sm mt-1">{serviceDay.name}</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className={`text-sm font-medium mr-3 ${available ? 'text-green-600' : 'text-red-600'}`}>
                      {available ? 'Disponível' : 'Indisponíve'}
                    </Text>
                     <Switch
                      value={available}
                      onValueChange={(newValue) => handleToggleAvailability(serviceDay.id, newValue)}
                      disabled={isSaving}
                      trackColor={{ false: '#ef4444', true: '#10b981' }}
                      thumbColor={isSaving ? '#9ca3af' : '#ffffff'}
                    />
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <Text className="text-gray-500 text-center py-4">Carregando dias de culto...</Text>
        )}

        {/* Calendário de Exceções Mensais */}
        {serviceDays.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200 mt-4">
            <Text className="text-gray-900 font-semibold text-lg mb-4">Ajustes por Data (Exceções)</Text>
            
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={handlePrevMonth}
                disabled={isAtMinDate} // Desabilita o clique
                className={`p-2 rounded-lg ${isAtMinDate ? 'bg-gray-50 opacity-50' : 'bg-gray-100'}`}
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

            <View className="flex-row flex-wrap gap-2 justify-center">
              {getFilteredDaysInMonth().map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const isAvailable = getDayAvailabilityForDate(date);
                const isSaving = saving[dateStr];
                const dayName = format(date, 'EEE', { locale: ptBR });

                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => handleToggleDateAvailability(date)}
                    disabled={isSaving}
                    className={`w-12 h-12 rounded-lg items-center justify-center ${
                      isAvailable ? 'bg-green-500 border-green-600' : 'bg-red-500 border-red-600'
                    } border`}
                  >
                    <Text className="text-white font-bold text-xs">{format(date, 'd')}</Text>
                    <Text className="text-white font-medium text-xs capitalize">{dayName.substring(0, 3)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}