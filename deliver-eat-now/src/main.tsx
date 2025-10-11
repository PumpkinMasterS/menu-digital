import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress MetaMask connection errors that don't affect our app
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('MetaMask') || 
      event.reason?.message?.includes('Failed to connect to MetaMask')) {
    event.preventDefault()
    console.debug('MetaMask extension detected but not used by this application')
  }
})

createRoot(document.getElementById("root")!).render(<App />);
