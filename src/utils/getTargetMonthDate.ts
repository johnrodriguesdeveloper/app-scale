import { addDays, addMonths, getDate, startOfMonth, subMonths } from "date-fns"

/** Last day of the month on which members can still edit the next month. */
export const AVAILABILITY_DEADLINE_DAY = 20

export const getTargetMonthDate = () => {
  const hoje = new Date()
  const diaAtual = getDate(hoje)

  let dataAlvo = addMonths(startOfMonth(hoje), 1)

  if (diaAtual > AVAILABILITY_DEADLINE_DAY) {
    dataAlvo = addMonths(dataAlvo, 1)
  }

  return dataAlvo
}

/**
 * The moment `month` stops being editable, i.e. when `getTargetMonthDate()`
 * moves past it: 00:00 (local time) of day 21 of the previous month.
 * E.g. November locks at Oct 21 00:00.
 */
export const getMonthEditDeadline = (month: Date) =>
  addDays(subMonths(startOfMonth(month), 1), AVAILABILITY_DEADLINE_DAY)
