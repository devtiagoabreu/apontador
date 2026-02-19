export default function TestePage() {
  return (
    <div className="min-h-screen bg-blue-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-600">Teste Tailwind</h1>
        <p className="text-gray-600 mt-2">Se esta página tiver cores, o Tailwind está funcionando!</p>
        <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Botão Teste
        </button>
      </div>
    </div>
  )
}