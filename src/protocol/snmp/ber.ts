/* eslint-disable no-bitwise -- BER encoding operates on protocol bytes and bit flags. */
import {Buffer} from 'buffer';

export const OIDS = {
  sysUpTime: '1.3.6.1.2.1.1.3.0',
  sysName: '1.3.6.1.2.1.1.5.0',
  ifInOctets: (index: number) => `1.3.6.1.2.1.2.2.1.10.${index}`,
  ifOutOctets: (index: number) => `1.3.6.1.2.1.2.2.1.16.${index}`,
};

const lengthBytes = (length: number): number[] => {
  if (length < 128) return [length];
  const bytes: number[] = [];
  for (let n = length; n > 0; n >>= 8) bytes.unshift(n & 0xff);
  return [0x80 | bytes.length, ...bytes];
};

const tlv = (tag: number, value: number[] | Buffer) => Buffer.from([tag, ...lengthBytes(value.length), ...value]);

export const encodeInteger = (value: number) => {
  const bytes: number[] = [];
  let n = value;
  do { bytes.unshift(n & 0xff); n >>= 8; } while (n > 0);
  if (bytes[0] & 0x80) bytes.unshift(0);
  return tlv(0x02, bytes);
};

export const encodeOctetString = (value: string) => tlv(0x04, Buffer.from(value, 'utf8'));
export const encodeNull = () => Buffer.from([0x05, 0x00]);

export const encodeOid = (oid: string) => {
  const parts = oid.split('.').map(Number);
  if (parts.length < 2 || parts[0] > 2 || parts.some(Number.isNaN)) throw new Error(`OID inválido: ${oid}`);
  const body: number[] = [parts[0] * 40 + parts[1]];
  for (const part of parts.slice(2)) {
    const encoded = [part & 0x7f];
    for (let n = part >> 7; n > 0; n >>= 7) encoded.unshift((n & 0x7f) | 0x80);
    body.push(...encoded);
  }
  return tlv(0x06, body);
};

export const buildGetRequest = (community: string, oids: string[], requestId = Math.floor(Math.random() * 0x7fffffff), version: 0|1 = 1) => {
  const varBinds = oids.map(oid => tlv(0x30, Buffer.concat([encodeOid(oid), encodeNull()])));
  const pdu = tlv(0xa0, Buffer.concat([encodeInteger(requestId), encodeInteger(0), encodeInteger(0), tlv(0x30, Buffer.concat(varBinds))]));
  return {requestId, packet: tlv(0x30, Buffer.concat([encodeInteger(version), encodeOctetString(community), pdu]))};
};

type BerNode = {tag: number; value: Buffer; children?: BerNode[]};
const readLength = (data: Buffer, offset: number) => {
  const first = data[offset];
  if ((first & 0x80) === 0) return {length: first, bytes: 1};
  const count = first & 0x7f;
  if (!count || count > 4 || offset + count >= data.length) throw new Error('Longitud BER inválida');
  let length = 0;
  for (let i = 0; i < count; i++) length = (length << 8) | data[offset + 1 + i];
  return {length, bytes: 1 + count};
};

const constructed = new Set([0x30, 0xa0, 0xa2]);
const parseNode = (data: Buffer, offset = 0): {node: BerNode; next: number} => {
  if (offset + 2 > data.length) throw new Error('Respuesta BER truncada');
  const tag = data[offset];
  const l = readLength(data, offset + 1);
  const start = offset + 1 + l.bytes;
  const end = start + l.length;
  if (end > data.length) throw new Error('Longitud BER excede el paquete');
  const value = data.subarray(start, end);
  const node: BerNode = {tag, value};
  if (constructed.has(tag)) {
    node.children = [];
    for (let cursor = start; cursor < end;) {
      const parsed = parseNode(data, cursor);
      node.children.push(parsed.node);
      cursor = parsed.next;
    }
  }
  return {node, next: end};
};

const intValue = (node: BerNode) => { let n = 0; for (const b of node.value) n = n * 256 + b; return n; };
const oidValue = (node: BerNode) => {
  if (!node.value.length) return '';
  const out = [Math.min(2, Math.floor(node.value[0] / 40)), node.value[0] % 40];
  let value = 0;
  for (const byte of node.value.subarray(1)) { value = (value << 7) | (byte & 0x7f); if (!(byte & 0x80)) { out.push(value); value = 0; } }
  return out.join('.');
};

const decodeValue = (node: BerNode): string|number|null => {
  if (node.tag === 0x02 || node.tag === 0x41 || node.tag === 0x42 || node.tag === 0x43 || node.tag === 0x46) return intValue(node);
  if (node.tag === 0x04) return node.value.toString('utf8');
  if (node.tag === 0x05) return null;
  if (node.tag === 0x06) return oidValue(node);
  if (node.tag === 0x80 || node.tag === 0x81 || node.tag === 0x82) return null;
  return node.value.toString('hex');
};

export interface SnmpResponse {requestId: number; errorStatus: number; errorIndex: number; values: Record<string, string|number|null>}
export const parseGetResponse = (packet: Buffer): SnmpResponse => {
  const root = parseNode(packet).node;
  const top = root.children;
  if (root.tag !== 0x30 || !top || top.length < 3) throw new Error('Mensaje SNMP inválido');
  const pdu = top[2];
  if (pdu.tag !== 0xa2 || !pdu.children || pdu.children.length < 4) throw new Error('Se esperaba GetResponse');
  const [request, error, index, list] = pdu.children;
  const values: Record<string, string|number|null> = {};
  for (const binding of list.children ?? []) {
    if (!binding.children || binding.children.length !== 2) throw new Error('VarBind inválido');
    values[oidValue(binding.children[0])] = decodeValue(binding.children[1]);
  }
  return {requestId: intValue(request), errorStatus: intValue(error), errorIndex: intValue(index), values};
};
