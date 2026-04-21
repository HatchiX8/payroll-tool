import { createApp, type Component } from 'vue';
import * as naive from 'naive-ui';

import App from './App.vue';

const app = createApp(App);

Object.entries(naive).forEach(([name, component]) => {
  if (/^N[A-Z]/.test(name)) {
    app.component(name, component as Component);
  }
});

app.mount('#app');
