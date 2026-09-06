// Shared navigation for regression tests after controls moved into panels.
export async function control(page,selector,action='click',...args){
 const settings=/^#(language|labels|battle-|war-|ai-tempo)/.test(selector)||selector==='.war-settings summary';
 if(settings){
  await page.locator('#open-settings').click();
  if(selector.startsWith('#war-')&&!await page.locator(selector).isVisible())await page.locator('.war-settings summary').click();
 }else{
  const panel=selector.startsWith('#ai-')?'command':'status';
  if(await page.locator('#open-'+panel).getAttribute('aria-expanded')!=='true')await page.locator('#open-'+panel).click();
 }
 await page.locator(selector)[action](...args);
 if(settings)await page.locator('#close-settings').click();
 else if((page.viewportSize()?.width??1440)<=900&&!await page.locator('dialog[open]').count())await page.locator('#close-panel').click();
}
export async function camera(page,name){await page.evaluate(name=>window.__aether.cameraControls[name](),name);}
