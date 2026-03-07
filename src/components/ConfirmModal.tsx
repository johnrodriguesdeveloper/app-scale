import { View, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { AlertTriangle, Shield } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import type { ConfirmModalProps } from '@/types/ui';


export function ConfirmModal({
  visible,
  title,
  message,
  isDestructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { colorScheme } = useColorScheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 bg-black/60 justify-center items-center p-4">
        <View className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-xl">
          <View className="items-center mb-4">
            <View className={`w-12 h-12 rounded-full items-center justify-center mb-3 ${isDestructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {isDestructive ? (
                <AlertTriangle size={24} color={colorScheme === 'dark' ? '#ef4444' : '#dc2626'} />
              ) : (
                <Shield size={24} color={colorScheme === 'dark' ? '#3b82f6' : '#2563eb'} />
              )}
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100 text-center mb-2">{title}</Text>
            <Text className="text-gray-500 dark:text-zinc-400 text-center text-base">{message}</Text>
          </View>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onCancel} className="flex-1 bg-gray-100 dark:bg-zinc-800 py-3 rounded-xl" disabled={loading}>
              <Text className="text-gray-700 dark:text-zinc-300 font-semibold text-center">Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} className={`flex-1 py-3 rounded-xl flex-row justify-center items-center ${isDestructive ? 'bg-red-600' : 'bg-blue-600'}`} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white font-semibold text-center">{isDestructive ? 'Excluir' : 'Confirmar'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}