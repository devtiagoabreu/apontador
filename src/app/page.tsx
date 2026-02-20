import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Mudei o caminho da importação

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    if (session.user.nivel === 'ADM') {
      redirect('/dashboard');
    } else {
      redirect('/apontamento');
    }
  } else {
    redirect('/login');
  }
}