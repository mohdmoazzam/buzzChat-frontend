import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx';
import { CssBaseline, ThemeProvider } from "@mui/material";
import { HelmetProvider } from "react-helmet-async";
import { Provider } from "react-redux"
import store from './redux/store.js';
import theme from './constants/theme.js';
import "./index.css";
import { registerServiceWorker } from './lib/push.js';

// Receives web push notifications (public/sw.js)
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <HelmetProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div onContextMenu={(e) => e.preventDefault()}>
            <App />
          </div>
        </ThemeProvider>
      </HelmetProvider>
    </Provider>
  </React.StrictMode>
)
