import express from 'express';
import cors from 'cors';
import {z} from 'zod';

const syncSchema=z.object({entityType:z.enum(['device','diagnostic','installation','report']),entityId:z.string().uuid(),operation:z.literal('upsert'),payload:z.record(z.string(),z.unknown()),updatedAt:z.string().datetime()});
type RecordEntry={entityType:string;entityId:string;payload:Record<string,unknown>;updatedAt:string};
const entities=new Map<string,RecordEntry>();
const idempotency=new Map<string,{status:number;body:unknown}>();

export const app=express();
app.use(cors());app.use(express.json({limit:'15mb'}));
app.get('/health',(_req,res)=>res.json({status:'ok',records:entities.size,time:new Date().toISOString()}));
app.post('/api/sync',(req,res)=>{
  const key=req.header('Idempotency-Key');if(!key)return res.status(400).json({error:'Falta Idempotency-Key'});
  const previous=idempotency.get(key);if(previous)return res.status(previous.status).json(previous.body);
  const parsed=syncSchema.safeParse(req.body);if(!parsed.success)return res.status(422).json({error:'Payload inválido',details:parsed.error.flatten()});
  const item=parsed.data;const entityKey=`${item.entityType}:${item.entityId}`;const current=entities.get(entityKey);
  if(current&&new Date(current.updatedAt)>new Date(item.updatedAt)){const body={status:'conflict',resolution:'server-wins',record:current};idempotency.set(key,{status:200,body});return res.json(body);}
  const record={entityType:item.entityType,entityId:item.entityId,payload:item.payload,updatedAt:item.updatedAt};entities.set(entityKey,record);const body={status:'synced',record};idempotency.set(key,{status:200,body});return res.json(body);
});
app.get('/api/entities',(req,res)=>{const type=typeof req.query.type==='string'?req.query.type:undefined;res.json([...entities.values()].filter(item=>!type||item.entityType===type));});
