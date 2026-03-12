import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getAvailableMembersByFunction, createRoster } from '@/services/rosterService';
import { RosterDepartment, RosterFunction, AvailableMember } from '@/types';

export function useCreateRoster() {
  const router = useRouter();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [departments, setDepartments] = useState<RosterDepartment[]>([]);
  const [functions, setFunctions] = useState<RosterFunction[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

        const { data: deptMembers } = await supabase
          .from('department_members')
          .select('department_id, departments(id, name)')
          .eq('user_id', user.id)
          .eq('dept_role', 'leader');

        if (deptMembers) {
          const depts = deptMembers.map((dm: any) => ({
            id: dm.department_id,
            name: dm.departments.name,
          }));
          setDepartments(depts);
          if (depts.length > 0) {
            setSelectedDepartment(depts[0].id);
          }
        }
      }
    }
    loadUserData();
  }, []);

  useEffect(() => {
    async function loadFunctions() {
      if (!selectedDepartment) return;

      const { data } = await supabase
        .from('department_functions')
        .select('id, name')
        .eq('department_id', selectedDepartment)
        .order('name');

      if (data) {
        setFunctions(data as RosterFunction[]);
        if (data.length > 0) {
          setSelectedFunction(data[0].id);
        }
      }
    }
    loadFunctions();
  }, [selectedDepartment]);

  useEffect(() => {
    async function loadAvailableMembers() {
      if (!selectedDepartment || !selectedFunction || !organizationId) {
        setAvailableMembers([]);
        return;
      }

      setLoading(true);
      try {
        const members = await getAvailableMembersByFunction(
          organizationId,
          selectedDepartment,
          selectedFunction,
          selectedDate
        );
        setAvailableMembers(members);
      } catch (error: any) {
        Alert.alert('Erro', error.message || 'Erro ao buscar membros disponíveis');
      } finally {
        setLoading(false);
      }
    }

    loadAvailableMembers();
  }, [selectedDepartment, selectedFunction, selectedDate, organizationId]);

  const handleCreateRoster = async (userId: string) => {
    if (!organizationId || !selectedDepartment || !selectedFunction) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      await createRoster(
        organizationId,
        selectedDate,
        selectedDepartment,
        userId,
        selectedFunction,
        user.id
      );

      Alert.alert('Sucesso', 'Escala criada com sucesso!');
      router.back();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar escala');
    } finally {
      setLoading(false);
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    selectedDepartment,
    setSelectedDepartment,
    selectedFunction,
    setSelectedFunction,
    availableMembers,
    departments,
    functions,
    loading,
    handleCreateRoster
  };
}