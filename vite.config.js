
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return
          if (id.includes("firebase") || id.includes("@firebase")) return "firebase"
          if (id.includes("@dnd-kit")) return "dnd"
          return "vendor"
        }
      }
    }
  }
})