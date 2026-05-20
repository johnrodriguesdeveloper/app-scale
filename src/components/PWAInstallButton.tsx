import { TouchableOpacity, Text } from 'react-native';
import { Download } from 'lucide-react-native';
import { usePWAInstall } from '@/features/pwa/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, handleInstall } = usePWAInstall();


  if (!isInstallable) return null; 

  return (
    <TouchableOpacity 
      onPress={handleInstall}
      className="flex-row items-center py-2 px-3 rounded-lg bg-gray-100 dark:bg-zinc-900 active:bg-gray-200 dark:active:bg-zinc-700 border border-blue-600 dark:border-blue-500"
    >
      <Download size={14} className="text-gray-600 dark:text-zinc-300 mr-2" />
      <Text className="text-gray-700 dark:text-zinc-300 font-medium text-xs">
        Instalar App
      </Text>
    </TouchableOpacity>
  );
}