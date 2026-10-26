import { Buffer } from 'buffer';
import dgram from 'react-native-udp';
import { buildGetRequest, OIDS, parseGetResponse, SnmpResponse } from './ber';

export class SnmpError extends Error {
  constructor(
    message: string,
    public code: 'timeout' | 'access' | 'invalid' | 'network' | 'unsupported',
  ) {
    super(message);
  }
}

export function snmpGet(
  host: string,
  community: string,
  oids: string[],
  timeoutMs = 3500,
  port = 161,
): Promise<SnmpResponse> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket({ type: 'udp4', reusePort: true });
    const { packet, requestId } = buildGetRequest(community, oids);
    let settled = false;
    const finish = (error?: Error, response?: SnmpResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.close();
      error ? reject(error) : resolve(response!);
    };
    const timer = setTimeout(
      () =>
        finish(
          new SnmpError(
            'El equipo no respondió dentro del tiempo esperado.',
            'timeout',
          ),
        ),
      timeoutMs,
    );
    socket.once('error', (error: Error) =>
      finish(new SnmpError(error.message, 'network')),
    );
    socket.once('message', (message: Buffer) => {
      try {
        const response = parseGetResponse(Buffer.from(message));
        if (response.requestId !== requestId)
          throw new SnmpError(
            'El identificador de respuesta no coincide.',
            'invalid',
          );
        if (response.errorStatus === 2)
          throw new SnmpError(
            'La comunidad no tiene acceso al OID solicitado.',
            'access',
          );
        if (response.errorStatus)
          throw new SnmpError(
            `El agente devolvió error SNMP ${response.errorStatus} en índice ${response.errorIndex}.`,
            'unsupported',
          );
        finish(undefined, response);
      } catch (error) {
        finish(
          error instanceof Error
            ? error
            : new SnmpError('Respuesta SNMP inválida.', 'invalid'),
        );
      }
    });
    socket.bind(0);
    socket.send(packet, 0, packet.length, port, host, error => {
      if (error) finish(new SnmpError(error.message, 'network'));
    });
  });
}

export async function runStandardSnmpDiagnostic(
  host: string,
  community: string,
  interfaceIndex = 1,
  port = 161,
) {
  return snmpGet(
    host,
    community,
    [
      OIDS.sysUpTime,
      OIDS.sysName,
      OIDS.ifInOctets(interfaceIndex),
      OIDS.ifOutOctets(interfaceIndex),
    ],
    3500,
    port,
  );
}
