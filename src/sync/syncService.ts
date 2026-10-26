import NetInfo from '@react-native-community/netinfo';
import {outboxRepository} from '../storage/database';

let backendUrl='http://10.0.2.2:3001';
let running=false;
export const configureBackend=(url:string)=>{backendUrl=url.replace(/\/$/,'');};
export const getBackendUrl=()=>backendUrl;

export async function syncPending(){
  if(running)return {sent:0,failed:0};
  const network=await NetInfo.fetch();
  if(!network.isInternetReachable)return {sent:0,failed:0};
  running=true;let sent=0,failed=0;
  try{
    for(const item of await outboxRepository.ready()){
      await outboxRepository.markSyncing(item.id);
      try{
        const response=await fetch(`${backendUrl}/api/sync`,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':item.idempotencyKey},body:JSON.stringify({entityType:item.entityType,entityId:item.entityId,operation:item.operation,payload:JSON.parse(item.payload),updatedAt:new Date().toISOString()})});
        if(!response.ok)throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0,160)}`);
        await outboxRepository.markSynced(item.id,item.entityType,item.entityId);sent++;
      }catch(error){failed++;await outboxRepository.markError(item,error instanceof Error?error.message:'Error desconocido');}
    }
    return {sent,failed};
  }finally{running=false;}
}

export function startAutomaticSync(){
  const unsubscribe=NetInfo.addEventListener(state=>{if(state.isInternetReachable)syncPending().catch(()=>undefined);});
  syncPending().catch(()=>undefined);
  return unsubscribe;
}

export async function checkBackend(){const response=await fetch(`${backendUrl}/health`);if(!response.ok)throw new Error(`Backend respondió HTTP ${response.status}`);return response.json();}
