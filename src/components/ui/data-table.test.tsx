import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from '@/components/ui/data-table';

interface Registro {
  id: number;
  nome: string;
}

const colunas = [{ key: 'nome' as const, title: 'Nome' }];
const dados: Registro[] = [
  { id: 1, nome: 'Alice' },
  { id: 2, nome: 'Bob' },
];

describe('DataTable', () => {
  it('renderiza os registros e o cabeçalho', () => {
    render(<DataTable data={dados} columns={colunas} />);
    expect(screen.getByText('Nome')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
  });

  it('mostra mensagem quando não há registros', () => {
    render(<DataTable data={[]} columns={colunas} />);
    expect(screen.getByText('Nenhum registro encontrado')).toBeTruthy();
  });

  it('dispara onRowClick ao clicar na linha', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<DataTable data={dados} columns={colunas} onRowClick={onRowClick} />);

    await user.click(screen.getByText('Alice'));

    expect(onRowClick).toHaveBeenCalledWith(dados[0]);
  });

  it('dispara onRowClick via teclado (Enter) na linha focável', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<DataTable data={dados} columns={colunas} onRowClick={onRowClick} />);

    const linha = screen.getByText('Alice').closest('tr') as HTMLElement;
    expect(linha).toHaveAttribute('tabindex', '0');

    linha.focus();
    await user.keyboard('{Enter}');

    expect(onRowClick).toHaveBeenCalledWith(dados[0]);
  });

  it('dispara onRowClick via teclado (Espaço)', async () => {
    const onRowClick = vi.fn();
    const user = userEvent.setup();
    render(<DataTable data={dados} columns={colunas} onRowClick={onRowClick} />);

    const linha = screen.getByText('Bob').closest('tr') as HTMLElement;
    linha.focus();
    await user.keyboard(' ');

    expect(onRowClick).toHaveBeenCalledWith(dados[1]);
  });

  it('expõe ações de editar e excluir com nomes acessíveis', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <DataTable
        data={dados}
        columns={colunas}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );

    const botoesEditar = screen.getAllByRole('button', { name: 'Editar' });
    const botoesExcluir = screen.getAllByRole('button', { name: 'Excluir' });
    expect(botoesEditar).toHaveLength(2);
    expect(botoesExcluir).toHaveLength(2);

    await user.click(botoesEditar[0]);
    await user.click(botoesExcluir[1]);

    expect(onEdit).toHaveBeenCalledWith(dados[0]);
    expect(onDelete).toHaveBeenCalledWith(dados[1]);
  });
});
