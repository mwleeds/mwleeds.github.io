// Expose Bootstrap globally FIRST before anything else
import * as BootstrapModule from 'bootstrap';
try {
  window.bootstrap = BootstrapModule;
  console.log('Bootstrap exposed globally:', typeof window.bootstrap);
} catch (error) {
  console.error('Failed to expose bootstrap:', error);
}

import './main.scss';
require('./js/nav');

