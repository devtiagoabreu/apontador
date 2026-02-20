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
      },
      async authorize(credentials) {
        if (!credentials?.matricula) {
          return null;
        }

        try {
          const user = await db.query.usuarios.findFirst({
            where: eq(usuarios.matricula, credentials.matricula),
          });

          if (!user || !user.ativo) {
            return null;
          }

          if (user.nivel === 'ADM') {
            if (!credentials.senha) {
              return null;
            }
            
            const isValid = await bcrypt.compare(credentials.senha, user.senha || '');
            if (!isValid) {
              return null;
            }
          }

          return {
            id: user.id,
            nome: user.nome,
            matricula: user.matricula,
            nivel: user.nivel,
          };
        } catch (error) {
          console.error('Erro na autenticação:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.nome = user.nome;
        token.matricula = user.matricula;
        token.nivel = user.nivel;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.nome = token.nome;
        session.user.matricula = token.matricula;
        session.user.nivel = token.nivel;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};