import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Calendar, AlertCircle, Clock, CalendarDays } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { getUpcomingRosters } from '@/services/rosterService';
import { useDeadlineCheck } from '@/hooks/useDeadlineCheck';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NextRoster {
  id: string;
  schedule_date: string;
  function_name: string;
  department_name: string;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [upcomingRosters, setUpcomingRosters] = useState<any[]>([]);
  const [nextRoster, setNextRoster] = useState<NextRoster | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  // Buscar organização e departamento do usuário
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setOrganizationId(profile.organization_id);

        // Buscar primeiro departamento do usuário
        const { data: deptMember } = await supabase
          .from('department_members')
          .select('department_id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (deptMember) {
          setDepartmentId(deptMember.department_id);
        }
      }
    }

    loadUserData();
  }, []);

  // Buscar próxima escala do usuário
  useEffect(() => {
    async function loadNextRoster() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        // Buscar IDs de membro do usuário em todos os departamentos
        const { data: memberData } = await supabase
          .from('department_members')
          .select('id')
          .eq('user_id', user.id);

        if (!memberData || memberData.length === 0) {
          setLoading(false);
          return;
        }

        const memberIds = memberData.map(m => m.id);

        // Buscar próxima escala
        const today = new Date().toISOString().split('T')[0];
        const { data: rosterData } = await supabase
          .from('rosters')
          .select(`
            id,
            schedule_date,
            department_functions!inner (
              name
            ),
            departments!inner (
              name
            )
          `)
          .in('member_id', memberIds)
          .gte('schedule_date', today)
          .order('schedule_date', { ascending: true })
          .limit(1);

        if (rosterData && rosterData.length > 0) {
          const roster = rosterData[0];
          setNextRoster({
            id: roster.id,
            schedule_date: roster.schedule_date,
            function_name: (roster.department_functions as any).name,
            department_name: (roster.departments as any).name
          });
        }
      } catch (error) {
        console.error('Erro ao carregar próxima escala:', error);
      } finally {
        setLoading(false);
      }
    }

    loadNextRoster();
  }, []);

  // Verificar deadline
  const deadlineCheck = useDeadlineCheck(departmentId, organizationId);

  // Buscar próximas escalas
  useEffect(() => {
    async function loadRosters() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !organizationId) return;

      try {
        const rosters = await getUpcomingRosters(user.id, organizationId, 5);
        setUpcomingRosters(rosters || []);
      } catch (error) {
        console.error('Erro ao carregar escalas:', error);
      } finally {
        setLoading(false);
      }
    }

    if (organizationId) {
      loadRosters();
    }
  }, [organizationId]);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Card Principal: Sua Próxima Escala */}
        <View className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-4 shadow-lg">
          <View className="flex-row items-center mb-3">
            <CalendarDays size={24} color="black" className="mr-2" />
            <Text className="text-black text-lg font-semibold">Sua Próxima Escala </Text>
          </View>
          
          {nextRoster ? (
            <View>
              <Text className="text-black text-2xl font-bold mb-2">
                {format(parseISO(nextRoster.schedule_date), "EEEE, dd 'de' MMM", { locale: ptBR })}
              </Text>
              <Text className="text-blue-900 text-lg">
                {nextRoster.function_name} • {nextRoster.department_name}
              </Text>
            </View>
          ) : (
            <View className="items-center py-4">
              <CalendarDays size={32} color="rgba(255,255,255,0.7)" className="mb-2" />
              <Text className="text-white text-center">
                Nenhuma escala agendada para os próximos dias.
              </Text>
            </View>
          )}
        </View>

        {/* Widget de Calendário Semanal */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Calendário Semanal
          </Text>
          <View className="flex-row justify-between">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => {
              const hasRoster = upcomingRosters.some(
                (r) => new Date(r.schedule_date).getDay() === index
              );
              return (
                <View key={day} className="items-center">
                  <Text className="text-xs text-gray-500 mb-2">{day}</Text>
                  <View
                    className={`w-8 h-8 rounded-full ${
                      hasRoster ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Botão de Ação Rápida */}
        {deadlineCheck.canEdit && (
          <TouchableOpacity
            onPress={() => router.push('/availability')}
            className="bg-blue-500 rounded-xl p-4 mb-4"
          >
            <View className="flex-row items-center justify-center">
              <Calendar size={20} color="white" className="mr-2" />
              <Text className="text-white font-semibold text-lg">
                Informar Disponibilidade
              </Text>
            </View>
          </TouchableOpacity>
        )}

        

        {/* Lista de Próximas Escalas */}
        {upcomingRosters.length > 0 && (
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Próximas Escalas
            </Text>
            {upcomingRosters.map((roster) => (
              <View
                key={roster.id}
                className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
              >
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    {new Date(roster.schedule_date).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {(roster as any).function?.name} - {(roster as any).department?.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Botão Minha Disponibilidade */}
        <TouchableOpacity
          onPress={() => router.push('/availability/routine')}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 mb-4 shadow-md border border-blue-200"
        >
          <View className="flex-row items-center justify-center">
            <Clock size={20} color="black" className="mr-2" />
            <Text className="text-black font-semibold text-lg">
              Minha Disponibilidade
            </Text>
          </View>
          <Text className="text-blue-900 text-center text-sm mt-2">
            Defina seus dias disponíveis para escalas
          </Text>
        </TouchableOpacity>

        {loading && (
          <View className="items-center py-8">
            <Text className="text-gray-500">Carregando...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
