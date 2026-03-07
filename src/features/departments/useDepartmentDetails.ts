import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import type { Department, DepartmentMember, DepartmentFunction } from '@/types';


export function useDepartmentDetails(id: string | string[] | undefined) {
  const router = useRouter();
  
  const [department, setDepartment] = useState<Department | null>(null);
  const [parentDepartment, setParentDepartment] = useState<Department | null>(null);
  const [subDepartments, setSubDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [functions, setFunctions] = useState<DepartmentFunction[]>([]);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFunctions = async (departmentId: string) => {
    const { data } = await supabase.from('department_functions').select('id, name, description').eq('department_id', departmentId).order('name');
    if (data) setFunctions(data);
  };

  const fetchSubDepartments = async (departmentId: string) => {
    const { data } = await supabase.from('departments').select('id, name, description, parent_id').eq('parent_id', departmentId).order('name');
    if (data) setSubDepartments(data);
  };

  const fetchParentDepartment = async (parentId: string) => {
    const { data } = await supabase.from('departments').select('id, name').eq('id', parentId).single();
    if (data) setParentDepartment(data);
  };

  const fetchMembers = async (departmentId: string) => {
    const { data } = await supabase.from('department_members').select(`id, user_id, dept_role, profiles:user_id ( full_name, email, avatar_url ), department_functions:function_id ( name )`).eq('department_id', departmentId);
    if (data) setMembers(data as unknown as DepartmentMember[]);
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      if (!id) { setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase.from('profiles').select('org_role').eq('user_id', user.id).single();
      if (profile) {
        const masterStatus = profile.org_role === 'master';
        setIsMaster(masterStatus);
        setIsAdmin(profile.org_role === 'admin' || masterStatus);
      }

      const { data: leaderCheck } = await supabase.from('department_leaders').select('id').eq('department_id', String(id)).eq('user_id', user.id).single();
      if (leaderCheck) setIsLeader(true);

      const { data: dept } = await supabase.from('departments').select('id, name, description, priority_order, availability_deadline_day, parent_id, organization_id').eq('id', String(id)).single();

      if (dept) {
        setDepartment(dept);
        if (dept.parent_id) await fetchParentDepartment(dept.parent_id);
      }

      await fetchMembers(String(id));
      await fetchSubDepartments(String(id));
      await fetchFunctions(String(id));
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleBack = () => {
    if (department?.parent_id) {
      router.push({ pathname: '/(tabs)/departments/[id]', params: { id: department.parent_id } });
    } else {
      router.push('/(tabs)/departments');
    }
  };

  const removeMember = async (memberId: string) => {
    await supabase.from('rosters').delete().eq('member_id', memberId);
    await supabase.from('department_members').delete().eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const deleteSubDepartment = async (subDeptId: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', subDeptId);
    if (error) throw error;
    setSubDepartments(prev => prev.filter(s => s.id !== subDeptId));
  };

  const deleteFunction = async (funcId: string) => {
    const { error } = await supabase.from('department_functions').delete().eq('id', funcId);
    if (error) throw error;
    setFunctions(prev => prev.filter(f => f.id !== funcId));
  };

  const createFunction = async (name: string) => {
    if (!name.trim() || !id) throw new Error('Nome inválido');
    const { error } = await supabase.from('department_functions').insert({ department_id: String(id), name: name.trim() });
    if (error) throw error;
    await fetchFunctions(String(id));
  };

  const createSubDepartment = async (name: string) => {
    if (!name.trim() || !id || !department) throw new Error('Nome inválido');
    const { error } = await supabase.from('departments').insert({
      name: name.trim(),
      parent_id: String(id),
      organization_id: department.organization_id,
      availability_deadline_day: department.availability_deadline_day || 20,
      priority_order: 99
    });
    if (error) throw error;
    await fetchSubDepartments(String(id));
  };

  return {
    department,
    parentDepartment,
    subDepartments,
    members,
    functions,
    isAdmin,
    isMaster,
    isLeader,
    loading,
    handleBack,
    removeMember,
    deleteSubDepartment,
    deleteFunction,
    createFunction,
    createSubDepartment
  };
}