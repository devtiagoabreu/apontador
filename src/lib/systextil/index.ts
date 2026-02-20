import { env } from '@/lib/env';

interface SystextilToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// Interface ajustada para corresponder ao que a API retorna (campos minúsculos)
interface SystextilOP {
  op: number;           // minúsculo, não maiúsculo
  produto: string;      // minúsculo
  deposito_final: string;
  pecas_vinculadas: string;
  qtde_programado: number;
  qtde_carregado: number;
  qtde_produzida: number;
  calculo_quebra: number;
  obs: string;
  um: string;
  narrativa: string;
  nivel: string;
  grupo: string;
  sub: string;
  item: string;
}

interface SystextilResponse {
  items: SystextilOP[];
}

class SystextilService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  private async getAccessToken(): Promise<string> {
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
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000;

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