export const userMock = {
  avatar: 'https://i.pravatar.cc/300',
  name: 'Pedro Coelho',
  email: 'pedrocoelho@gmail.com',
  password: '123',
  telefone: '123456789',
  numero: '10',
  posicao: 'Levantador',
  peso: '78',
  altura: '1,85',
  nascimento: '15/03/2000',
}

export const planMock = {
  name: 'Premium',
  price: 'R$29,90',
  expires: '10/05/2026',
}

export function getTrainingDays() {
  const todayDow = new Date().getDay()
  const base = [2, 4]
  return base.includes(todayDow) ? base : [...base, todayDow]
}

export const championshipsMock = [
  {
    id: '1',
    name: 'Gigantes da Rede',
    date: 'Julho 2026',
    location: 'Vassouras, RJ',
  }
]


