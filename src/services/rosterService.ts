import { supabase } from '@/lib/supabase';

export interface AvailableMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  function_id: string;
  function_name: string;
  is_available: boolean;
}

/**
 * Busca membros disponíveis por função e data
 * Utiliza a função RPC do Supabase que aplica todas as regras de negócio:
 * - Membros do departamento
 * - Com a função especificada
 * - Disponíveis na data
 * - Sem conflito com departamentos de maior prioridade
 */
export async function getAvailableMembersByFunction(
  organizationId: string,
  departmentId: string,
  functionId: string,
  date: Date
): Promise<AvailableMember[]> {
  const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const { data, error } = await supabase.rpc('get_available_members_by_function', {
    p_organization_id: organizationId,
    p_department_id: departmentId,
    p_function_id: functionId,
    p_date: dateString,
  });

  if (error) {
    console.error('Erro ao buscar membros disponíveis:', error);
    throw new Error(`Erro ao buscar membros disponíveis: ${error.message}`);
  }

  return (data || []) as AvailableMember[];
}

/**
 * Cria uma nova escala (roster)
 */
export async function createRoster(
  organizationId: string,
  date: Date,
  departmentId: string,
  userId: string,
  functionId: string,
  createdBy: string
): Promise<void> {
  const dateString = date.toISOString().split('T')[0];

  const { error } = await supabase.from('rosters').insert({
    organization_id: organizationId,
    date: dateString,
    department_id: departmentId,
    user_id: userId,
    function_id: functionId,
    created_by: createdBy,
  });

  if (error) {
    console.error('Erro ao criar escala:', error);
    throw new Error(`Erro ao criar escala: ${error.message}`);
  }
}

/**
 * Busca as próximas escalas do usuário
 */
export async function getUpcomingRosters(
  userId: string,
  organizationId: string,
  limit: number = 5
) {
  const { data, error } = await supabase
    .from('rosters')
    .select(`
      id,
      date,
      department:departments(id, name),
      function:department_functions(id, name),
      user:profiles!rosters_user_id_fkey(id, full_name, avatar_url)
    `)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(limit);

  if (error) {
    
    throw new Error(`Erro ao buscar próximas escalas: ${error.message}`);
  }

  return data;
}
