export interface OnboardingDepartment {
  id: string
  name: string
  description: string | null
  organization_id: string
}

export interface OnboardingFunctionItem {
  id: string
  name: string
  description: string | null
}
