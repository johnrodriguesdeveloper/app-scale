import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Department } from '@/types';

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLeader, setIsLeader] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, org_role')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        const masterStatus = profile.org_role === 'master';
        const adminStatus = profile.org_role === 'admin' || masterStatus;
        
        setIsMaster(masterStatus);
        setIsAdmin(adminStatus);

        let deptsData = [];

        if (adminStatus) {
          const { data } = await supabase
            .from('departments')
            .select('id, name, description')
            .eq('organization_id', profile.organization_id)
            .is('parent_id', null)
            .order('priority_order', { ascending: false });
          deptsData = data || [];
        } else {
          const { data } = await supabase
            .from('departments')
            .select('id, name, description, department_members!inner(user_id)')
            .eq('department_members.user_id', user.id)
            .order('name');
          deptsData = data || [];
        }

        setDepartments(deptsData as Department[]);

        const { data: deptMembers } = await supabase
          .from('department_members')
          .select('department_id')
          .eq('user_id', user.id)
          .eq('dept_role', 'leader');

        if (deptMembers) {
          const leaderMap: Record<string, boolean> = {};
          deptMembers.forEach((dm) => { leaderMap[dm.department_id] = true; });
          setIsLeader(leaderMap);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDepartments();
    }, [fetchDepartments])
  );

  const deleteDepartment = async (departmentId: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', departmentId);
    
    if (error) {
      throw new Error('Verifique se há membros ou escalas vinculadas antes de excluir.');
    }

    setDepartments((prev) => prev.filter((d) => d.id !== departmentId));
  };

  return {
    departments,
    loading,
    isAdmin,
    isMaster,
    isLeader,
    deleteDepartment
  };
}