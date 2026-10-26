import request from 'supertest';
import {app} from './app';

test('health',async()=>{const response=await request(app).get('/health');expect(response.status).toBe(200);expect(response.body.status).toBe('ok');});
test('idempotencia evita duplicados',async()=>{const body={entityType:'device',entityId:'0f00c8d1-e7bf-4fd3-bf66-81a6bc197045',operation:'upsert',payload:{ip:'192.168.1.1'},updatedAt:'2026-10-25T12:00:00.000Z'};const first=await request(app).post('/api/sync').set('Idempotency-Key','device:test:1').send(body);const second=await request(app).post('/api/sync').set('Idempotency-Key','device:test:1').send({...body,payload:{ip:'otra'}});expect(first.status).toBe(200);expect(second.body).toEqual(first.body);});
