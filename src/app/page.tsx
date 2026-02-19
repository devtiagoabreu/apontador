// src/app/page.tsx
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]/route'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (session) {
    // Redireciona baseado no nível do usuário
    if (session.user.nivel === 'ADM') {
      redirect('/dashboard')
    } else {
      redirect('/apontamento')
    }
  } else {
    redirect('/login')
  }
}