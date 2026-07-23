/**
 * @module main
 * @description Application entry point.
 *
 * Mounts the React application to the DOM. Uses StrictMode for development
 * warnings and best practices. The global CSS (design tokens, animations,
 * base styles) is imported here.
 *
 * @see index.css — ABA Design System tokens and base styles
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
