import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Garante variáveis de ambiente mínimas para módulos que as exigem no import
process.env.DATABASE_URL ??= 'postgres://usuario:senha@localhost:5432/apontador_test';
process.env.NEXTAUTH_URL ??= 'http://localhost:3000';
process.env.NEXTAUTH_SECRET ??= 'test-secret';

// Silencia logs esperados dos módulos de negócio durante os testes
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  cleanup();
});
