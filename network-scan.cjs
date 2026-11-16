const os = require('node:os');
const net = require('node:net');

function localRanges(interfaces = os.networkInterfaces()) {
  const ranges = new Map();
  for (const entries of Object.values(interfaces)) for (const item of entries || []) {
    if (item.family !== 'IPv4' || item.internal || !net.isIPv4(item.address) || !net.isIPv4(item.netmask)) continue;
    const octets=item.address.split('.').map(Number);
    if (!(octets[0]===10 || (octets[0]===172 && octets[1]>=16 && octets[1]<=31) || (octets[0]===192 && octets[1]===168))) continue;
    const toInt=ip=>ip.split('.').reduce((a,b)=>((a<<8)|Number(b))>>>0,0);
    const ip=toInt(item.address), mask=toInt(item.netmask), maskText=mask.toString(2).padStart(32,'0');
    if (!/^1*0*$/.test(maskText)) continue;
    const prefix=Math.max(24,maskText.indexOf('0')===-1?32:maskText.indexOf('0'));
    if(prefix>30) continue;
    const effective=(0xffffffff << (32-prefix))>>>0, base=(ip & effective)>>>0, count=2**(32-prefix);
    const key=`${base}/${prefix}`; if (!ranges.has(key)) ranges.set(key,{base,prefix,count,own:new Set()});
    ranges.get(key).own.add(ip);
  }
  return [...ranges.values()].slice(0,4);
}
function targets(interfaces) {
  const found=[];
  for(const range of localRanges(interfaces)) for(let n=1;n<range.count-1;n++) {
    const ip=(range.base+n)>>>0;if(range.own.has(ip))continue;
    found.push([ip>>>24,(ip>>>16)&255,(ip>>>8)&255,ip&255].join('.'));
  }
  return found;
}
function probe(address) { return new Promise(resolve=>{const socket=net.createConnection({host:address,port:9100});let done=false;const finish=value=>{if(done)return;done=true;socket.destroy();resolve(value)};socket.setTimeout(350);socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.once('timeout',()=>finish(false));}); }
async function scan(interfaces, check=probe) {
  const addresses=targets(interfaces), hits=[];let cursor=0;
  await Promise.all(Array.from({length:Math.min(32,addresses.length)},async()=>{while(cursor<addresses.length){const address=addresses[cursor++];if(await check(address)) hits.push(address)}}));
  return {addresses:hits.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})), scanned:addresses.length};
}
module.exports={targets,scan};
