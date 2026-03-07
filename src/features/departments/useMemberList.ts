import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DepartmentMember, Profile, DepartmentFunction } from '@/types';

export function useMemberList(departmentId: string | string[] | undefined) {
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [departmentLeaders, setDepartmentLeaders] = useState<string[]>([]);
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<DepartmentFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (departmentId) {
      loadInitialData();
    }
  }, [departmentId]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      checkPermissions(),
      loadMembers(),
      loadAvailableFunctions()
    ]);
    setLoading(false);
  };

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_role')
      .eq('user_id', user.id)
      .single();

    const isGlobalAdmin = profile?.org_role === 'admin' || profile?.org_role === 'master';

    const { data: leaderRecord } = await supabase
      .from('department_leaders')
      .select('id')
      .eq('user_id', user.id)
      .eq('department_id', String(departmentId))
      .maybeSingle();

    setCanEdit(isGlobalAdmin || !!leaderRecord);
  };

  const loadMembers = async () => {
    const { data: leadersData } = await supabase
      .from('department_leaders')
      .select('user_id')
      .eq('department_id', String(departmentId));

    const leaderIds = leadersData?.map(l => l.user_id) || [];
    setDepartmentLeaders(leaderIds);

    const { data, error } = await supabase
      .from('department_members')
      .select(`
        id, user_id, dept_role,
        profiles ( full_name, avatar_url, email ),
        member_functions (
          department_functions ( id, name )
        )
      `)
      .eq('department_id', String(departmentId));

    if (error) throw error;

    if (data) {
      const sorted = (data as unknown as DepartmentMember[]).sort((a, b) => {
        const aIsLeader = leaderIds.includes(a.user_id);
        const bIsLeader = leaderIds.includes(b.user_id);
        if (aIsLeader && !bIsLeader) return -1;
        if (!aIsLeader && bIsLeader) return 1;
        return (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '');
      });
      setMembers(sorted);
    }
  };

  const loadAvailableProfiles = async () => {
    const { data: allProfiles } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
    const { data: existing } = await supabase.from('department_members').select('user_id').eq('department_id', String(departmentId));
    const existingIds = existing?.map(m => m.user_id) || [];
    setAvailableProfiles((allProfiles || []).filter(p => !existingIds.includes(p.id)));
  };

  const loadAvailableFunctions = async () => {
    const { data } = await supabase.from('department_functions').select('id, name').eq('department_id', String(departmentId)).order('name');
    if (data) setAvailableFunctions(data);
  };

  const addMember = async (userId: string, functionIds: string[]) => {
    const { data: newMember, error: memError } = await supabase
      .from('department_members')
      .insert({ department_id: String(departmentId), user_id: userId, dept_role: 'member' })
      .select()
      .single();

    if (memError) throw new Error(memError.message);

    if (functionIds.length > 0) {
      const functionsToInsert = functionIds.map(funcId => ({
        member_id: newMember.id,
        function_id: funcId
      }));

      const { error: funcError } = await supabase
        .from('member_functions')
        .insert(functionsToInsert);

      if (funcError) throw new Error(funcError.message);
    }

    await loadMembers();
  };

  const addFunctionsToMember = async (memberId: string, functionIds: string[]) => {
    if (functionIds.length === 0) return;

    const functionsToInsert = functionIds.map(funcId => ({
      member_id: memberId,
      function_id: funcId
    }));

    const { error } = await supabase
      .from('member_functions')
      .insert(functionsToInsert);

    if (error) {
      if (error.code === '23505') throw new Error('O membro já possui uma das funções selecionadas.');
      throw new Error(error.message);
    }

    await loadMembers();
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('rosters').delete().eq('member_id', memberId);
    await supabase.from('member_functions').delete().eq('member_id', memberId);
    await supabase.from('department_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const removeFunctionFromMember = async (memberId: string, functionId: string) => {
    await supabase
      .from('member_functions')
      .delete()
      .eq('member_id', memberId)
      .eq('function_id', functionId);
    await loadMembers();
  };

  return {
    members,
    departmentLeaders,
    loading,
    canEdit,
    availableProfiles,
    availableFunctions,
    loadAvailableProfiles,
    addMember,
    addFunctionsToMember,
    removeMember,
    removeFunctionFromMember
  };
}