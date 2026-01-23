import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ChevronRight, Users, Briefcase } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Department {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
}

interface Function {
  id: string;
  name: string;
  description?: string;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<Department[]>([]);
  const [functions, setFunctions] = useState<Function[]>([]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [selectedSubDepartment, setSelectedSubDepartment] = useState<Department | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<Function | null>(null);
  const [saving, setSaving] = useState(false);

  const [step, setStep] = useState(1);

  useEffect(() => {
    loadRootDepartments();
  }, []);

  const loadRootDepartments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: depts } = await supabase
        .from('departments')
        .select('id, name, description, organization_id')
        .is('parent_id', null)
        .order('name');

      if (depts) {
        setDepartments(depts);
      }
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os departamentos');
    } finally {
      setLoading(false);
    }
  };

  const loadSubDepartments = async (deptId: string) => {
    try {
      const { data: children } = await supabase
        .from('departments')
        .select('id, name, description, organization_id')
        .eq('parent_id', deptId)
        .order('name');

      if (children) {
        setSubDepartments(children);
      }
    } catch (error) {
      console.error('Erro ao carregar sub-departamentos:', error);
    }
  };

  const loadFunctions = async (deptId: string) => {
    try {
      const { data: funcs } = await supabase
        .from('department_functions')
        .select('id, name, description')
        .eq('department_id', deptId)
        .order('name');

      if (funcs) {
        setFunctions(funcs);
      }
    } catch (error) {
      console.error('Erro ao carregar funções:', error);
    }
  };

  const handleDepartmentSelect = async (dept: Department) => {
    // LIMPEZA DE ESTADO (Crítico)
    setSelectedDepartment(dept);
    setSubDepartments([]);
    setFunctions([]);
    setSelectedSubDepartment(null);
    setSelectedFunction(null);
    
    // Buscar sub-departamentos
    const { data: children } = await supabase
      .from('departments')
      .select('id, name, description, organization_id')
      .eq('parent_id', dept.id)
      .order('name');

    // Lógica de Bifurcação (Fork)
    if (children && children.length > 0) {
      // Cenário A: Tem Filhos
      setSubDepartments(children);
      setStep(2);
    } else {
      // Cenário B: NÃO Tem Filhos - Vazio
      await loadFunctions(dept.id);
      setStep(3);
    }
  };

  const handleSubDepartmentSelect = async (subDept: Department) => {
    setSelectedSubDepartment(subDept);
    setSelectedFunction(null);
    await loadFunctions(subDept.id);
    setStep(3);
  };

  const handleFunctionSelect = (func: Function) => {
    setSelectedFunction(func);
  };

  const handleJoinDepartment = async () => {
    if (!selectedDepartment || !selectedFunction) {
      Alert.alert('Atenção', 'Selecione um departamento e uma função');
      return;
    }

    setSaving(true);
    try {
      // Passo 1: Identificar a Organização
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado');
        return;
      }

      const finalDeptId = selectedSubDepartment?.id || selectedDepartment.id;
      const organizationId = selectedSubDepartment?.organization_id || selectedDepartment.organization_id;

      if (!organizationId) {
        Alert.alert('Erro', 'Departamento não possui organização definida');
        return;
      }

      // Passo 2: Atualizar o Perfil (Crítico)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: organizationId })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', JSON.stringify(profileError));
        Alert.alert('Erro', 'Não foi possível atualizar seu perfil');
        return;
      }

      // Passo 3: Inserir Membro
      const { error: memberError } = await supabase
        .from('department_members')
        .insert({
          user_id: user.id,
          department_id: finalDeptId,
          function_id: selectedFunction.id,
          dept_role: 'member',
        });

      if (memberError) {
        console.error('Erro ao inserir membro:', JSON.stringify(memberError));
        Alert.alert('Erro', 'Não foi possível entrar no departamento');
        return;
      }

      // Passo 4: Redirecionar
      Alert.alert(
        'Sucesso!', 
        'Você entrou no departamento com sucesso',
        [
          { text: 'OK', onPress: () => router.replace('/(tabs)') }
        ]
      );
    } catch (error) {
      console.error('Erro detalhado ao entrar no departamento:', JSON.stringify(error));
      Alert.alert('Erro', 'Ocorreu um erro inesperado');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-500 mt-2">Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-6">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo!</Text>
          <Text className="text-lg text-gray-600 text-center">Onde você serve?</Text>
        </View>

        {/* Step 1: Select Department */}
        {step === 1 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Selecione seu Departamento</Text>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept.id}
                onPress={() => handleDepartmentSelect(dept)}
                className={`bg-white rounded-xl p-4 mb-3 border-2 ${
                  selectedDepartment?.id === dept.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">{dept.name}</Text>
                    {dept.description && (
                      <Text className="text-gray-600 text-sm mt-1">{dept.description}</Text>
                    )}
                  </View>
                  <ChevronRight size={20} color="#6b7280" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: Select Sub-department */}
        {step === 2 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Selecione o Sub-departamento</Text>
            {subDepartments.map((subDept) => (
              <TouchableOpacity
                key={subDept.id}
                onPress={() => handleSubDepartmentSelect(subDept)}
                className={`bg-white rounded-xl p-4 mb-3 border-2 ${
                  selectedSubDepartment?.id === subDept.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">{subDept.name}</Text>
                    {subDept.description && (
                      <Text className="text-gray-600 text-sm mt-1">{subDept.description}</Text>
                    )}
                  </View>
                  <ChevronRight size={20} color="#6b7280" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 3: Select Function */}
        {step === 3 && (
          <View className="mb-6">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Selecione sua Função</Text>
            {functions.map((func) => (
              <TouchableOpacity
                key={func.id}
                onPress={() => handleFunctionSelect(func)}
                className={`bg-white rounded-xl p-4 mb-3 border-2 ${
                  selectedFunction?.id === func.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <View className="flex-row items-center">
                  <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                    <Briefcase size={18} color="#3b82f6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">{func.name}</Text>
                    {func.description && (
                      <Text className="text-gray-600 text-sm mt-1">{func.description}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Navigation */}
        <View className="flex-row justify-between">
          {step > 1 && (
            <TouchableOpacity
              onPress={() => {
                if (step === 2) {
                  // Voltar de Sub-departamentos -> Departamentos Raiz
                  setStep(1);
                  setSelectedSubDepartment(null);
                  setFunctions([]);
                } else if (step === 3) {
                  // Voltar de Funções -> Verificar se o dept tinha filhos
                  if (subDepartments.length > 0) {
                    // Departamento tinha filhos -> Voltar para Sub-departamentos
                    setStep(2);
                    setSelectedFunction(null);
                  } else {
                    // Departamento NÃO tinha filhos -> Voltar para Departamentos Raiz
                    setStep(1);
                    setSelectedFunction(null);
                    setSubDepartments([]);
                  }
                }
              }}
              className="bg-gray-200 rounded-lg px-6 py-3"
            >
              <Text className="text-gray-700 font-semibold">Voltar</Text>
            </TouchableOpacity>
          )}

          {step === 3 && selectedFunction && (
            <TouchableOpacity
              onPress={handleJoinDepartment}
              disabled={saving}
              className="bg-blue-600 rounded-lg px-6 py-3 flex-row items-center"
              style={{ opacity: saving ? 0.5 : 1 }}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Users size={18} color="white" style={{ marginRight: 8 }} />
                  <Text className="text-white font-semibold">Entrar no Departamento</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
