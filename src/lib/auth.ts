// src/lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { usuarios } from '@/lib/db/schema/usuarios';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        matricula: { label: 'Matrícula', type: 'text' },
        senha: { label: 'Senha', type: 'password' },
        loginMode: { type: 'text' } // Campo oculto enviado pelas páginas de loginn
      },
      async authorize(credentials) {
        if (!credentials?.matricula) return null;

        // Busca o usuário no banco de dados Neon
        const user = await db.query.usuarios.findFirst({
          where: eq(usuarios.matricula, credentials.matricula),
        });

        if (!user || !user.ativo) return null;

        // Validação de senha obrigatória apenas para administradores
        if (user.nivel === 'ADM') {
          if (!credentials.senha) return null;
          const senhaValida = await bcrypt.compare(credentials.senha, user.senha || '');
          if (!senhaValida) return null;
        }

        // Retorna o objeto User contendo o modo de login
        return {
          id: user.id,
          nome: user.nome,
          matricula: user.matricula,
          nivel: user.nivel,
          loginMode: (credentials?.loginMode as any) || 'normal'
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nome = user.nome;
        token.matricula = user.matricula;
        token.nivel = user.nivel;
        token.loginMode = user.loginMode; // Salva o contexto no JWT
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // CORREÇÃO PARA O VERCEL: Uso de casting para evitar erro de tipo 'unknown'
        session.user.id = token.id as string;
        session.user.nome = token.nome as string;
        session.user.matricula = token.matricula as string;
        session.user.nivel = token.nivel as string;
        session.user.loginMode = token.loginMode as any;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};