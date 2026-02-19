// src/types/next-auth.d.ts
import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    nome: string
    matricula: string
    nivel: string
  }

  interface Session {
    user: {
      id: string
      nome: string
      matricula: string
      nivel: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    nome: string
    matricula: string
    nivel: string
  }
}