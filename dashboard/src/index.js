/**
 * index.js
 * Dashboard entry point
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
