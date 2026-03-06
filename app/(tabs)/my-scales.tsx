import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Linking, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, MapPin, X, Users, MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColorScheme } from 'nativewind';

interface Scale {
  id: string;
  schedule_date: string;
  department_id: string;
  service_day_id: string;
  department_functions: any;
  departments: any;
  service_days?: any;
}

interface TeamMember {
  id: string;
  function_name: string;
  member_name: string;
  member_phone: string | null;
}

export default function MyScalesScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  
  const [scales, setScales] = useState<Scale[]>([]);
  const [loading, setLoading] = useState(true);

  // --- ESTADOS DO MODAL E DA EQUIPE ---
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

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

      const { data: scaleData } = await supabase
        .from('rosters')
        .select(`
          id,
          schedule_date,
          department_id,
          service_day_id,
          department_functions ( name ),
          departments ( name ),
          service_days ( name )
        `)
        .in('member_id', memberIds)
        .gte('schedule_date', today)
        .order('schedule_date', { ascending: true });

      if (scaleData) {
        setScales(scaleData as Scale[]);
      }
    } catch (error) {
      console.error('Erro ao buscar escalas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenScaleDetails = async (scale: Scale) => {
    setSelectedScale(scale);
    setModalVisible(true);
    setLoadingTeam(true);

    try {
      const { data } = await supabase
        .from('rosters')
        .select(`
          id,
          department_functions ( name ),
          department_members (
            profiles ( full_name, phone )
          )
        `)
        .eq('department_id', scale.department_id)
        .eq('schedule_date', scale.schedule_date)
        .eq('service_day_id', scale.service_day_id);

      if (data) {
        const team: TeamMember[] = data.map((item: any) => {
          const funcName = Array.isArray(item.department_functions) ? item.department_functions[0]?.name : item.department_functions?.name;
          const profile = Array.isArray(item.department_members?.profiles) ? item.department_members.profiles[0] : item.department_members?.profiles;
          
          return {
            id: item.id,
            function_name: funcName || 'Sem função',
            member_name: profile?.full_name || 'Usuário',
            member_phone: profile?.phone || null
          };
        });

        team.sort((a, b) => a.function_name.localeCompare(b.function_name));
        setTeamMembers(team);
      }
    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleOpenWhatsApp = (phone: string | null, name: string) => {
    if (!phone) return;
    
    const cleanNumber = phone.replace(/\D/g, '');
    const message = `Olá ${name}, vi que estamos escalados juntos!`;
    const url = `whatsapp://send?phone=55${cleanNumber}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/55${cleanNumber}?text=${encodeURIComponent(message)}`);
      }
    }).catch(err => console.error('Erro ao abrir WhatsApp', err));
  };

  const getSafeName = (obj: any) => Array.isArray(obj) ? obj[0]?.name : obj?.name;

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
      {/* Header */}
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

      {/* --- NOVO MODAL ESTILO CONFIRMAÇÃO --- */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View className="flex-1 bg-black/60 justify-center items-center p-4">
          <View className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl overflow-hidden shadow-xl max-h-[85%]">
            
            {/* Header do Modal Centralizado */}
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

            {/* Lista da Equipe */}
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

            {/* Botão Fechar no rodapé do modal */}
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