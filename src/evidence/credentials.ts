import * as Keychain from 'react-native-keychain';

const service=(host:string,port:number)=>`network-diagnostics:ssh:${host}:${port}`;
export async function saveSshCredentials(host:string,port:number,username:string,password:string){await Keychain.setGenericPassword(username,password,{service:service(host,port),accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
export async function getSshCredentials(host:string,port:number){const result=await Keychain.getGenericPassword({service:service(host,port)});return result===false?undefined:{username:result.username,password:result.password};}
export async function removeSshCredentials(host:string,port:number){await Keychain.resetGenericPassword({service:service(host,port)});}
export async function saveSnmpCommunity(host:string,community:string){await Keychain.setGenericPassword('community',community,{service:`network-diagnostics:snmp:${host}`,accessible:Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY});}
export async function getSnmpCommunity(host:string){const result=await Keychain.getGenericPassword({service:`network-diagnostics:snmp:${host}`});return result===false?undefined:result.password;}
