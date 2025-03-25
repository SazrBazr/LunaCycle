import { REMOTE_CONFIG_KEYS } from './constants.js';

export function fetchData() {
    const url = `${REMOTE_CONFIG_KEYS.BASE_URL}/data`;
    console.log('Fetching data from:', url);
}