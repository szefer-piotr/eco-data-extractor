import React from 'react'
import { HomePage } from '@pages/HomePage'
import { ExtractionPage } from '@pages/ExtractionPage'
import './App.css'

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = React.useState('home')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold">EcoData Extractor</h1>
              <button
                onClick={() => setCurrentPage('home')}
                className={`px-3 py-2 ${currentPage === 'home' ? 'text-blue-600' : 'text-gray-600'}`}
              >
                Home
              </button>
              <button
                onClick={() => setCurrentPage('extraction')}
                className={`px-3 py-2 ${currentPage === 'extraction' ? 'text-blue-600' : 'text-gray-600'}`}
              >
                Extraction
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'extraction' && <ExtractionPage />}
      </main>
    </div>
  )
}

export default App