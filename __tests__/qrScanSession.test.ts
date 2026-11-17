import { QrScanSession } from '../src/services/qrScanSession';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
test('retorna payload uma vez e bloqueia sessão concorrente', async () => {
  const pending = deferred<string>();
  const native = {
    startScan: jest.fn(() => pending.promise),
    cancel: jest.fn(async () => {}),
  };
  const session = new QrScanSession(native);
  const result = session.scan();
  await expect(session.scan()).rejects.toThrow('andamento');
  pending.resolve('payload');
  expect(await result).toEqual({ kind: 'payload', payload: 'payload' });
  expect(native.startScan).toHaveBeenCalledTimes(1);
});
test('cancelamento normal e repetido não vira erro', async () => {
  const native = {
    startScan: jest.fn(async () => ''),
    cancel: jest.fn(async () => {}),
  };
  const session = new QrScanSession(native);
  expect(await session.scan()).toEqual({ kind: 'cancelled' });
  await session.cancel();
  await session.cancel();
  expect(native.cancel).not.toHaveBeenCalled();
});
test('payload ou erro tardio após cancel não invade sessão nova', async () => {
  const old = deferred<string>();
  const next = deferred<string>();
  const native = {
    startScan: jest
      .fn()
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(next.promise),
    cancel: jest.fn(async () => {}),
  };
  const session = new QrScanSession(native);
  const first = session.scan();
  const oldId = native.startScan.mock.calls[0][0];
  await session.cancel();
  expect(native.cancel).toHaveBeenCalledWith(oldId);
  const second = session.scan();
  old.resolve('stale');
  expect(await first).toEqual({ kind: 'cancelled' });
  next.resolve('current');
  expect(await second).toEqual({ kind: 'payload', payload: 'current' });
});
test('falha nativa não trava retry; módulo ausente mantém erro compreensível', async () => {
  const native = {
    startScan: jest
      .fn()
      .mockRejectedValueOnce(new Error('Câmera ocupada'))
      .mockResolvedValueOnce('retry'),
    cancel: jest.fn(async () => {}),
  };
  const session = new QrScanSession(native);
  await expect(session.scan()).rejects.toThrow('Câmera ocupada');
  expect(await session.scan()).toEqual({ kind: 'payload', payload: 'retry' });
  await expect(new QrScanSession(null).scan()).rejects.toThrow('digitar');
});
test('invalidação descarta erro tardio mesmo se cancel nativo falhar', async () => {
  const old = deferred<string>();
  const session = new QrScanSession({
    startScan: () => old.promise,
    cancel: async () => {
      throw new Error('destroyed');
    },
  });
  const result = session.scan();
  await session.cancel();
  old.reject(new Error('late'));
  expect(await result).toEqual({ kind: 'cancelled' });
});
