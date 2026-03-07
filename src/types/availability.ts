export interface AvailabilityRoutine {
  user_id: string;
  service_day_id: string;
  is_available: boolean;
}

export interface AvailabilityException {
  user_id: string;
  specific_date: string;
  is_available: boolean;
}