import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SupportPrompt} from '../dist/support-prompt.mjs';
import {supportConfig, supportReady, validPaymentLink, localSupportPreview} from '../dist/support-config.mjs';

test('support is fail-closed until approval, disclosures and all distinct live links are configured', () => {
  assert.equal(supportReady({...supportConfig,enabled:false}), false);
  if (supportConfig.enabled) assert.equal(supportReady(supportConfig), true);
  const config = {enabled:true,providerApproved:true,disclosuresReviewed:true,operator:{name:'Operator',address:'Address',phone:'Phone',email:'support@example.com'},prices:[300,500,1000].map(amount=>({amount,url:`https://buy.stripe.com/example${amount}`}))};
  assert.equal(supportReady(config), true);
  for (const key of ['enabled','providerApproved','disclosuresReviewed']) assert.equal(supportReady({...config,[key]:false}), false);
  assert.equal(supportReady({...config,operator:{...config.operator,email:''}}), false);
  assert.equal(supportReady({...config,prices:[config.prices[0],config.prices[0],config.prices[2]]}), false);
  for (const url of ['javascript:alert(1)','https://buy.stripe.com.evil.com/a','https://evil.com/a','http://buy.stripe.com/a','https://buy.stripe.com/test_abc','https://buy.stripe.com/a?redirect=evil','https://user@buy.stripe.com/a','https://buy.stripe.com/']) assert.equal(validPaymentLink(url), false, url);
  assert.equal(localSupportPreview({hostname:'shogi-battle.com',search:'?support-preview=1'}),false);
  assert.equal(localSupportPreview({hostname:'127.0.0.1',search:'?support-preview=1'}),true);
});

test('terminal transition waits for presentation and displays once per match across undo', () => {
  let time=0; const p=new SupportPrompt({matchId:'a',now:()=>time});
  p.update({matchId:'a',ended:'mate',enabled:true});
  time=1499; assert.equal(p.ready({}),false);
  time=2000; assert.equal(p.ready({busy:true}),false);
  assert.equal(p.ready({hidden:true}),false); assert.equal(p.ready({modalOpen:true}),false);
  assert.equal(p.ready({busy:false}),true); p.markShown();
  p.update({matchId:'a',ended:false,enabled:true}); p.update({matchId:'a',ended:'draw',enabled:true});
  assert.equal(p.ready({}),false);
  p.update({matchId:'b',ended:false,enabled:true});p.update({matchId:'b',ended:'resign',enabled:true});
  time+=1600;assert.equal(p.ready({}),true);
});

test('restoring a terminal save never prompts; reset and undo cancel pending prompts', () => {
  let time=0;const restored=new SupportPrompt({matchId:'a',ended:true,now:()=>time});
  restored.update({matchId:'a',ended:'mate',enabled:true});time=20000;assert.equal(restored.ready({}),false);
  for (const reset of [false,true]) {
    const p=new SupportPrompt({matchId:'a',now:()=>time});p.update({matchId:'a',ended:'mate',enabled:true});
    p.update({matchId:reset?'b':'a',ended:false,enabled:true});time+=20000;assert.equal(p.ready({}),false);
  }
});

test('fallback allows stuck animation but never overrides modal, visibility or disabled reception', () => {
  let time=0;const p=new SupportPrompt({matchId:'a',now:()=>time});p.update({matchId:'a',ended:true,enabled:true});
  time=16000;assert.equal(p.ready({busy:true}),true);assert.equal(p.ready({busy:true,hidden:true}),false);assert.equal(p.ready({modalOpen:true}),false);
  p.update({matchId:'a',ended:true,enabled:false});assert.equal(p.ready({}),false);
});
