import { View, Text, Switch, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Info } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAvailability, fullDayNames } from '@/features/availability/useAvailability';

export default function AvailabilityRoutineScreen() {
  const router = useRouter();
  
  const {
    currentDate,
    serviceDays,
    loading,
    saving,
    isAtMinDate,
    handlePrevMonth,
    handleNextMonth,
    isAvailable,
    getDayAvailabilityForDate,
    getFilteredDaysInMonth,
    handleToggleRoutine,
    handleToggleException
  } = useAvailability();

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200 px-4 pt-12 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Minha Disponibilidade</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        
        <View className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200 flex-row items-center">
          <Info size={20} color="#b45309" style={{ marginRight: 8 }} />
          <Text className="flex-1 text-amber-900 font-medium text-sm">
            Alterar a "Rotina Padrão" vai limpar as exceções do calendário ligadas àquele dia da semana.
          </Text>
        </View>

        <Text className="text-gray-900 font-bold text-lg mb-3">Rotina Padrão</Text>
        <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8 shadow-sm">
          {serviceDays.length > 0 ? (
            serviceDays.map((serviceDay, index) => {
              const available = isAvailable(serviceDay.id);
              const isSaving = saving[serviceDay.id];
              return (
                <View key={serviceDay.id} className={`p-4 flex-row justify-between items-center ${index < serviceDays.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <View>
                    <Text className="font-bold text-gray-800 text-base">{fullDayNames[serviceDay.day_of_week]}</Text>
                    <Text className="text-gray-500 text-sm">{serviceDay.name}</Text>
                  </View>
                  <Switch
                    value={available}
                    onValueChange={(val) => handleToggleRoutine(serviceDay.id, val)}
                    disabled={isSaving}
                    trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
                  />
                </View>
              );
            })
          ) : (
            <Text className="p-4 text-center text-gray-500">Nenhum dia configurado.</Text>
          )}
        </View>

        {serviceDays.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-10 shadow-sm border border-gray-200 mt-4">
            <Text className="text-gray-900 font-semibold text-lg mb-4">Ajustes por Data (Exceções)</Text>
            
            <View className="flex-row items-center justify-between mb-4">
              <TouchableOpacity
                onPress={handlePrevMonth}
                disabled={isAtMinDate}
                className={`p-2 rounded-full ${isAtMinDate ? 'opacity-30' : 'bg-gray-200'}`}
              >
                <ChevronLeft size={20} color="#000" />
              </TouchableOpacity>
              <Text className="text-lg font-bold capitalize text-gray-900">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} className="p-2 rounded-full bg-gray-200">
                <ChevronRight size={20} color="#000" />
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
                    onPress={() => handleToggleException(date)}
                    disabled={isSaving}
                    className={`w-14 h-14 rounded-xl items-center justify-center border ${
                      isAvailable ? 'bg-white border-gray-200 shadow-sm' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={isAvailable ? '#9ca3af' : '#ef4444'} />
                    ) : (
                      <>
                        <Text className={`font-bold text-base ${isAvailable ? 'text-gray-900' : 'text-red-700'}`}>
                          {format(date, 'd')}
                        </Text>
                        <Text className={`font-medium text-xs capitalize ${isAvailable ? 'text-gray-500' : 'text-red-500'}`}>
                          {dayName.substring(0, 3)}
                        </Text>
                      </>
                    )}
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