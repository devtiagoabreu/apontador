// src/types/maquinas.ts
export interface Maquina {
  id: string;
  nome: string;
  codigo: string;
  qrCode?: string;
  status: 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA';
  ativo: boolean;
  
  // NOVOS CAMPOS
  velocidadePadrao: number;
  capacidadeKg: number;
  capacidadeLitros: number;
  tempoDiarioDisponivel: number;
  
  createdAt: string;
  updatedAt: string;
  
  // Para exibição na interface
  setoresNomes?: string;
  setores?: string[];
}

export interface MaquinaFormData {
  nome: string;
  codigo: string;
  status: 'DISPONIVEL' | 'EM_PROCESSO' | 'PARADA';
  ativo: boolean;
  velocidadePadrao: number;
  capacidadeKg: number;
  capacidadeLitros: number;
  tempoDiarioDisponivel: number;
  setores: string[];
}

export interface MaquinaParametros {
  velocidadePadrao: number;
  capacidadeKg: number;
  capacidadeLitros: number;
  tempoDiarioDisponivel: number;
}

export interface MaquinaStatusCount {
  disponivel: number;
  emProcesso: number;
  parada: number;
  total: number;
}