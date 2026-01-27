import { View, Text, Switch, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, parseISO } from 'date-fns';
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
  is_available: boolean;
}

const fullDayNames = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

export default function AvailabilityRoutineScreen() {
  const router = useRouter();
  const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRoutine[]>([]);
  const [monthExceptions, setMonthExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadMonthExceptions();
  }, [currentDate]);

  const loadData = async () => {
    try {
      // Buscar dias de culto da igreja
      const { data: serviceData, error: serviceError } = await supabase
        .from('service_days')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (serviceError) {
        console.error('Erro ao carregar dias de culto:', serviceError);
        return;
      }

      if (serviceData) {
        setServiceDays(serviceData);
      }

      // Buscar rotina de disponibilidade do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability_routine')
        .select('*')
        .eq('user_id', user.id);

      if (availabilityError) {
        console.error('Erro ao carregar disponibilidade:', availabilityError);
        return;
      }

      if (availabilityData) {
        setAvailability(availabilityData);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
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

      if (exceptionsError) {
        console.error('Erro ao carregar exceções:', exceptionsError);
        return;
      }

      if (exceptionsData) {
        setMonthExceptions(exceptionsData);
      }
    } catch (error) {
      console.error('Erro inesperado ao carregar exceções:', error);
    }
  };

  const isAvailable = (serviceDayId: string) => {
    const dayAvailability = availability.find(a => a.service_day_id === serviceDayId);
    // Se não existir registro, consideramos disponível (true)
    return dayAvailability ? dayAvailability.is_available : true;
  };

  const getDayAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // 1. Verificar se existe exceção para esta data
    const exception = monthExceptions.find(e => e.specific_date === dateStr);
    if (exception) {
      return exception.is_available;
    }
    
    // 2. Verificar rotina padrão para este dia da semana
    const dayOfWeek = getDay(date); // 0 = Domingo, 1 = Segunda, etc.
    const dayServiceDays = serviceDays.filter(sd => sd.day_of_week === dayOfWeek);
    
    if (dayServiceDays.length === 0) {
      return true; // Se não tem culto neste dia, considera disponível
    }
    
    // Verificar se pelo menos um culto do dia está disponível na rotina
    const hasAnyAvailable = dayServiceDays.some(sd => isAvailable(sd.id));
    return hasAnyAvailable;
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

      if (error) {
        console.error('Erro ao salvar exceção:', error);
        return;
      }

      // Recarregar exceções do mês
      await loadMonthExceptions();
    } catch (error) {
      console.error('Erro inesperado ao salvar exceção:', error);
    } finally {
      setSaving(prev => ({ ...prev, [dateStr]: false }));
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getFilteredDaysInMonth = () => {
    const allDays = getDaysInMonth();
    const serviceDayOfWeeks = serviceDays.map(sd => sd.day_of_week);
    return allDays.filter(day => serviceDayOfWeeks.includes(getDay(day)));
  };

  const handleToggleAvailability = async (serviceDayId: string, newValue: boolean) => {
    setSaving(prev => ({ ...prev, [serviceDayId]: true }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fazer upsert na tabela availability_routine
      const { error } = await supabase
        .from('availability_routine')
        .upsert({
          user_id: user.id,
          service_day_id: serviceDayId,
          is_available: newValue
        }, {
          onConflict: 'user_id,service_day_id'
        });

      if (error) {
        console.error('Erro ao salvar disponibilidade:', error);
        return;
      }

      // Atualizar estado local
      setAvailability(prev => {
        const filtered = prev.filter(a => a.service_day_id !== serviceDayId);
        return [...filtered, {
          user_id: user.id,
          service_day_id: serviceDayId,
          is_available: newValue
        }];
      });
    } catch (error) {
      console.error('Erro inesperado ao salvar:', error);
    } finally {
      setSaving(prev => ({ ...prev, [serviceDayId]: false }));
    }
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
          <Text className="text-xl font-bold text-gray-900">Minha Rotina Padrão</Text>
        </View>
      </View>

      {/* Conteúdo */}
      <ScrollView className="flex-1 p-4">
        {/* Texto explicativo */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-200">
          <Text className="text-blue-900 font-medium text-center">
            Marque abaixo os dias que você costuma estar disponível para escalas.
          </Text>
        </View>

        {/* Lista de Dias */}
        {serviceDays.length > 0 ? (
          serviceDays.map((serviceDay) => {
            const available = isAvailable(serviceDay.id);
            const isSaving = saving[serviceDay.id];

            return (
              <View key={serviceDay.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-lg">
                      {fullDayNames[serviceDay.day_of_week]}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {serviceDay.name}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className={`text-sm font-medium mr-3 ${
                      available ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {available ? 'Disponível' : 'Indisponível'}
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
          <View className="flex-1 items-center justify-center">
            <Text className="text-gray-500 text-center">
              Nenhum dia de culto cadastrado ainda.
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Peça ao administrador para configurar os dias de culto primeiro.
            </Text>
          </View>
        )}

        {/* Calendário de Exceções Mensais */}
        {serviceDays.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200">
            <Text className="text-gray-900 font-semibold text-lg mb-4">
              Exceções Mensais
            </Text>
            
            {/* Seletor de Mês */}
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

            {/* Grid do Calendário */}
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
                      isAvailable 
                        ? 'bg-green-500 border-green-600' 
                        : 'bg-red-500 border-red-600'
                    } border`}
                  >
                    <Text className="text-white font-bold text-xs">
                      {format(date, 'd')}
                    </Text>
                    <Text className="text-white font-medium text-xs capitalize">
                      {dayName.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legenda */}
            <View className="mt-4 pt-4 border-t border-gray-200">
              <Text className="text-gray-500 text-sm text-center">
                Toque para mudar a disponibilidade de uma data específica
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
