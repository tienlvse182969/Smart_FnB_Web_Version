import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PLATFORM_BRAND_TOKENS, applyThemeVars } from './theme'
import './index.css'

// Có token nền tảng ngay từ khung hình đầu; App ghi đè khi biết nhận diện của doanh nghiệp.
applyThemeVars(PLATFORM_BRAND_TOKENS)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
