import { describe, it, expect } from 'vitest';
import type { ZodTypeAny } from 'zod';
import { insertAreaSchema } from '@/lib/db/schema/areas';
import { insertSetorSchema } from '@/lib/db/schema/setores';
import { insertUsuarioSchema } from '@/lib/db/schema/usuarios';
import { insertMaquinaSchema } from '@/lib/db/schema/maquinas';
import { insertEstagioSchema } from '@/lib/db/schema/estagios';
import { insertMotivoParadaSchema } from '@/lib/db/schema/motivos-parada';
import { insertOPSchema } from '@/lib/db/schema/ops';
import {
  insertParadaMaquinaSchema,
} from '@/lib/db/schema/paradas-maquina';
import { insertProducaoRecordSchema } from '@/lib/db/schema/producoes';
import {
  insertProducaoSchema,
  insertParadaSchema,
} from '@/lib/db/schema/apontamentos';
import { insertTipoManutencaoSchema } from '@/lib/db/schema/tipos-manutencao';
import { insertAtividadeManutencaoSchema } from '@/lib/db/schema/atividades-manutencao';
import { insertManutencaoSchema } from '@/lib/db/schema/manutencoes';
import { insertAgendamentoManutencaoSchema } from '@/lib/db/schema/agendamentos-manutencao';

const UUID = '550e8400-e29b-41d4-a716-446655440000';
const UUID2 = '550e8400-e29b-41d4-a716-446655440001';

function validar<T extends ZodTypeAny>(schema: T, valor: unknown) {
  const resultado = schema.safeParse(valor);
  expect(resultado.success).toBe(true);
  return resultado.data;
}

describe('insertAreaSchema', () => {
  it('aceita área válida e mantém os campos fornecidos', () => {
    const data = validar(insertAreaSchema, { nome: 'Corte', ativo: false });
    expect(data.nome).toBe('Corte');
    expect(data.ativo).toBe(false);
  });

  it('aceita área sem ativo (default aplicado pelo banco)', () => {
    validar(insertAreaSchema, { nome: 'Costura' });
  });

  it('rejeita nome curto', () => {
    expect(insertAreaSchema.safeParse({ nome: 'ab' }).success).toBe(false);
  });
});

describe('insertSetorSchema', () => {
  it('aceita setor válido', () => {
    validar(insertSetorSchema, { nome: 'Setor A', areaId: UUID });
  });

  it('rejeita área que não é UUID', () => {
    expect(
      insertSetorSchema.safeParse({ nome: 'Setor A', areaId: 'abc-123' }).success
    ).toBe(false);
  });
});

describe('insertUsuarioSchema', () => {
  it('aceita cadastro mínimo (nivel e ativo são opcionais)', () => {
    const data = validar(insertUsuarioSchema, { nome: 'Fulano', matricula: 'OP1' });
    expect(data.nome).toBe('Fulano');
    expect(data.matricula).toBe('OP1');
  });

  it('aceita perfil ADM informado explicitamente', () => {
    const data = validar(insertUsuarioSchema, {
      nome: 'Fulano',
      matricula: 'ADM1',
      nivel: 'ADM',
      ativo: true,
    });
    expect(data.nivel).toBe('ADM');
  });

  it('aceita perfil MANUTENCAO', () => {
    const data = validar(insertUsuarioSchema, {
      nome: 'Carlos',
      matricula: 'MNT1',
      nivel: 'MANUTENCAO',
      ativo: true,
    });
    expect(data.nivel).toBe('MANUTENCAO');
  });

  it('rejeita nome curto e matrícula vazia', () => {
    expect(
      insertUsuarioSchema.safeParse({ nome: 'ab', matricula: 'OP1' }).success
    ).toBe(false);
    expect(
      insertUsuarioSchema.safeParse({ nome: 'Fulano', matricula: '' }).success
    ).toBe(false);
  });

  it('rejeita nível inválido', () => {
    expect(
      insertUsuarioSchema.safeParse({
        nome: 'Fulano',
        matricula: 'OP1',
        nivel: 'GERENTE',
      }).success
    ).toBe(false);
  });
});

describe('insertMaquinaSchema', () => {
  it('aceita cadastro mínimo de máquina', () => {
    const data = validar(insertMaquinaSchema, { nome: 'Máquina 1', codigo: 'M1' });
    expect(data.nome).toBe('Máquina 1');
    expect(data.codigo).toBe('M1');
  });

  it('aceita status válido informado explicitamente', () => {
    const data = validar(insertMaquinaSchema, {
      nome: 'Máquina 1',
      codigo: 'M1',
      status: 'EM_PROCESSO',
    });
    expect(data.status).toBe('EM_PROCESSO');
  });

  it('aceita status EM_MANUTENCAO', () => {
    const data = validar(insertMaquinaSchema, {
      nome: 'Máquina 1',
      codigo: 'M1',
      status: 'EM_MANUTENCAO',
    });
    expect(data.status).toBe('EM_MANUTENCAO');
  });

  it('rejeita status inválido', () => {
    expect(
      insertMaquinaSchema.safeParse({
        nome: 'Máquina 1',
        codigo: 'M1',
        status: 'QUEBRADA',
      }).success
    ).toBe(false);
  });
});

