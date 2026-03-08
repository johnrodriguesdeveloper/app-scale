import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, MapPin, X, Users, MessageCircle } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useMyScales } from '@/features/my-scales/useMyScales';
import { Scale } from '@/types';

export default function MyScalesScreen() {
  const { colorScheme } = useColorScheme();
  
  const {
    scales,
    loading,
    modalVisible,
    setModalVisible,
    selectedScale,
    teamMembers,
    loadingTeam,
    handleOpenScaleDetails,
    handleOpenWhatsApp,
    getSafeName
  } = useMyScales();

  const renderScaleCard = (scale: Scale) => {
    const date = parseISO(scale.schedule_date);
    const day = format(date, 'd');
    const month = format(date, 'MMM', { locale: ptBR }).toUpperCase();
    const weekday = format(date, 'EEEE', { locale: ptBR });
    const serviceName = getSafeName(scale.service_days);

    return (
      <TouchableOpacity 
        key={scale.id} 
        onPress={() => handleOpenScaleDetails(scale)}
        className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 mb-3 shadow-sm active:bg-gray-50 dark:active:bg-zinc-800"
      >
        <View className="flex-row items-center">
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mr-4 items-center min-w-[60px]">
            <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">{day}</Text>
            <Text className="text-xs font-semibold text-blue-500">{month}</Text>
          </View>

          <View className="flex-1">
            <Text className="text-gray-900 dark:text-zinc-100 font-bold text-lg mb-1">
             {getSafeName(scale.department_functions) || 'Função não definida'}
            </Text>
            
            <View className="flex-row items-center mb-1">
              <MapPin size={14} color={colorScheme === 'dark' ? '#a1a1aa' : '#6b7280'} className="mr-1" />
              <Text className="text-gray-600 dark:text-zinc-400 text-sm">
                {getSafeName(scale.departments) || 'Departamento'}
              </Text>
            </View>
            
            <Text className="text-gray-500 dark:text-zinc-500 text-xs capitalize">
              {weekday} {serviceName ? `• ${serviceName}` : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-500 dark:text-zinc-400 mt-2">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="bg-white dark:bg-zinc-900 px-6 py-7 border-b border-gray-200 dark:border-zinc-800 pt-14">
        <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Minhas Escalas</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {scales.length > 0 ? (
          <>
            <Text className="text-gray-600 dark:text-zinc-400 font-medium mb-4">
              {scales.length} escala{ scales.length > 1 ? 's' : '' } agendada{ scales.length > 1 ? 's' : '' }
            </Text>
            {scales.map(renderScaleCard)}
          </>
        ) : (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 bg-gray-100 dark:bg-zinc-800 rounded-full items-center justify-center mb-4">
              <Calendar size={32} color="#9ca3af" />
            </View>
            <Text className="text-gray-900 dark:text-zinc-100 font-bold text-lg mb-2">Nenhuma escala agendada</Text>
            <Text className="text-gray-500 text-center text-sm">
              Você não tem escalas agendadas para os próximos dias.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-xl max-h-[85%]">
            
            <View className="p-5 border-b border-gray-100 dark:border-zinc-800 flex-row justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">
                  Equipe Escalada
                </Text>
                {selectedScale && (
                  <Text className="text-sm font-medium text-gray-500 dark:text-zinc-400 capitalize mt-1">
                     {format(parseISO(selectedScale.schedule_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-gray-200 dark:bg-zinc-700 rounded-full ml-3">
                <X size={20} color={colorScheme === 'dark' ? '#e4e4e7' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4" contentContainerStyle={{ paddingBottom: 10 }}>
              {loadingTeam ? (
                <View className="items-center py-10">
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="text-gray-500 dark:text-zinc-400 mt-2">Buscando equipe...</Text>
                </View>
              ) : teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <View key={member.id} className="flex-row items-center justify-between bg-gray-50 dark:bg-zinc-800/80 p-4 rounded-2xl border border-gray-100 dark:border-zinc-700 mb-2">
                    <View className="flex-1">
                      <Text className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">
                        {member.function_name}
                      </Text>
                      <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-base">
                        {member.member_name}
                      </Text>
                    </View>

                    {member.member_phone ? (
                      <TouchableOpacity 
                        onPress={() => handleOpenWhatsApp(member.member_phone, member.member_name)}
                        className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full flex-row items-center"
                      >
                        <MessageCircle size={20} color={colorScheme === 'dark' ? '#4ade80' : '#16a34a'} />
                      </TouchableOpacity>
                    ) : (
                      <View className="px-2">
                        <Text className="text-xs text-gray-400 italic">S/ Número</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View className="items-center py-10">
                  <Users size={40} color="#ccc" />
                  <Text className="text-gray-500 dark:text-zinc-400 mt-4 text-center">Ninguém mais escalado.</Text>
                </View>
              )}
            </ScrollView>

            <View className="p-4 border-t border-gray-100 dark:border-zinc-800">
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                className="bg-gray-100 dark:bg-zinc-800 py-3.5 rounded-xl items-center"
              >
                <Text className="text-gray-700 dark:text-zinc-300 font-bold text-base">Fechar</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}