import './styles/app.css';
import './styles/print.css';
import { start } from './ui/app';
import { captureTemplate } from './ui/selfCopy';

// Keep a copy of this page before anything renders: Export backup builds the saved plan file from it.
captureTemplate();
start();
