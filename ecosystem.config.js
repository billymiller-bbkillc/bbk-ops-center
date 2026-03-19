module.exports = {
  apps: [
    {
      name: 'bbk-ops-api',
      script: 'npm',
      args: 'run dev:server',
      cwd: './',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'bbk-ops-client',
      script: 'npm',
      args: 'run dev:client',
      cwd: './',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
