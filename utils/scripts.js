import fs from 'fs';
import log from './logger.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// Create an agent
export const newAgent = (proxy = null) => {
    if (proxy) {
        if (proxy.startsWith('http://')) {
            return new HttpsProxyAgent(proxy);
        } else if (proxy.startsWith('socks4://') || proxy.startsWith('socks5://')) {
            return new SocksProxyAgent(proxy);
        } else {
            log.warn(`Unsupported proxy type: ${proxy}`);
            return null;
        }
    }
    return null; // Proxy မရှိရင် null ပြန်ပေးတာက အဆင်ပြေပြီးသား
}

export function loadFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        log.info(`Loaded ${data.length} items from ${filePath}`);
        return data;
    } catch (error) {
        log.error(`Failed to read file ${filePath}: ${error.message}. Running without data.`);
        return []; // Error ဖြစ်ရင် process.exit မလုပ်ဘဲ ဗလာ array ပြန်ပေးမယ်
    }
}

export function loadProxies(filePath) {
    try {
        const proxies = fs.readFileSync(filePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        log.info(`Loaded ${proxies.length} proxies from ${filePath}`);
        return proxies;
    } catch (error) {
        log.warn(`Failed to read proxies from ${filePath}: ${error.message}. Running without proxies.`);
        return []; // Proxy ဖိုင်မရှိရင် ဗလာ array ပြန်ပေးမယ်
    }
}

export function generateDeviceId() {
    const hexChars = '0123456789abcdef';
    let deviceId = '';
    for (let i = 0; i < 32; i++) {
        deviceId += hexChars[Math.floor(Math.random() * hexChars.length)];
    }
    return deviceId;
}
