import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- BẢN VÁ LỖI (MONKEY PATCH) ---
// Giúp ngăn chặn ứng dụng bị crash (trắng trang) khi gặp lỗi 
// "Failed to execute 'insertBefore' on 'Node'" hoặc "removeChild"
// Lỗi này thường do Google Translate hoặc Extension can thiệp vào DOM của React.
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  // @ts-ignore
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) {
      if (console) console.warn('React DOM mismatch prevented (removeChild)', child, this);
      return child;
    }
    // @ts-ignore
    return originalRemoveChild.apply(this, arguments);
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  // @ts-ignore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('React DOM mismatch prevented (insertBefore)', referenceNode, this);
      return newNode;
    }
    // @ts-ignore
    return originalInsertBefore.apply(this, arguments);
  };
}
// ----------------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);