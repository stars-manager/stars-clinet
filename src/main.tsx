import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tdesign-react/es/_util/react-19-adapter'; // React 19 适配器
import App from './App';
import 'tdesign-react/es/style/index.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
