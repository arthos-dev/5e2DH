import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DiceProvider } from './contexts/DiceContext'
import { Toaster } from './components/Toaster'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster>
      <DiceProvider>
        <App />
      </DiceProvider>
    </Toaster>
  </StrictMode>,
)
