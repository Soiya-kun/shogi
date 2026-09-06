import {test as base,expect} from '@playwright/test';
// Existing game regressions resume the samurai stage. stages.spec covers the fresh chooser.
export const test=base.extend({context:async({context},use)=>{await context.addInitScript(()=>{if(!localStorage.getItem('aether-stage'))localStorage.setItem('aether-stage','samurai');});await use(context);}});
export {expect};
