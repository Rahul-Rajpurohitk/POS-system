const POST_DEPLOY = {
  PROD:
    'ln -nfs ../shared/.env .env && \
        yarn install && \
        pm2 reload ecosystem.config.js --env production',
  DEV:
    'ln -nfs ../shared/.env .env && \
          yarn install && \
          yarn apidoc && \
          pm2 reload ecosystem.config.js --env dev',
};

const PRE_DEPLOY = 'git add . && git reset --hard && git checkout yarn.lock';

module.exports = {
  apps: [
    {
      name: 'RPOS_API',
      script: 'app.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],

  deploy: {
    prod: {
      user: 'root',
      host: '128.199.3.174',
      ref: 'origin/master',
      repo: 'git@gitlab.com:mposs315/rpos-server.git',
      path: '/root/pos-server-prod',
      'pre-deploy': PRE_DEPLOY,
      'post-deploy': POST_DEPLOY.PROD,
    },
    dev: {
      user: 'root',
      host: '128.199.3.174',
      ref: 'origin/develop',
      repo: 'git@gitlab.com:mposs315/rpos-server.git',
      path: '/root/pos-server-dev',
      'pre-deploy': PRE_DEPLOY,
      'post-deploy': POST_DEPLOY.DEV,
    },
  },
};
