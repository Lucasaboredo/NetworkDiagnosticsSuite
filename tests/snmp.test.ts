import {Buffer} from 'buffer';
import {buildGetRequest,parseGetResponse} from '../src/protocol/snmp/ber';

describe('SNMP BER',()=>{
  test('construye GetRequest v2c con OID y community',()=>{const {packet,requestId}=buildGetRequest('public',['1.3.6.1.2.1.1.5.0'],42);expect(requestId).toBe(42);expect(packet[0]).toBe(0x30);expect(packet.includes(Buffer.from('public'))).toBe(true);expect(packet.includes(Buffer.from([0xa0]))).toBe(true);});
  test('decodifica GetResponse con sysName',()=>{const packet=Buffer.from('302902010104067075626c6963a21c02012a0201000201003011300f06082b060102010105000403727472','hex');const response=parseGetResponse(packet);expect(response.requestId).toBe(42);expect(response.errorStatus).toBe(0);expect(response.values['1.3.6.1.2.1.1.5.0']).toBe('rtr');});
  test('rechaza paquetes truncados',()=>{expect(()=>parseGetResponse(Buffer.from([0x30,0x05,0x02]))).toThrow(/excede|truncada/);});
});
