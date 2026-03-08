import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { RosterMember, RosterFunction } from '@/types';

interface SelectMemberModalProps {
  visible: boolean;
  selectedFunction: RosterFunction | null;
  members: RosterMember[];
  saving: boolean;
  onClose: () => void;
  onSelect: (member: RosterMember) => Promise<void>;
}

export function SelectMemberModal({
  visible,
  selectedFunction,
  members,
  saving,
  onClose,
  onSelect,
}: SelectMemberModalProps) {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#a1a1aa' : '#6b7280';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 h-[75%]">
          
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-900 dark:text-zinc-100">
              Selecionar Membro
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
              <X size={20} color={iconColor} />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-600 dark:text-zinc-400 mb-4 font-medium">
            Função: <Text className="text-gray-900 dark:text-zinc-200 font-bold">{selectedFunction?.name}</Text>
          </Text>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {members.map((member) => (
              <TouchableOpacity
                key={member.id}
                onPress={() => onSelect(member)}
                disabled={saving}
                className="bg-gray-50 dark:bg-zinc-800/80 rounded-xl p-4 mb-2 flex-row items-center border border-gray-100 dark:border-zinc-700"
              >
                <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mr-4">
                  <Text className="text-blue-600 dark:text-blue-400 font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-zinc-100 font-semibold text-base">
                    {member.name}
                  </Text>
                  {member.email && (
                    <Text className="text-gray-500 dark:text-zinc-400 text-sm mt-0.5">
                      {member.email}
                    </Text>
                  )}
                </View>
                {saving && <ActivityIndicator size="small" color="#2563eb" />}
              </TouchableOpacity>
            ))}
            
            {members.length === 0 && (
              <View className="items-center py-10">
                <Text className="text-gray-500 dark:text-zinc-400 text-center">Nenhum membro disponível.</Text>
              </View>
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}