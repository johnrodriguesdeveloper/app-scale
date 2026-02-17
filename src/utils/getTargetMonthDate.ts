import { addMonths, startOfMonth, getDate, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const getTargetMonthDate = () => {
  const hoje = new Date();
  const diaAtual = getDate(hoje);
  const DIA_CORTE = 20;

  let dataAlvo = addMonths(startOfMonth(hoje), 1);


  if (diaAtual > DIA_CORTE) {
    dataAlvo = addMonths(dataAlvo, 1);
  }

  return dataAlvo;
};