// Pengecek sinyal otomatis (dijalankan GitHub Actions tiap jam). Strategi: SMA4 x SMA20 di H1.
// Kalau mengubah strategi di index.html, ubah juga bagian analyze() ini.
const FAST=4,SLOW=20,SEC=3600;
const sma=(c,p,i)=>{let s=0;for(let j=i-p+1;j<=i;j++)s+=c[j];return s/p};
function analyze(bars,now){ // bars: urut lama -> baru, {t,o,h,l,c}
  const cl=bars.filter(b=>b.t+SEC<=now);if(cl.length<SLOW+2)return null;
  const c=cl.map(b=>b.c),i=c.length-1,f0=sma(c,FAST,i-1),s0=sma(c,SLOW,i-1),f1=sma(c,FAST,i),s1=sma(c,SLOW,i);
  let a=0;for(let k=i-13;k<=i;k++)a+=Math.max(cl[k].h-cl[k].l,Math.abs(cl[k].h-cl[k-1].c),Math.abs(cl[k].l-cl[k-1].c));a/=14;
  const age=now-(cl[i].t+SEC),sig=f0<=s0&&f1>s1?'BUY':f0>=s0&&f1<s1?'SELL':'WAIT',d=sig=='BUY'?1:-1,sl=a*1.5,e=c[i];
  return{sig,age,price:e,sl:e-d*sl,tp:e+d*sl*2,fresh:age<=4200};
}
const goldOpen=d=>{const w=d.getUTCDay(),h=d.getUTCHours();return !(w==6||(w==5&&h>=22)||(w==0&&h<22))};
async function main(){
  const KEY=process.env.TD_KEY,TOPIC=process.env.NTFY_TOPIC,TEST=process.env.TEST=='1';
  if(!KEY||!TOPIC){console.log('Isi secret TD_KEY dan NTFY_TOPIC dulu.');process.exit(1)}
  const send=(title,msg,pri)=>fetch('https://ntfy.sh/'+TOPIC,{method:'POST',headers:{Title:title,Priority:pri||'high',Tags:'chart'},body:msg});
  if(TEST){await send('Gold Robot tes','Notifikasi dari GitHub Actions berfungsi.','default');console.log('tes terkirim');return}
  if(!goldOpen(new Date())){console.log('Pasar emas tutup');return}
  const j=await(await fetch(`https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=1h&outputsize=60&timezone=UTC&apikey=${KEY}`)).json();
  if(!j.values){console.log('Twelve Data:',j.message);process.exit(1)}
  const bars=j.values.reverse().map(v=>({t:Date.parse(v.datetime.replace(' ','T')+'Z')/1000,o:+v.open,h:+v.high,l:+v.low,c:+v.close})),r=analyze(bars,Date.now()/1000);
  console.log(JSON.stringify(r));
  if(r&&r.sig!='WAIT'&&r.fresh)await send('XAU/USD '+r.sig+' (H1)',`Persilangan SMA${FAST}/SMA${SLOW}. Harga ${r.price.toFixed(2)} | TP ${r.tp.toFixed(2)} | SL ${r.sl.toFixed(2)}`)
}
if(require.main===module)main().catch(e=>{console.log(e);process.exit(1)});else module.exports={analyze};
