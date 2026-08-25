export interface ReportMonth {
  key: string
  date: Date
}

export interface VolunteerReportRow {
  memberId: string
  userId: string
  fullName: string
  departmentName: string
  servicesInMonth: number
  timesAvailable: number
  timesScheduled: number
}
