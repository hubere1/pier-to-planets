import { render } from 'preact';
import { App } from './ui/App.tsx';
import { locale } from './l10n/index.ts';
import './ui/tokens.css';

document.documentElement.lang = locale;
const root = document.getElementById('app');
if (root) render(<App />, root);
