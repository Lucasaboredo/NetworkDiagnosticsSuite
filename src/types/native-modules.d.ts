declare module 'react-native-udp' {
  import {Buffer} from 'buffer';
  interface Socket {bind(port?: number): void; close(): void; send(data: Buffer, offset: number, length: number, port: number, address: string, callback?: (error?: Error) => void): void; once(event: string, listener: (...args: any[]) => void): void; on(event: string, listener: (...args: any[]) => void): void; removeAllListeners(): void;}
  const dgram: {createSocket(options: string|{type: string; reusePort?: boolean}): Socket};
  export default dgram;
}
declare module 'react-native-zeroconf' {
  export default class Zeroconf {scan(type?: string, protocol?: string, domain?: string): void; stop(): void; removeDeviceListeners(): void; on(event: string, callback: (service: any) => void): void;}
}
declare module 'react-native-html-to-pdf' { const api: {convert(options: {html: string; fileName: string; directory?: string; base64?: boolean}): Promise<{filePath?: string}>}; export default api; }
