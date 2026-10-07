import localtunnel from 'localtunnel';
import fs from 'fs';

async function connectTunnel() {
  try {
    const tunnel = await localtunnel({
      port: 3005,
      local_host: '127.0.0.1'
    });
    console.log('PUBLIC_TUNNEL_URL:', tunnel.url);
    fs.writeFileSync('tunnel_info.json', JSON.stringify({ url: tunnel.url, startedAt: new Date().toISOString() }));

    tunnel.on('close', () => {
      console.warn('Localtunnel connection closed. Reconnecting in 3 seconds...');
      setTimeout(connectTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Localtunnel encountered an error:', err.message);
      try { tunnel.close(); } catch (e) {}
      setTimeout(connectTunnel, 3000);
    });
    setInterval(() => {}, 10000);
  } catch (err) {
    console.error('Failed to create tunnel, retrying in 5 seconds...', err.message);
    setTimeout(connectTunnel, 5000);
  }
}

// Keep process alive indefinitely
setInterval(() => {}, 1000 * 60 * 60);

connectTunnel();
