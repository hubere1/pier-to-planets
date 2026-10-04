import { render } from 'preact';
import { App } from './ui/App.tsx';
import { locale } from './l10n/index.ts';
import { applyDebugQuery } from './render/debugState.ts';
import './ui/tokens.css';

applyDebugQuery(window.location.search);
document.documentElement.lang = locale;
const root = document.getElementById('app');
if (root) render(<App />, root);
