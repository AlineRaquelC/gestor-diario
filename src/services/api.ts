// Android Emulator reaches the Linux host through 10.0.2.2.
// For a physical device, change only this URL to the host LAN address.
export const API_BASE_URL = 'http://10.0.2.2:3000';

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method, headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal as RequestInit['signal'],
    });
    const data = await response.json() as { error?: { message?: string; code?: string } };
    if (!response.ok) {
      throw new ApiError(data.error?.message ?? 'Não foi possível salvar na API.', response.status, data.error?.code);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {throw error;}
    throw new ApiError('Não foi possível confirmar o salvamento. Verifique a conexão e o backend antes de tentar novamente.');
  } finally {
    clearTimeout(timeout);
  }
}
