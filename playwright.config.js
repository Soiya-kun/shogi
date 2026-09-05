import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',timeout:60000,workers:1,
  use:{channel:'chrome',baseURL:'http://127.0.0.1:5174',viewport:{width:1440,height:1000},trace:'retain-on-failure'},
  webServer:{command:'node scripts/serve.mjs',env:{PORT:'5174'},url:'http://127.0.0.1:5174',reuseExistingServer:!process.env.CI},
});
