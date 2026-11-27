import { interpretTaskVoice } from '../src/domain/taskVoice';

const friday = new Date(2026, 10, 27, 23, 58);

test.each([
  ['Comprar pão amanhã.', {title: 'Comprar pão', dueDate: '2026-11-28'}],
  ['Comprar pão até amanhã e prioridade alta', {title: 'Comprar pão', dueDate: '2026-11-28', priority: 'high'}],
  ['Comprar pão hoje', {title: 'Comprar pão', dueDate: '2026-11-27'}],
  ['Comprar pão depois de amanhã', {title: 'Comprar pão', dueDate: '2026-11-29'}],
  ['Entregar trabalho da faculdade na segunda-feira, prioridade alta.', {
    title: 'Entregar trabalho da faculdade', dueDate: '2026-11-30', priority: 'high',
  }],
  ['Estudar engenharia de software amanhã prioridade média', {
    title: 'Estudar engenharia de software', dueDate: '2026-11-28', priority: 'medium',
  }],
  ['Comprar pão prioridade baixa em 10/12', {title: 'Comprar pão', dueDate: '2026-12-10', priority: 'low'}],
  ['Entregar dia 10/12/2027', {title: 'Entregar', dueDate: '2027-12-10'}],
  ['Entregar sexta feira', {title: 'Entregar', dueDate: '2026-12-04'}],
  ['Revisar prioridade alta no documento.', {title: 'Revisar prioridade alta no documento.'}],
])('interprets %s', (text, draft) => {
  expect(interpretTaskVoice(text, friday)).toEqual({ok: true, draft});
});

test('adds civil days across a year boundary', () => {
  expect(interpretTaskVoice('Comprar pão depois de amanhã', new Date(2026, 11, 31, 23, 59)))
    .toEqual({ok: true, draft: {title: 'Comprar pão', dueDate: '2027-01-02'}});
});

test.each([
  'Comprar pão amanhã ou segunda-feira',
  'Comprar pão hoje amanhã',
  'Comprar pão prioridade alta prioridade baixa',
  'Comprar pão em 31/02/2027',
  'Comprar pão em 30/10',
  'Comprar pão em 01/12/26',
])('preserves ambiguous or invalid qualifiers for review: %s', text => {
  expect(interpretTaskVoice(text, friday)).toEqual({
    ok: true, draft: {title: text, warning: expect.any(String)},
  });
});

test.each([' ', 'amanhã', 'prioridade alta', 'x'.repeat(501)])('rejects text without a usable title', text => {
  expect(interpretTaskVoice(text, friday)).toEqual({ok: false, message: expect.any(String)});
});
