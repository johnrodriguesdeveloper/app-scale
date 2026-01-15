-- ============================================
-- Schema: App SaaS de Gestão de Escalas (Multi-tenancy)
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Organizations (Multi-tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    theme_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (usuários com role na organização)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_role TEXT NOT NULL CHECK (org_role IN ('admin', 'member')),
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Departments (departamentos hierárquicos)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    priority_order INTEGER NOT NULL DEFAULT 0, -- Maior número = maior prioridade
    availability_deadline_day INTEGER NOT NULL CHECK (availability_deadline_day BETWEEN 1 AND 31),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Department Functions (funções/habilidades de cada departamento)
CREATE TABLE department_functions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(department_id, name)
);

-- Member Functions (N:N - membros podem ter múltiplas funções)
CREATE TABLE member_functions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    function_id UUID NOT NULL REFERENCES department_functions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, function_id)
);

-- Department Members (membros de departamentos com roles)
CREATE TABLE department_members (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    dept_role TEXT NOT NULL CHECK (dept_role IN ('leader', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, department_id)
);

-- Availability (disponibilidade dos membros)
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status BOOLEAN NOT NULL DEFAULT true, -- true = disponível, false = indisponível
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id, date)
);

-- Rosters (escalas criadas)
CREATE TABLE rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    function_id UUID NOT NULL REFERENCES department_functions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, date, department_id, user_id) -- Um membro não pode estar escalado duas vezes no mesmo dia no mesmo departamento
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_departments_organization_id ON departments(organization_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_id);
CREATE INDEX idx_department_functions_department_id ON department_functions(department_id);
CREATE INDEX idx_member_functions_user_id ON member_functions(user_id);
CREATE INDEX idx_member_functions_function_id ON member_functions(function_id);
CREATE INDEX idx_department_members_user_id ON department_members(user_id);
CREATE INDEX idx_department_members_department_id ON department_members(department_id);
CREATE INDEX idx_availability_user_id ON availability(user_id);
CREATE INDEX idx_availability_organization_id ON availability(organization_id);
CREATE INDEX idx_availability_date ON availability(date);
CREATE INDEX idx_rosters_organization_id ON rosters(organization_id);
CREATE INDEX idx_rosters_date ON rosters(date);
CREATE INDEX idx_rosters_department_id ON rosters(department_id);
CREATE INDEX idx_rosters_user_id ON rosters(user_id);
CREATE INDEX idx_rosters_function_id ON rosters(function_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - Organizations
-- ============================================

-- Usuários podem ver suas próprias organizações
CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

-- Admins podem atualizar suas organizações
CREATE POLICY "Admins can update their organizations"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid() AND org_role = 'admin'
        )
    );

-- ============================================
-- POLÍTICAS RLS - Profiles
-- ============================================

CREATE POLICY "Users can view profiles in their organizations"
    ON profiles FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid() AND org_role = 'admin'
        )
    );

-- ============================================
-- POLÍTICAS RLS - Departments
-- ============================================

CREATE POLICY "Users can view departments in their organizations"
    ON departments FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Leaders and admins can manage departments"
    ON departments FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid() AND org_role = 'admin'
        )
        OR
        id IN (
            SELECT department_id FROM department_members
            WHERE user_id = auth.uid() AND dept_role = 'leader'
        )
    );

-- ============================================
-- POLÍTICAS RLS - Department Functions
-- ============================================

CREATE POLICY "Users can view functions in their departments"
    ON department_functions FOR SELECT
    USING (
        department_id IN (
            SELECT department_id FROM departments
            WHERE organization_id IN (
                SELECT organization_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Leaders can manage functions"
    ON department_functions FOR ALL
    USING (
        department_id IN (
            SELECT department_id FROM department_members
            WHERE user_id = auth.uid() AND dept_role = 'leader'
        )
    );

-- ============================================
-- POLÍTICAS RLS - Member Functions
-- ============================================

CREATE POLICY "Users can view member functions"
    ON member_functions FOR SELECT
    USING (
        function_id IN (
            SELECT id FROM department_functions
            WHERE department_id IN (
                SELECT department_id FROM departments
                WHERE organization_id IN (
                    SELECT organization_id FROM profiles
                    WHERE user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Leaders can manage member functions"
    ON member_functions FOR ALL
    USING (
        function_id IN (
            SELECT id FROM department_functions
            WHERE department_id IN (
                SELECT department_id FROM department_members
                WHERE user_id = auth.uid() AND dept_role = 'leader'
            )
        )
    );

-- ============================================
-- POLÍTICAS RLS - Department Members
-- ============================================

CREATE POLICY "Users can view members in their departments"
    ON department_members FOR SELECT
    USING (
        department_id IN (
            SELECT department_id FROM departments
            WHERE organization_id IN (
                SELECT organization_id FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Leaders can manage department members"
    ON department_members FOR ALL
    USING (
        department_id IN (
            SELECT department_id FROM department_members
            WHERE user_id = auth.uid() AND dept_role = 'leader'
        )
    );

-- ============================================
-- POLÍTICAS RLS - Availability
-- ============================================

CREATE POLICY "Users can view availability in their organizations"
    ON availability FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own availability"
    ON availability FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- POLÍTICAS RLS - Rosters
-- ============================================

CREATE POLICY "Users can view rosters in their organizations"
    ON rosters FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Leaders can manage rosters"
    ON rosters FOR ALL
    USING (
        department_id IN (
            SELECT department_id FROM department_members
            WHERE user_id = auth.uid() AND dept_role = 'leader'
        )
    );

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_functions_updated_at BEFORE UPDATE ON department_functions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_members_updated_at BEFORE UPDATE ON department_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rosters_updated_at BEFORE UPDATE ON rosters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
