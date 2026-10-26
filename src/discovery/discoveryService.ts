import NetInfo from '@react-native-community/netinfo';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';
import {Device, uuid} from '../domain/types';

const ports = [22, 53, 80, 443, 8080, 8291];
const probePort = (ip:string, port:number, timeout=450) => new Promise<boolean>(resolve => {
  let done=false;
  const finish=(value:boolean)=>{if(done)return;done=true;clearTimeout(timer);socket.destroy();resolve(value);};
  const socket=TcpSocket.createConnection({host:ip,port},()=>finish(true));
  socket.on('error',()=>finish(false));
  const timer=setTimeout(()=>finish(false),timeout);
});
const probe=async(ip:string)=>(await Promise.all(ports.map(port=>probePort(ip,port)))).some(Boolean);

export async function scanLocalNetwork(onProgress:(completed:number,total:number)=>void, onDevice:(device:Device)=>void, signal?:{cancelled:boolean}) {
  const state=await NetInfo.fetch();
  const details=state.details as any;
  const localIp=details?.ipAddress as string|undefined;
  if (!localIp || state.type!=='wifi') throw new Error('Conectate a una red Wi‑Fi local para iniciar el escaneo.');
  const octets=localIp.split('.');
  if(octets.length!==4)throw new Error('La red actual no usa una dirección IPv4 compatible.');
  const prefix=octets.slice(0,3).join('.');
  const hosts=Array.from({length:254},(_,i)=>`${prefix}.${i+1}`).filter(ip=>ip!==localIp);
  let completed=0;
  for(let offset=0;offset<hosts.length;offset+=24){
    if(signal?.cancelled)break;
    await Promise.all(hosts.slice(offset,offset+24).map(async ip=>{if(await probe(ip)){onDevice({id:uuid(),ip,source:'tcp',lastSeenAt:new Date().toISOString()});}completed++;onProgress(completed,hosts.length);}));
  }
}

export function startMdnsDiscovery(onDevice:(device:Device)=>void){
  const browsers=['http','ssh','workstation','printer'].map(type=>{const zeroconf=new Zeroconf();zeroconf.on('resolved',(service:any)=>{const ip=(service.addresses??[]).find((x:string)=>/^\d+\.\d+\.\d+\.\d+$/.test(x));if(ip)onDevice({id:uuid(),ip,hostname:service.host||service.name,source:'mdns',lastSeenAt:new Date().toISOString()});});zeroconf.scan(type,'tcp','local.');return zeroconf;});
  return()=>browsers.forEach(zeroconf=>{zeroconf.stop();zeroconf.removeDeviceListeners();});
}