describe('insertEstagioSchema', () => {
  it('aceita estágio mínimo e mantém a cor fornecida', () => {
    const data = validar(insertEstagioSchema, {
      codigo: '01',
      nome: 'Tecelagem',
      ordem: 1,
      cor: '#ff0000',
    });
    expect(data.cor).toBe('#ff0000');
  });

  it('rejeita cor fora do formato HEX', () => {
    expect(
      insertEstagioSchema.safeParse({
        codigo: '01',
        nome: 'Tecelagem',
        ordem: 1,
        cor: 'vermelho',
      }).success
    ).toBe(false);
  });

  it('exige código com 2 caracteres e ordem positiva', () => {
    expect(
      insertEstagioSchema.safeParse({ codigo: '1', nome: 'Tecelagem', ordem: 1 }).success
    ).toBe(false);
    expect(
      insertEstagioSchema.safeParse({ codigo: '01', nome: 'Tecelagem', ordem: 0 }).success
    ).toBe(false);
  });
});

describe('insertMotivoParadaSchema', () => {
  it('aceita motivo válido', () => {
    validar(insertMotivoParadaSchema, { codigo: '01', descricao: 'Falta de energia' });
  });

  it('rejeita descrição curta', () => {
    expect(
      insertMotivoParadaSchema.safeParse({ codigo: '01', descricao: 'ab' }).success
    ).toBe(false);
  });
});

describe('insertOPSchema', () => {
  it('aceita OP mínima (op + produto)', () => {
    const data = validar(insertOPSchema, { op: 123, produto: 'TEC.001' });
    expect(data.op).toBe(123);
    expect(data.produto).toBe('TEC.001');
  });

  it('rejeita OP não inteira ou não positiva', () => {
    expect(insertOPSchema.safeParse({ op: 0, produto: 'X' }).success).toBe(false);
    expect(insertOPSchema.safeParse({ op: 1.5, produto: 'X' }).success).toBe(false);
  });
});

describe('insertParadaMaquinaSchema', () => {
  it('aceita parada sem data final', () => {
    validar(insertParadaMaquinaSchema, {
      maquinaId: UUID,
      operadorId: UUID2,
      motivoParadaId: UUID,
      dataInicio: new Date(),
    });
  });

  it('rejeita motivo inválido', () => {
    expect(
      insertParadaMaquinaSchema.safeParse({
        maquinaId: UUID,
        operadorId: UUID2,
        motivoParadaId: 'nao-uuid',
        dataInicio: new Date(),
      }).success
    ).toBe(false);
  });
});

describe('insertProducaoRecordSchema', () => {
  const base = {
    opId: 10,
    maquinaId: UUID,
    operadorInicioId: UUID2,
    estagioId: UUID,
    dataInicio: new Date(),
    metragemProgramada: 100,
  };

  it('aceita produção válida', () => {
    const data = validar(insertProducaoRecordSchema, base);
    expect(data.metragemProgramada).toBe(100);
  });

  it('rejeita metragem programada não positiva', () => {
    expect(
      insertProducaoRecordSchema.safeParse({ ...base, metragemProgramada: 0 }).success
    ).toBe(false);
  });

  it('rejeita OP inválida', () => {
    expect(
      insertProducaoRecordSchema.safeParse({ ...base, opId: 0 }).success
    ).toBe(false);
  });
});

describe('insertProducaoSchema (apontamento unificado)', () => {
  const base = {
    tipo: 'PRODUCAO' as const,
    opId: 10,
    maquinaId: UUID,
    operadorInicioId: UUID2,
    estagioId: UUID,
    dataInicio: new Date(),
    dataFim: new Date(),
  };

  it('aceita apontamento de produção com estágio', () => {
    const data = validar(insertProducaoSchema, base);
    expect(data.tipo).toBe('PRODUCAO');
    expect(data.estagioId).toBe(UUID);
  });

  it('rejeita tipo divergente (PARADA) no schema de produção', () => {
    expect(insertProducaoSchema.safeParse({ ...base, tipo: 'PARADA' }).success).toBe(false);
  });
});

describe('insertParadaSchema (apontamento unificado)', () => {
  const base = {
    tipo: 'PARADA' as const,
    maquinaId: UUID,
    motivoParadaId: UUID2,
    operadorInicioId: UUID,
    dataInicio: new Date(),
    dataFim: new Date(),
  };

  it('aceita apontamento de parada com motivo', () => {
    const data = validar(insertParadaSchema, base);
    expect(data.tipo).toBe('PARADA');
    expect(data.motivoParadaId).toBe(UUID2);
  });

  it('rejeita tipo divergente (PRODUCAO) no schema de parada', () => {
    expect(insertParadaSchema.safeParse({ ...base, tipo: 'PRODUCAO' }).success).toBe(false);
  });
});

