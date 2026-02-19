import 'next-auth';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    nome: string;
    matricula: string;
    nivel: string;
  }

  interface Session {
    user: {
      id: string;
      nome: string;
      matricula: string;
      nivel: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    nome: string;
    matricula: string;
    nivel: string;
  }
}