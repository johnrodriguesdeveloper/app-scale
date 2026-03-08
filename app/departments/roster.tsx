import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Plus, User } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColorScheme } from 'nativewind';
import { useRoster } from '@/features/roster/useRoster';
import { SelectMemberModal } from '@/features/roster/SelectMemberModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { RosterFunction, RosterMember, RosterEntry } from '@/types';

export default function RosterManagementScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';

  const { departmentId, departmentName } = useLocalSearchParams<{ 
    departmentId: string; 
    departmentName: string; 
  }>();
  
  const {
    currentDate,
    selectedDate,
    setSelectedDate,
    functions,
    members,
    loading,
    prevMonth,
    nextMonth,
    getDaysInMonth,
    getRosterForFunction,
    addMemberToRoster,
    removeMemberFromRoster,
    isSameDay
  } = useRoster(departmentId);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<RosterFunction | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    targetId: '',
    loading: false
  });

  const handleOpenAddMember = (functionItem: RosterFunction) => {
    setSelectedFunction(functionItem);
    setShowMemberModal(true);
  };

  const handleSelectMember = async (member: RosterMember) => {
    if (!selectedFunction) return;
    setSaving(true);
    try {
      await addMemberToRoster(member.user_id, selectedFunction.id);
      setShowMemberModal(false);
      setSelectedFunction(null);
    } catch (error: any) {
      Alert.alert('Erro', error.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoveMember = (roster: RosterEntry) => {
    setConfirmConfig({
      title: 'Remover da Escala',
      message: `Tem certeza que deseja remover ${roster.member?.name} da escala?`,
      targetId: roster.id,
      loading: false
    });
    setConfirmModalVisible(true);
  };

  const executeRemoveMember = async () => {
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    try {
      await removeMemberFromRoster(confirmConfig.targetId);
      setConfirmModalVisible(false);
    } catch (error: any) {
      setConfirmModalVisible(false);
      Alert.alert('Erro', error.message);
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      
      <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 pt-12 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
            <ArrowLeft size={20} color={iconColor} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">{departmentName}</Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-0.5">Gerenciar Escala</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        
        <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity onPress={prevMonth} className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
              <ChevronLeft size={20} color={iconColor} />
            </TouchableOpacity>
            
            <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-lg capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </Text>
            
            <TouchableOpacity onPress={nextMonth} className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
              <ChevronRight size={20} color={iconColor} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {getDaysInMonth().map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const dayName = format(date, 'EEE', { locale: ptBR });

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    onPress={() => setSelectedDate(date)}
                    className={`w-14 h-14 rounded-xl items-center justify-center border ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 shadow-sm'
                        : 'bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                    }`}
                  >
                    <Text className={`font-bold text-base ${isSelected ? 'text-white' : 'text-gray-900 dark:text-zinc-100'}`}>
                      {format(date, 'd')}
                    </Text>
                    <Text className={`text-xs capitalize font-medium ${isSelected ? 'text-blue-100' : 'text-gray-500 dark:text-zinc-400'}`}>
                      {dayName.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="p-4">
          <Text className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-4">
            Escala para {format(selectedDate, 'dd/MM/yyyy')}
          </Text>

          {functions.length > 0 ? (
            functions.map((func) => {
              const roster = getRosterForFunction(func.id);
              const isFilled = !!roster;

              return (
                <View
                  key={func.id}
                  className={`rounded-2xl p-4 mb-3 border ${
                    isFilled
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/50'
                      : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-4">
                      <Text className="text-gray-900 dark:text-zinc-100 font-bold text-lg">
                        {func.name}
                      </Text>
                      {func.description && (
                        <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-1">
                          {func.description}
                        </Text>
                      )}
                      
                      {isFilled && roster.member && (
                        <View className="flex-row items-center mt-3 bg-white dark:bg-zinc-800/50 self-start px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-900/50 shadow-sm">
                          <User size={14} color="#10b981" className="mr-2" />
                          <Text className="text-green-700 dark:text-green-400 font-semibold">
                            {roster.member.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {isFilled ? (
                      <TouchableOpacity
                        onPress={() => confirmRemoveMember(roster)}
                        className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl"
                      >
                        <X size={18} color="#ef4444" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleOpenAddMember(func)}
                        className="bg-blue-600 rounded-xl px-4 py-3 flex-row items-center shadow-sm"
                      >
                        <Plus size={16} color="white" className="mr-1.5" />
                        <Text className="text-white font-bold text-sm">Adicionar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-8 items-center border border-gray-200 dark:border-zinc-800">
              <Text className="text-gray-500 dark:text-zinc-400 text-center font-medium">
                Nenhuma função cadastrada.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SelectMemberModal 
        visible={showMemberModal}
        selectedFunction={selectedFunction}
        members={members}
        saving={saving}
        onClose={() => setShowMemberModal(false)}
        onSelect={handleSelectMember}
      />

      <ConfirmModal 
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={true}
        loading={confirmConfig.loading}
        onConfirm={executeRemoveMember}
        onCancel={() => setConfirmModalVisible(false)}
      />

    </View>
  );
}