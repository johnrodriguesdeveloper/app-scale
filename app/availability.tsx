import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  isSameDay,
  isBefore,
  startOfDay,
  isAfter
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AvailabilityScreen() {
  const [currentMonth, setCurrentMonth] = useState(addMonths(new Date(), 1)); // Próximo mês por padrão
  const [unavailableDates, setUnavailableDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = startOfDay(new Date());
  const nextMonthAllowed = startOfDay(addMonths(today, 1));

  // Verificar se o mês selecionado é permitido para edição
  const isMonthAllowed = isAfter(startOfMonth(currentMonth), startOfMonth(today)) || 
                         isSameMonth(startOfMonth(currentMonth), startOfMonth(nextMonthAllowed));

  // Buscar indisponibilidades do usuário
  const fetchUnavailability = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('member_unavailability')
        .select('unavailable_date')
        .eq('user_id', user.id)
        .gte('unavailable_date', monthStart)
        .lte('unavailable_date', monthEnd);

      if (error) {
        console.error('Erro ao buscar indisponibilidade:', error);
        return;
      }

      if (data) {
        const dates = new Set(data.map(item => item.unavailable_date));
        setUnavailableDates(dates);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchUnavailability();
  }, [fetchUnavailability]);

  // Salvar ou remover indisponibilidade
  const toggleDateAvailability = async (date: Date) => {
    if (!isMonthAllowed) {
      Alert.alert('Aviso', 'Só é permitido alterar a agenda do próximo mês em diante.');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = format(date, 'yyyy-MM-dd');
      const isUnavailable = unavailableDates.has(dateStr);

      if (isUnavailable) {
        // Remover indisponibilidade
        const { error } = await supabase
          .from('member_unavailability')
          .delete()
          .eq('user_id', user.id)
          .eq('unavailable_date', dateStr);

        if (error) {
          Alert.alert('Erro', 'Não foi possível remover a indisponibilidade.');
          return;
        }

        setUnavailableDates(prev => {
          const newSet = new Set(prev);
          newSet.delete(dateStr);
          return newSet;
        });
      } else {
        // Adicionar indisponibilidade
        const { error } = await supabase
          .from('member_unavailability')
          .insert({
            user_id: user.id,
            unavailable_date: dateStr
          });

        if (error) {
          Alert.alert('Erro', 'Não foi possível salvar a indisponibilidade.');
          return;
        }

        setUnavailableDates(prev => new Set(prev).add(dateStr));
      }
    } catch (error) {
      console.error('Erro ao salvar indisponibilidade:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  // Navegação de mês
  const goToPreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    // Verificar se o mês anterior ainda é permitido (deve ser >= próximo mês)
    if (isAfter(startOfMonth(newMonth), startOfMonth(today)) || 
        isSameMonth(startOfMonth(newMonth), startOfMonth(nextMonthAllowed))) {
      setCurrentMonth(newMonth);
    } else {
      Alert.alert("Atenção", "Você só pode gerenciar a disponibilidade a partir do próximo mês.");
    }
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Gerar dias do mês
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Adicionar dias vazios no início para alinhar com o dia da semana
    const startDayOfWeek = getDay(start);
    const emptyDays = Array(startDayOfWeek).fill(null);
    
    return [...emptyDays, ...days];
  };

  const getDayLabel = (dayIndex: number) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[dayIndex];
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text className="text-gray-500 mt-2">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity 
            onPress={goToPreviousMonth}
            className="p-2 rounded-lg bg-gray-100"
          >
            <ChevronLeft size={20} color="#374151" />
          </TouchableOpacity>
          
          <View className="items-center">
            <Text className="text-xl font-bold text-gray-900">Minha Disponibilidade</Text>
            <Text className="text-gray-600 text-sm capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={goToNextMonth}
            className="p-2 rounded-lg bg-gray-100"
          >
            <ChevronRight size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Aviso se o mês não for permitido */}
        {!isMonthAllowed && (
          <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex-row items-center">
            <AlertCircle size={16} color="#f59e0b" className="mr-2" />
            <Text className="text-yellow-800 text-sm flex-1">
              Só é permitido alterar a agenda do próximo mês em diante.
            </Text>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Legenda */}
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <View className="flex-row justify-center space-x-6">
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-red-500 rounded-full mr-2" />
              <Text className="text-gray-700 text-sm">Não Posso</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 bg-white border border-gray-300 rounded-full mr-2" />
              <Text className="text-gray-700 text-sm">Disponível</Text>
            </View>
          </View>
        </View>

        {/* Grade de dias */}
        <View className="bg-white rounded-xl p-4 border border-gray-200">
          {/* Dias da semana */}
          <View className="flex-row mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
              <View key={index} className="flex-1 items-center">
                <Text className="text-xs text-gray-500 font-medium uppercase">
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Dias do mês */}
          {saving ? (
            <View className="items-center py-8">
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text className="text-gray-500 text-sm mt-2">Salvando...</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap">
              {getDaysInMonth().map((day, index) => {
                if (day === null) {
                  // Dia vazio para alinhamento
                  return <View key={`empty-${index}`} className="w-1/7 h-12" />;
                }

                const dateStr = format(day, 'yyyy-MM-dd');
                const isUnavailable = unavailableDates.has(dateStr);
                const isToday = isSameDay(day, today);

                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => toggleDateAvailability(day)}
                    disabled={!isMonthAllowed}
                    className={`w-1/7 h-12 items-center justify-center rounded-lg mx-0.5 my-0.5 ${
                      isUnavailable 
                        ? 'bg-red-500 border border-red-600' 
                        : 'bg-white border border-gray-300'
                    } ${
                      isToday ? 'ring-2 ring-blue-500' : ''
                    } ${
                      !isMonthAllowed ? 'opacity-50' : ''
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      isUnavailable ? 'text-white' : 'text-gray-900'
                    }`}>
                      {format(day, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Informações adicionais */}
        <View className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
          <View className="flex-row items-start">
            <Calendar size={16} color="#3b82f6" className="mr-2 mt-0.5" />
            <View className="flex-1">
              <Text className="text-blue-900 font-medium text-sm mb-1">
                Como funciona:
              </Text>
              <Text className="text-blue-700 text-xs leading-relaxed">
                • Clique em um dia para marcar como indisponível{'\n'}
                • Clique novamente para remover a marcação{'\n'}
                • Apenas o próximo mês em diante pode ser editado{'\n'}
                • As alterações são salvas automaticamente
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
