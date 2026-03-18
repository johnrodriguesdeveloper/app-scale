import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Filter, Trash2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColorScheme } from 'nativewind';
import { useDepartmentRosterGrid } from '@/features/roster/useDepartmentRosterGrid';

export default function DepartmentRosterGridScreen() {
  const router = useRouter();
  const { departmentId, departmentName } = useLocalSearchParams<{ departmentId: string; departmentName: string; }>();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';

  const {
    currentMonth,
    loading,
    gridColumns,
    functions,
    showMemberSelect,
    setShowMemberSelect,
    selectedCell,
    setSelectedCell,
    saving,
    prevMonth,
    nextMonth,
    getRosterInCell,
    getFilteredMembers,
    handleAddMember,
    handleRemoveDirectly
  } = useDepartmentRosterGrid(departmentId);

  const filteredMembers = getFilteredMembers();

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 pt-12 pb-4 flex-row items-center justify-between z-10">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/departments/[id]', params: { id: departmentId }})}
            className="mr-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded-xl"
          >
            <ArrowLeft size={20} color={iconColor} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">{departmentName}</Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-sm">Escala Mensal</Text>
          </View>
        </View>

        <View className="flex-row items-center bg-gray-100 dark:bg-zinc-800 rounded-xl p-1">
          <TouchableOpacity onPress={prevMonth} className="p-2">
            <ChevronLeft size={20} color={iconColor} />
          </TouchableOpacity>
          <Text className="font-bold text-gray-900 dark:text-zinc-100 capitalize px-4 min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </Text>
          <TouchableOpacity onPress={nextMonth} className="p-2">
            <ChevronRight size={20} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ alignItems: 'center' }}>
        {loading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-center gap-4 max-w-[1400px]">
            {gridColumns.map((col, index) => (
              <View key={index} className="w-[320px] bg-white border-2 border-zinc-200 dark:border-zinc-700 mb-2 rounded-sm">
                
                <View className="bg-zinc-950 py-1 px-2 items-center justify-center">
                  <Text className="text-white font-bold text-xs uppercase">
                    {format(col.date, 'dd')} | {format(col.date, 'EEEE', { locale: ptBR })} {col.service.name}
                  </Text>
                </View>

                {functions.map((func, fIndex) => {
                  const cellData = getRosterInCell(func.id, col.dateStr, col.service.id);
                  const isLast = fIndex === functions.length - 1;

                  return (
                    <View key={func.id} className={`flex-row ${!isLast ? 'border-b-2 border-black' : ''}`}>
                      <View className="w-[35%] border-r-2 border-black p-1.5 justify-center bg-white">
                        <Text className="font-bold text-[11px] text-black" numberOfLines={2}>
                          {func.name}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCell({
                            functionId: func.id,
                            functionName: func.name,
                            serviceId: col.service.id,
                            date: col.date,
                            currentRosterId: cellData?.id
                          });
                          setShowMemberSelect(true);
                        }}
                        className="w-[65%] p-1.5 justify-center items-center bg-white"
                      >
                        {cellData ? (
                          <Text className="font-bold text-[11px] text-blue-700 text-center" numberOfLines={2}>
                            {cellData.member_name}
                          </Text>
                        ) : (
                          <Text className="font-bold text-[11px] text-gray-400 text-center">
                            --
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showMemberSelect} transparent animationType="fade" onRequestClose={() => setShowMemberSelect(false)}>
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm flex overflow-hidden shadow-2xl max-h-[80%]">
            <View className="p-4 border-b border-gray-100 dark:border-zinc-800 flex-row justify-between items-center bg-gray-50 dark:bg-zinc-800">
              <View className="flex-1 pr-2">
                <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                  {selectedCell?.functionName}
                </Text>
                {selectedCell && (
                  <Text className="text-xs font-medium text-gray-500 dark:text-zinc-400 mt-1 capitalize">
                    {format(selectedCell.date, "dd 'de' MMMM", { locale: ptBR })}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowMemberSelect(false)} className="p-2 bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-full">
                <X size={18} color={iconColor} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 12 }}>
              
              {selectedCell?.currentRosterId && (
                <TouchableOpacity
                  onPress={() => handleRemoveDirectly(selectedCell.currentRosterId!)}
                  disabled={saving}
                  className="flex-row items-center justify-center p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl"
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Trash2 size={16} color="#ef4444" className="mr-2" />
                      <Text className="text-red-600 dark:text-red-400 font-bold text-sm">Remover da Escala</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <Text className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2 ml-1">
                Disponíveis
              </Text>

              {filteredMembers.length === 0 ? (
                <View className="items-center py-8 px-4">
                  <Filter size={32} color="#cbd5e1" className="mb-2" />
                  <Text className="text-gray-500 dark:text-zinc-400 text-sm font-bold text-center">Ninguém disponível</Text>
                </View>
              ) : (
                filteredMembers.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleAddMember(item.id)}
                    disabled={saving}
                    className="flex-row items-center p-3 mb-2 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl"
                  >
                    <View className="flex-1">
                      <Text className="text-gray-900 dark:text-zinc-100 font-bold text-sm">
                        {item.profiles?.full_name || 'Sem nome'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}