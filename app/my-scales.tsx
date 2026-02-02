import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Definição mais flexível para evitar erros de tipagem
interface Scale {
  id: string;
  schedule_date: string;
  department_functions: any; // Pode ser array ou objeto
  departments: any; // Pode ser array ou objeto
}

export default function MyScalesScreen() {
  const router = useRouter();
  const [scales, setScales] = useState<Scale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyScales();
  }, []);

  const fetchMyScales = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberData } = await supabase
        .from('department_members')
        .select('id')
        .eq('user_id', user.id);

      if (!memberData || memberData.length === 0) {
        setLoading(false);
        return;
      }

      const memberIds = memberData.map(m => m.id);
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

      // Query corrigida: sem !inner forçado para evitar sumir dados se algo estiver nulo
      const { data: scaleData } = await supabase
        .from('rosters')
        .select(`
          id,
          schedule_date,
          department_functions ( name ),
          departments ( name )
        `)
        .in('member_id', memberIds)
        .gte('schedule_date', today)
        .order('schedule_date', { ascending: true });

      if (scaleData) {
        setScales(scaleData);
      }
    } catch (error) {
      console.error('Erro ao buscar escalas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderScaleCard = (scale: Scale) => {
    const date = parseISO(scale.schedule_date);
    const day = format(date, 'd');
    const month = format(date, 'MMM', { locale: ptBR }).toUpperCase();
    const weekday = format(date, 'EEEE', { locale: ptBR });

    // Helper seguro para pegar o nome independente se vier como array ou objeto
    const getFunctionName = () => {
      if (Array.isArray(scale.department_functions)) {
        return scale.department_functions[0]?.name;
      }
      return scale.department_functions?.name;
    };

    const getDepartmentName = () => {
      if (Array.isArray(scale.departments)) {
        return scale.departments[0]?.name;
      }
      return scale.departments?.name;
    };

    return (
      <View key={scale.id} className="bg-white p-4 rounded-xl border border-gray-100 mb-3 shadow-sm">
        <View className="flex-row items-center">
          {/* Data à esquerda */}
          <View className="bg-blue-50 rounded-lg p-3 mr-4 items-center min-w-[60px]">
            <Text className="text-2xl font-bold text-blue-600">{day}</Text>
            <Text className="text-xs text-blue-500">{month}</Text>
          </View>

          {/* Informações à direita */}
          <View className="flex-1">
            <Text className="text-gray-900 font-bold text-lg mb-1">
             Função: {getFunctionName() || 'Função não definida'}
            </Text>
            
            <View className="flex-row items-center mb-1">
              <MapPin size={14} color="#6b7280" className="mr-1" />
              <Text className="text-gray-600 text-sm">
                Departamento: {getDepartmentName() || 'Departamento'}
              </Text>
            </View>
            
            <Text className="text-gray-500 text-xs capitalize">
              {weekday}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-500 mt-2">Carregando...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 bg-gray-100 rounded-full">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Minhas Escalas</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {scales.length > 0 ? (
          <>
            <Text className="text-gray-600 font-medium mb-4">
              {scales.length} escala{ scales.length > 1 ? 's' : '' } agendada{ scales.length > 1 ? 's' : '' }
            </Text>
            {scales.map(renderScaleCard)}
          </>
        ) : (
          <View className="items-center justify-center py-20">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Calendar size={32} color="#9ca3af" />
            </View>
            <Text className="text-gray-900 font-bold text-lg mb-2">Nenhuma escala agendada</Text>
            <Text className="text-gray-500 text-center text-sm">
              Você não tem escalas agendadas para os próximos dias.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}