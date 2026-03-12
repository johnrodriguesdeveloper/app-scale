import { ServiceDay } from './schedule';

export interface GridColumn {
  dateStr: string;
  date: Date;
  service: ServiceDay;
}