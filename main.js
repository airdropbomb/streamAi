import { generateDeviceId, loadProxies, loadFile } from './utils/scripts.js';
import { Gateway } from './utils/gateway.js';
import log from './utils/logger.js';
import banner from './utils/banner.js';
import fetch from 'node-fetch';
import { newAgent } from './utils/scripts.js';

const PROXIES_FILE = 'proxies.txt';
const USERS_FILE = 'userIds.txt';
const SERVER = "gw0.streamapp365.com";
const MAX_GATEWAYS = 32;

async function dispatch(dev, user, proxy = null) { // Proxy ကို optional ဖြစ်အောင် default ကို null ထားတယ်
    const agent = proxy ? newAgent(proxy) : null; // Proxy ရှိမှ agent ဖန်တီး၊ မရှိရင် null
    try {
        const response = await fetch('https://dist.streamapp365.com/dispatch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dev,
                user,
            }),
            agent: agent, // Agent က null ဆိုရင် fetch က default agent သုံးမယ်
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        log.error(`Dispatch failed for User ${user}${proxy ? ` with Proxy ${proxy}` : ''}: ${error.message}`);
        return null;
    }
}

async function setupGatewaysForUser(user) {
    const proxies = loadProxies(PROXIES_FILE); // proxies.txt မရှိရင် ဗလာ array ပြန်လာမယ်
    const numberGateway = proxies.length > 0 ? Math.min(proxies.length, MAX_GATEWAYS) : 1; // Proxy မရှိရင် gateway ၁ ခုပဲဖန်တီး
    const userGateways = [];
    let proxyIndex = 0;

    for (let i = 0; i < numberGateway; i++) {
        const proxy = proxies.length > 0 ? proxies[proxyIndex] : null; // Proxy မရှိရင် null
        proxyIndex = proxies.length > 0 ? (proxyIndex + 1) % proxies.length : 0; // Proxy ရှိမှ index တိုး
        try {
            const deviceId = generateDeviceId();
            log.info(`Connecting to Gateway ${i + 1} for User ${user} using Device ID: ${deviceId}${proxy ? ` via Proxy: ${proxy}` : ' without Proxy'}`);

            const gateway = new Gateway(SERVER, user, deviceId, proxy); // Proxy က null ဖြစ်နိုင်တယ်
            setInterval(() => dispatch(deviceId, user, proxy), 1000 * 60 * 1);
            userGateways.push(gateway);

            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (err) {
            log.error(`Failed to connect Gateway ${i + 1} for User ${user}${proxy ? ` with Proxy ${proxy}` : ''}: ${err.message}`);
        }
    }
    return userGateways;
}

async function main() {
    log.info(banner);
    const USERS = loadFile(USERS_FILE);
    try {
        log.info("Setting up gateways for all users...");
        const proxies = loadProxies(PROXIES_FILE); // Proxy စစ်ဖို့
        log.info(`Loaded ${proxies.length} proxies${proxies.length === 0 ? ' (Running without proxies)' : ''}`);

        const results = await Promise.allSettled(
            USERS.map((user) => setupGatewaysForUser(user))
        );

        results.forEach((result, index) => {
            if (result.status === "fulfilled") {
                log.info(`User ${USERS[index]}: Successfully set up ${result.value.length} gateways.`);
            } else {
                log.error(`User ${USERS[index]}: Failed to set up gateways. Reason: ${result.reason}`);
            }
        });

        log.info("All user gateway setups attempted.");

        process.on('SIGINT', () => {
            log.info("Cleaning up gateways...");
            results
                .filter(result => result.status === "fulfilled")
                .flatMap(result => result.value)
                .forEach((gateway, index) => {
                    if (gateway.ws) {
                        log.info(`Closing Gateway ${index + 1}`);
                        gateway.ws.close();
                    }
                });
            process.exit();
        });

    } catch (error) {
        log.error("Unexpected error during gateway setup:", error);
    }
}

// Run
main().catch((error) => log.error("Unexpected error:", error));
