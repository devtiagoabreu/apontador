// src/types/next-auth.d.ts
import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    nome: string;
    matricula: string;
    nivel: string;
    loginMode?: 'normal' | 'avulso'; // Identifica o modo de acesso
  }

  interface Session {
    user: {
      id: string;
      nome: string;
      matricula: string;
      nivel: string;
      loginMode?: 'normal' | 'avulso';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    loginMode?: 'normal' | 'avulso';
  }
}