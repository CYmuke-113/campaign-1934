import './styles/tokens.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/battle.css';
import { App } from './app/App';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('App root element was not found');
}

const app = new App(root);
app.start();

if (import.meta.env.DEV) {
  (window as Window & { __campaignApp?: App }).__campaignApp = app;
}
