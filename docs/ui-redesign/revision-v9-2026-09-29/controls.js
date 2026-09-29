/* Variantes para revisión de Vera, no seleccionadas ni integradas. */
(() => {
  const variants=['ivory','slate','iron'];
  const requested=new URLSearchParams(location.search).get('controls');
  const variant=variants.includes(requested)?requested:'slate';
  const url=new URL(`assets/control-${variant}.png`,document.currentScript.src).href;
  const ink=variant==='ivory'?'#3e3428':'#fff1d5';
  document.body.dataset.controlProposal=variant;
  const css=document.createElement('style');
  css.textContent=`body.v9-after .ctrls{gap:8px;right:10px;bottom:94px}body.v9-after .ctrls .rbtn,body.v9-after .ctrls .rbtn.on{width:44px;height:44px;min-width:44px;padding:9px;border:1px solid transparent;border-image:url('${url}') 20 fill stretch;border-image-width:10px;border-radius:0;background:none;box-shadow:none;color:${ink};font:600 15px/1 var(--display);display:flex;align-items:center;justify-content:center}body.v9-after .ctrls .rbtn svg{width:20px;height:20px}body.v9-after .ctrls .rbtn.on{color:${variant==='ivory'?'#1f4f59':'#fff5cc'}}@media(max-width:350px){body.v9-after .ctrls{gap:5px;right:8px}}`;
  document.head.append(css);
  document.querySelectorAll('.ctrls .rbtn').forEach((old,i)=>{
    const button=document.createElement('button');button.type='button';button.className=old.className;button.innerHTML=old.innerHTML;
    button.setAttribute('aria-label',['View','Pause','Speed','Hunt'][i]||'Control');
    button.dataset.proposal=variant;old.replaceWith(button);
  });
})();
