import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ExplorePage from './ExplorePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ExplorePage />
  </StrictMode>,
)
