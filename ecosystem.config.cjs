const path = require('node:path');

const deployRoot = process.env.GIS_DEPLOY_ROOT || '/home/admin/gis-deploy';

module.exports = {
  apps: [
    {
      name: 'gis-app',
      cwd: path.join(deployRoot, 'current'),
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      exec_mode: 'cluster',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1400M',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
