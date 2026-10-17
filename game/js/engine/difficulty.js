import { DIFFICULTY, DEFAULT_DIFFICULTY } from '../../config/difficulty.js';

export const diff = (state) => DIFFICULTY[state.difficulty] || DIFFICULTY[DEFAULT_DIFFICULTY];
