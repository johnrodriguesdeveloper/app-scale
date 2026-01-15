import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Users, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

export default function DepartmentsScreen() {
  const router = useRouter();
  const [departments, setDepartments] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔍 Debug - User:', user);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, org_role')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Erro ao buscar perfil:', profileError);
        return;
      }

      if (profile) {
        setOrganizationId(profile.organization_id);
        const adminStatus = profile.org_role === 'admin';
        setIsAdmin(adminStatus);
        console.log('🔍 Debug - User role:', profile.org_role, '| isAdmin:', adminStatus, '| Full profile:', profile);

        // Buscar departamentos
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name, description')
          .eq('organization_id', profile.organization_id)
          .order('priority_order', { ascending: false });

        if (depts) {
          setDepartments(depts);

          // Verificar quais departamentos o usuário é líder
          const { data: deptMembers } = await supabase
            .from('department_members')
            .select('department_id')
            .eq('user_id', user.id)
            .eq('dept_role', 'leader');

          if (deptMembers) {
            const leaderMap: Record<string, boolean> = {};
            deptMembers.forEach((dm) => {
              leaderMap[dm.department_id] = true;
            });
            setIsLeader(leaderMap);
          }
        }
      }
    }

    loadUserData();
  }, []);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Departamentos</Text>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push('/create-department')}
              className="bg-blue-600 rounded-lg px-4 py-2.5 flex-row items-center shadow-sm"
            >
              <Plus size={18} color="white" style={{ marginRight: 6 }} />
              <Text className="text-white font-semibold text-sm">Criar Departamento</Text>
            </TouchableOpacity>
          )}
        </View>

        {departments.map((dept) => (
          <TouchableOpacity
            key={dept.id}
            onPress={() => router.push(`/(tabs)/departments/${dept.id}`)}
            className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-200"
          >
            <View>
              <Text className="text-lg font-semibold text-gray-900">
                {dept.name}
              </Text>
              {dept.description && (
                <Text className="text-gray-600 text-sm mt-1">{dept.description}</Text>
              )}
              {isLeader[dept.id] && (
                <View className="flex-row items-center mt-2">
                  <Users size={16} color="#3b82f6" />
                  <Text className="text-blue-600 text-sm ml-1">Você é líder</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {departments.length === 0 && (
          <View className="items-center py-8">
            <Text className="text-gray-500">Nenhum departamento encontrado</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
