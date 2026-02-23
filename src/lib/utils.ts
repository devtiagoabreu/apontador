import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatar data para o padrão brasileiro
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Formatar número com 2 casas decimais
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Formatar data para ISO sem segundos (YYYY-MM-DDTHH:MM:00.000Z)
export function formatDateWithoutSeconds(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Criar nova data com segundos = 0
  const semSegundos = new Date(d);
  semSegundos.setSeconds(0, 0); // zera segundos e milissegundos
  
  return semSegundos.toISOString();
}

// Formatar data para input datetime-local (YYYY-MM-DDTHH:MM)
export function formatDateForInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Converter input datetime-local para ISO sem segundos
export function fromInputToISO(inputValue: string): string {
  if (!inputValue) return formatDateWithoutSeconds(new Date());
  
  // Adicionar segundos = 00 e timezone UTC
  return `${inputValue}:00.000Z`;
}

// Gerar código aleatório
export function generateCode(prefix: string, length: number = 6): string {
  const random = Math.random().toString(36).substring(2, 2 + length).toUpperCase()
  return `${prefix}${random}`
}

// Validar se é UUID
export function isValidUUID(uuid: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return regex.test(uuid)
}

// Delay para simular carregamento
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}