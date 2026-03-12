import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { ServiceDay } from '@/types';

interface ScheduleFormModalProps {
  visible: boolean;
  editingDay: ServiceDay | null;
  onClose: () => void;
  onSave: (dayOfWeek: number, name: string, id?: string) => Promise<void>;
}

const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function ScheduleFormModal({
  visible,
  editingDay,
  onClose,
  onSave,
}: ScheduleFormModalProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#a1a1aa' : '#9ca3af';

  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [eventName, setEventName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedDay(editingDay ? editingDay.day_of_week : 0);
      setEventName(editingDay ? editingDay.name : '');
      setErrorMsg('');
    }
  }, [visible, editingDay]);

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      await onSave(selectedDay, eventName, editingDay?.id);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
          
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">
              {editingDay ? 'Editar Evento' : 'Novo Evento'}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
              <X size={20} color={iconColor} />
            </TouchableOpacity>
          </View>

          {errorMsg ? (
            <View className="bg-red-50 dark:bg-red-900/30 px-4 py-3 rounded-lg border border-red-100 dark:border-red-800 mb-4">
              <Text className="text-red-600 dark:text-red-400 text-sm font-medium text-center">{errorMsg}</Text>
            </View>
          ) : null}

          <View className="mb-6">
            <Text className="text-gray-600 dark:text-zinc-400 font-semibold mb-2">Dia da Semana</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {daysOfWeek.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedDay(index)}
                  className={`px-3 py-2 rounded-full border ${
                    selectedDay === index 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                  }`}
                >
                  <Text className={`text-xs font-bold ${selectedDay === index ? 'text-white' : 'text-gray-600 dark:text-zinc-400'}`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-gray-600 dark:text-zinc-400 font-semibold mb-2">Nome do Culto</Text>
            <TextInput
              className="bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-700 rounded-lg p-3 text-gray-900 dark:text-zinc-100"
              placeholder="Ex: Culto de Ensino"
              placeholderTextColor={iconColor}
              value={eventName}
              onChangeText={setEventName}
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`w-full rounded-xl py-3 items-center flex-row justify-center ${saving ? 'bg-blue-400' : 'bg-blue-600'}`}
          >
            {saving ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-bold text-base">{editingDay ? 'Atualizar' : 'Adicionar'}</Text>}
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}