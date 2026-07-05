import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import { ErrorBoundary } from './shared/components/ErrorBoundary'
import { DialogProvider } from './shared/components/DialogProvider'
import { ToastProvider } from './shared/components/ToastProvider'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <DialogProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </DialogProvider>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
)
