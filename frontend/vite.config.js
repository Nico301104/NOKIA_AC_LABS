import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Portul 5173 trebuie să fie aliniat cu CORS-ul din backend-ul C#/.NET
// (Program.cs -> AddCors -> WithOrigins("http://localhost:5173"))
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  }
})
