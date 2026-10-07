import localtunnel from 'localtunnel';
import fs from 'fs';

(async () => {
  try {
    const tunnel = await localtunnel({
      port: 3005,
      local_host: '127.0.0.1'
    });
    console.log('PUBLIC_TUNNEL_URL:', tunnel.url);
    fs.writeFileSync('tunnel_info.json', JSON.stringify({ url: tunnel.url, startedAt: new Date().toISOString() }));
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
    setInterval(() => {}, 10000);
  } catch (err) {
    console.error('Failed to start tunnel:', err);
  }
})();
