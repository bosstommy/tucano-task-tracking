import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { UIProvider } from './ui'
import { BoardProvider } from './lib/board'
import '@fontsource-variable/atkinson-hyperlegible-next'
import './styles/theme.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <BoardProvider>
          <App />
        </BoardProvider>
      </UIProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
