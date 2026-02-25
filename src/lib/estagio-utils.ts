interface Estagio {
  nome?: string | null;
  cor?: string | null;
}

export function getEstagioStyle(estagio: Estagio | null | undefined) {
  const defaultBg = '#6b7280'; // gray-500
  const defaultText = '#374151'; // gray-700
  
  if (!estagio?.cor) {
    return {
      backgroundColor: '#f3f4f6', // gray-100
      color: defaultText,
      border: '1px solid #e5e7eb'
    };
  }
  
  return {
    backgroundColor: `${estagio.cor}15`, // 15% de opacidade
    color: estagio.cor,
    border: '1px solid transparent',
    fontWeight: '500'
  };
}

export function getEstagioNome(estagio: Estagio | null | undefined): string {
  return estagio?.nome || 'Sem estágio';
}