import {NativeModules} from 'react-native';
import * as Keychain from 'react-native-keychain';
import {getSshCredentials, saveSshCredentials} from '../../evidence/credentials';

const native = NativeModules.SshClient as {
  probeHostKey(host:string,port:number):Promise<{algorithm:string;fingerprint:string;knownHost:string}>;
  execute(host:string,port:number,username:string,password:string,knownHost:string,command:string):Promise<{exitCode:number;stdout:string;stderr:string}>;
};

export type VendorProfile='linux'|'cisco-ios'|'mikrotik';
export const DIAGNOSTIC_COMMANDS:Record<VendorProfile,{label:string;command:string}[]>={
  linux:[{label:'Tiempo activo',command:'uptime'},{label:'Interfaces',command:'ip -brief address'},{label:'Sistema',command:'uname -a'}],
  'cisco-ios':[{label:'Tiempo activo',command:'show version | include uptime'},{label:'Interfaces',command:'show ip interface brief'},{label:'Sistema',command:'show version'}],
  mikrotik:[{label:'Tiempo activo',command:'/system resource print'},{label:'Interfaces',command:'/interface print terse'},{label:'Sistema',command:'/system identity print'}],
};

const hostService=(host:string,port:number)=>`network-diagnostics:ssh-host:${host}:${port}`;
export const probeSshHost=(host:string,port:number)=>native.probeHostKey(host,port);
export async function trustSshHost(host:string,port:number,knownHost:string){await Keychain.setGenericPassword('host-key',knownHost,{service:hostService(host,port)});}
export async function getTrustedSshHost(host:string,port:number){const result=await Keychain.getGenericPassword({service:hostService(host,port)});return result===false?undefined:result.password;}
export async function executeSshDiagnostic(input:{host:string;port:number;username:string;password:string;profile:VendorProfile}){
  const knownHost=await getTrustedSshHost(input.host,input.port);
  if(!knownHost)throw new Error('Primero verificá y aceptá la huella del servidor.');
  await saveSshCredentials(input.host,input.port,input.username,input.password);
  const results=[];
  for(const item of DIAGNOSTIC_COMMANDS[input.profile])results.push({...item,...await native.execute(input.host,input.port,input.username,input.password,knownHost,item.command)});
  return results;
}
export {getSshCredentials};
