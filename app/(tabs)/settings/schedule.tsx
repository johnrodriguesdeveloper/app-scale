import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Plus, Edit2, Trash2, ArrowLeft, CalendarDays } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useSchedule } from '@/features/settings/useSchedule';
import { ScheduleFormModal } from '@/features/settings/ScheduleFormModal';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ServiceDay } from '@/types';

const weekDaysLabel = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ScheduleScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e4e4e7' : '#374151';

  const { serviceDays, loading, saveServiceDay, deleteServiceDay } = useSchedule();
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDay, setEditingDay] = useState<ServiceDay | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    targetId: '',
    loading: false
  });

  const handleOpenAdd = () => {
    setEditingDay(null);
    setShowFormModal(true);
  };

  const handleOpenEdit = (day: ServiceDay) => {
    setEditingDay(day);
    setShowFormModal(true);
  };

  const confirmDelete = (day: ServiceDay) => {
    setConfirmConfig({
      title: 'Excluir Evento',
      message: `Tem certeza que deseja excluir "${day.name}" da agenda?`,
      targetId: day.id,
      loading: false
    });
    setConfirmModalVisible(true);
  };

  const executeDelete = async () => {
    setConfirmConfig(prev => ({ ...prev, loading: true }));
    try {
      await deleteServiceDay(confirmConfig.targetId);
      setConfirmModalVisible(false);
    } catch (error) {
    } finally {
      setConfirmConfig(prev => ({ ...prev, loading: false }));
    }
  };

  const renderServiceDay = ({ item }: { item: ServiceDay }) => (
    <View className="bg-white dark:bg-zinc-900 rounded-xl p-4 mb-3 shadow-sm border border-gray-200 dark:border-zinc-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <View className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full mr-3">
              <Text className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                {weekDaysLabel[item.day_of_week] || 'Inválido'}
              </Text>
            </View>
          </View>
          <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-lg">
            {item.name}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity onPress={() => handleOpenEdit(item)} className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Edit2 size={16} color={colorScheme === 'dark' ? '#60a5fa' : '#3b82f6'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-zinc-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-zinc-950">
      <View className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-4 pt-12 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-100 dark:bg-zinc-800 rounded-lg">
          <ArrowLeft size={20} color={iconColor} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">Agenda da Igreja</Text>
      </View>

      <View className="flex-1 p-4">
        {serviceDays.length > 0 ? (
          <FlatList
            data={serviceDays}
            renderItem={renderServiceDay}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <CalendarDays size={48} color={colorScheme === 'dark' ? '#52525b' : '#9ca3af'} />
            <Text className="text-gray-500 dark:text-zinc-400 text-center mt-4 font-semibold text-lg">
              Agenda vazia
            </Text>
            <Text className="text-gray-400 dark:text-zinc-500 text-sm text-center mt-2 px-6">
              Toque no botão flutuante para adicionar seus cultos e eventos semanais.
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        onPress={handleOpenAdd}
        className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Plus size={24} color="white" />
      </TouchableOpacity>

      <ScheduleFormModal 
        visible={showFormModal}
        editingDay={editingDay}
        onClose={() => setShowFormModal(false)}
        onSave={saveServiceDay}
      />

      <ConfirmModal 
        visible={confirmModalVisible}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={true}
        loading={confirmConfig.loading}
        onConfirm={executeDelete}
        onCancel={() => setConfirmModalVisible(false)}
      />
    </View>
  );
}