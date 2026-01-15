-- ============================================
-- Função RPC: Buscar Membros Disponíveis por Função e Data
-- ============================================
-- Esta função retorna membros que:
-- 1. Pertencem ao departamento especificado
-- 2. Possuem a função/habilidade especificada
-- 3. Estão disponíveis na data especificada
-- 4. NÃO estão escalados em departamentos de maior prioridade na mesma data

CREATE OR REPLACE FUNCTION get_available_members_by_function(
    p_organization_id UUID,
    p_department_id UUID,
    p_function_id UUID,
    p_date DATE
)
RETURNS TABLE (
    user_id UUID,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    function_id UUID,
    function_name TEXT,
    is_available BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_department_priority INTEGER;
BEGIN
    -- Obter a prioridade do departamento atual
    SELECT priority_order INTO v_department_priority
    FROM departments
    WHERE id = p_department_id AND organization_id = p_organization_id;

    IF v_department_priority IS NULL THEN
        RAISE EXCEPTION 'Department not found or access denied';
    END IF;

    -- Retornar membros que atendem todos os critérios
    RETURN QUERY
    SELECT DISTINCT
        p.id AS user_id,
        p.full_name,
        p.email,
        p.avatar_url,
        df.id AS function_id,
        df.name AS function_name,
        COALESCE(av.status, false) AS is_available
    FROM profiles p
    INNER JOIN department_members dm ON dm.user_id = p.id
    INNER JOIN member_functions mf ON mf.user_id = p.id
    INNER JOIN department_functions df ON df.id = mf.function_id
    LEFT JOIN availability av ON av.user_id = p.id 
        AND av.organization_id = p_organization_id 
        AND av.date = p_date
    WHERE 
        -- Pertence ao departamento especificado
        dm.department_id = p_department_id
        -- Possui a função especificada
        AND mf.function_id = p_function_id
        -- Pertence à organização correta
        AND p.organization_id = p_organization_id
        -- Está disponível (ou não tem registro de disponibilidade, tratado como indisponível)
        AND COALESCE(av.status, false) = true
        -- NÃO está escalado em departamentos de maior prioridade na mesma data
        AND NOT EXISTS (
            SELECT 1
            FROM rosters r
            INNER JOIN departments d ON d.id = r.department_id
            WHERE r.user_id = p.id
                AND r.date = p_date
                AND r.organization_id = p_organization_id
                AND d.priority_order > v_department_priority
        )
    ORDER BY p.full_name;
END;
$$;

-- Garantir que usuários autenticados podem executar a função
GRANT EXECUTE ON FUNCTION get_available_members_by_function TO authenticated;
