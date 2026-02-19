// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { usuarios } from '@/lib/db/schema/usuarios'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { env } from '@/lib/env'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        matricula: { label: 'Matrícula', type: 'text' },
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.matricula) {
          return null
        }

        // Buscar usuário pela matrícula
        const user = await db.query.usuarios.findFirst({
          where: eq(usuarios.matricula, credentials.matricula),
        })

        if (!user || !user.ativo) {
          return null
        }

        // Se for admin, verificar senha
        if (user.nivel === 'ADM') {
          if (!credentials.senha) {
            return null
          }
          
          const isValid = await bcrypt.compare(credentials.senha, user.senha || '')
          if (!isValid) {
            return null
          }
        }

        // Retornar dados do usuário (sem senha)
        return {
          id: user.id,
          nome: user.nome,
          matricula: user.matricula,
          nivel: user.nivel,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.nome = user.nome
        token.matricula = user.matricula
        token.nivel = user.nivel
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.nome = token.nome as string
        session.user.matricula = token.matricula as string
        session.user.nivel = token.nivel as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  secret: env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }