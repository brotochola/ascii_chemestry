// ============================================================
// ASCII Chemistry — main.js
// ============================================================
import { AsciiChemistry } from './AsciiChemistry.js';
import './tests.js';

const sim = new AsciiChemistry(document.getElementById('app'));
await sim.init();
sim.start();