describe('insertTipoManutencaoSchema', () => {
  it('aceita tipo de manutenção válido e mantém os campos fornecidos', () => {
    const data = validar(insertTipoManutencaoSchema, {
      codigo: 'COR',
      nome: 'Corretiva',
      ativo: false,
    });
    expect(data.codigo).toBe('COR');
    expect(data.nome).toBe('Corretiva');
    expect(data.ativo).toBe(false);
  });

  it('rejeita nome curto', () => {
    expect(
      insertTipoManutencaoSchema.safeParse({ codigo: 'COR', nome: 'ab' }).success
    ).toBe(false);
  });

  it('rejeita código vazio', () => {
    expect(
      insertTipoManutencaoSchema.safeParse({ codigo: '', nome: 'Corretiva' }).success
    ).toBe(false);
  });
});

describe('insertAtividadeManutencaoSchema', () => {
  it('aceita atividade de manutenção válida', () => {
    const data = validar(insertAtividadeManutencaoSchema, {
      codigo: 'MEC',
      nome: 'Mecânica',
    });
    expect(data.nome).toBe('Mecânica');
  });

  it('rejeita nome curto', () => {
    expect(
      insertAtividadeManutencaoSchema.safeParse({ codigo: 'MEC', nome: 'ab' }).success
    ).toBe(false);
  });
});

describe('insertManutencaoSchema', () => {
  const base = {
    maquinaId: UUID,
    operadorInicioId: UUID2,
    tipoManutencaoId: UUID,
    atividadeManutencaoId: UUID2,
    periodicidade: 'EVENTUAL' as const,
  };

  it('aceita início de manutenção válido (dataInicio/status são default do banco)', () => {
    const data = validar(insertManutencaoSchema, base);
    expect(data.periodicidade).toBe('EVENTUAL');
  });

  it('aceita status explícito', () => {
    const data = validar(insertManutencaoSchema, { ...base, status: 'CONCLUIDA' });
    expect(data.status).toBe('CONCLUIDA');
  });

  it('aceita periodicidade PERIODICA', () => {
    const data = validar(insertManutencaoSchema, { ...base, periodicidade: 'PERIODICA' });
    expect(data.periodicidade).toBe('PERIODICA');
  });

  it('rejeita periodicidade inválida', () => {
    expect(
      insertManutencaoSchema.safeParse({ ...base, periodicidade: 'MENSAL' }).success
    ).toBe(false);
  });

  it('rejeita status inválido', () => {
    expect(
      insertManutencaoSchema.safeParse({ ...base, status: 'ATIVA' }).success
    ).toBe(false);
  });

  it('rejeita máquina que não é UUID', () => {
    expect(
      insertManutencaoSchema.safeParse({ ...base, maquinaId: 'nao-uuid' }).success
    ).toBe(false);
  });

  it('aceita dataFim e observações opcionais', () => {
    const data = validar(insertManutencaoSchema, {
      ...base,
      dataFim: new Date(),
      observacoes: 'Troca de rolamento',
    });
    expect(data.observacoes).toBe('Troca de rolamento');
  });
});

describe('insertAgendamentoManutencaoSchema', () => {
  const base = {
    maquinaId: UUID,
    tipoManutencaoId: UUID,
    atividadeManutencaoId: UUID2,
    periodicidade: 'PERIODICA' as const,
    dataPrevista: new Date(),
  };

  it('aceita agendamento válido (status é default do banco)', () => {
    const data = validar(insertAgendamentoManutencaoSchema, base);
    expect(data.dataPrevista).toBeInstanceOf(Date);
  });

  it('aceita status AGENDADO explícito', () => {
    const data = validar(insertAgendamentoManutencaoSchema, {
      ...base,
      status: 'AGENDADO',
    });
    expect(data.status).toBe('AGENDADO');
  });

  it('aceita status CANCELADO com observações', () => {
    const data = validar(insertAgendamentoManutencaoSchema, {
      ...base,
      status: 'CANCELADO',
      observacoes: 'Sem peça de reposição',
    });
    expect(data.status).toBe('CANCELADO');
    expect(data.observacoes).toBe('Sem peça de reposição');
  });

  it('rejeita período sem dataPrevista', () => {
    const { dataPrevista: _removed, ...semData } = base;
    expect(insertAgendamentoManutencaoSchema.safeParse(semData).success).toBe(false);
  });

  it('rejeita periodicidade inválida', () => {
    expect(
      insertAgendamentoManutencaoSchema.safeParse({ ...base, periodicidade: 'ANUAL' }).success
    ).toBe(false);
  });

  it('rejeita status inválido', () => {
    expect(
      insertAgendamentoManutencaoSchema.safeParse({ ...base, status: 'PAUSADO' }).success
    ).toBe(false);
  });
});