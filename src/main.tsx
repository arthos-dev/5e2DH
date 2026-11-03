import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DiceProvider } from './contexts/DiceContext'
import { Toaster } from './components/Toaster'
import { Dice3D } from './components/Dice3D'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster>
      <DiceProvider>
        <Dice3D />
        <App />
      </DiceProvider>
    </Toaster>
  </StrictMode>,
)
