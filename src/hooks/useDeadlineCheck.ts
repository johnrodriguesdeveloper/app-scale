import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface DeadlineCheckResult {
  canEdit: boolean;
  deadlineDay: number | null;
  daysRemaining: number | null;
  isPastDeadline: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para verificar se o usuário ainda pode editar a disponibilidade
 * baseado no prazo (deadline) do departamento.
 * 
 * @param departmentId - ID do departamento
 * @param organizationId - ID da organização
 * @returns Objeto com informações sobre o prazo e permissão de edição
 */
export function useDeadlineCheck(
  departmentId: string | null,
  organizationId: string | null
): DeadlineCheckResult {
  const [result, setResult] = useState<DeadlineCheckResult>({
    canEdit: false,
    deadlineDay: null,
    daysRemaining: null,
    isPastDeadline: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!departmentId || !organizationId) {
      setResult({
        canEdit: false,
        deadlineDay: null,
        daysRemaining: null,
        isPastDeadline: false,
        isLoading: false,
        error: 'Department ID ou Organization ID não fornecidos',
      });
      return;
    }

    async function checkDeadline() {
      try {
        // Buscar o deadline do departamento
        const { data: department, error } = await supabase
          .from('departments')
          .select('availability_deadline_day')
          .eq('id', departmentId)
          .eq('organization_id', organizationId)
          .single();

        if (error) {
          throw error;
        }

        if (!department) {
          setResult({
            canEdit: false,
            deadlineDay: null,
            daysRemaining: null,
            isPastDeadline: false,
            isLoading: false,
            error: 'Departamento não encontrado',
          });
          return;
        }

        const deadlineDay = department.availability_deadline_day;
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Verificar se passou do deadline no mês corrente
        const isPastDeadline = currentDay > deadlineDay;

        // Calcular dias restantes até o próximo deadline
        let daysRemaining: number | null = null;
        if (!isPastDeadline) {
          daysRemaining = deadlineDay - currentDay;
        } else {
          // Se passou, calcular até o próximo mês
          const nextMonth = new Date(currentYear, currentMonth + 1, deadlineDay);
          const diffTime = nextMonth.getTime() - today.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        setResult({
          canEdit: !isPastDeadline,
          deadlineDay,
          daysRemaining,
          isPastDeadline,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Erro ao verificar deadline:', error);
        setResult({
          canEdit: false,
          deadlineDay: null,
          daysRemaining: null,
          isPastDeadline: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    checkDeadline();
  }, [departmentId, organizationId]);

  return result;
}
