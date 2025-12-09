export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Neo
          </h1>
          <p className="text-xl text-slate-400">
            Official AI Interface of CogneoVerse
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-8 backdrop-blur">
          <p className="text-slate-300 mb-6">
            Neo is not a generic chatbot. It is a controlled, authoritative, memory-enabled,
            RAG-powered AI system designed to serve as your guide through CogneoVerse.
          </p>

          <a
            href="/neo"
            className="inline-flex items-center justify-center px-8 py-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Start Conversation
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Memory-Driven</h3>
            <p className="text-sm text-slate-400">
              Remembers conversations and builds context over time
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Knowledge-Grounded</h3>
            <p className="text-sm text-slate-400">
              All responses backed by verified knowledge base
            </p>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Planning-Capable</h3>
            <p className="text-sm text-slate-400">
              Multi-step reasoning and task execution
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
