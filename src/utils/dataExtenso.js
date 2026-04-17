import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

export function dataAtualPorExtenso() {
  return dayjs().locale('pt-br').format('D [de] MMMM [de] YYYY');
}
