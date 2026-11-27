export type QrNativeAdapter = {
  startScan(sessionId: string): Promise<string>;
  cancel(sessionId: string): Promise<void>;
};
export type QrScanResult =
  | { kind: 'payload'; payload: string }
  | { kind: 'cancelled' };

let sequence = 0;
/** Invalidates late results before crossing back into the current form. */
export class QrScanSession {
  private active: string | undefined;
  constructor(private readonly native: QrNativeAdapter | null) {}

  async scan(): Promise<QrScanResult> {
    if (!this.native) {
      throw new Error(
        'O leitor de QR Code não está disponível neste aparelho. Você pode digitar a tarefa.',
      );
    }
    if (this.active) {
      throw new Error('Já existe uma leitura de QR Code em andamento.');
    }
    const id = `qr-${Date.now()}-${++sequence}`;
    this.active = id;
    try {
      const payload = await this.native.startScan(id);
      if (this.active !== id || !payload) {
        return { kind: 'cancelled' };
      }
      return { kind: 'payload', payload };
    } catch (error) {
      if (this.active !== id) {
        return { kind: 'cancelled' };
      }
      throw error;
    } finally {
      if (this.active === id) {
        this.active = undefined;
      }
    }
  }

  async cancel(): Promise<void> {
    const id = this.active;
    this.active = undefined;
    if (id && this.native) {
      try {
        await this.native.cancel(id);
      } catch {
        /* Form stays usable if native context was destroyed. */
      }
    }
  }
}
