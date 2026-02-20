import { env } from '@/lib/env';

interface SystextilToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface SystextilOP {
  OP: number;
  PRODUTO: string;
  DEPOSITO_FINAL: string;
  PECAS_VINCULADAS: string;
  QTDE_PROGRAMADO: number;
  QTDE_CARREGADO: number;
  QTDE_PRODUZIDA: number;
  CALCULO_QUEBRA: number;
  OBS: string;
  UM: string;
  NARRATIVA: string;
  NIVEL: string;
  GRUPO: string;
  SUB: string;
  ITEM: string;
}

interface SystextilResponse {
  items: SystextilOP[];
}

class SystextilService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  private async getAccessToken(): Promise<string> {
    // Se token ainda é válido, reutiliza
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${env.SYSTEXTIL_CLIENT_ID}:${env.SYSTEXTIL_CLIENT_SECRET}`
      ).toString('base64');

      const response = await fetch(env.SYSTEXTIL_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Erro ao obter token: ${response.statusText}`);
      }

      const data: SystextilToken = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 minuto de margem

      return this.accessToken;
    } catch (error) {
      console.error('Erro na autenticação Systêxtil:', error);
      throw error;
    }
  }

  async importarOps(): Promise<SystextilOP[]> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(env.SYSTEXTIL_API_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.statusText}`);
      }

      const data: SystextilResponse = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Erro ao importar OPs:', error);
      throw error;
    }
  }
}

export const systextilService = new SystextilService();