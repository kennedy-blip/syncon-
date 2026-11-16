import type { VercelRequest,VercelResponse } from '@vercel/node';
export type Pulse={id:string;channel:string;event:string;payload:unknown;timestamp:string};
type Listener=(pulse:Pulse)=>void;
const globalHub=globalThis as typeof globalThis & {__syncPulseHub?:{channels:Map<string,Set<Listener>>;history:Pulse[];counts:Map<string,number>}};
const hub=globalHub.__syncPulseHub??={channels:new Map(),history:[],counts:new Map()};
export function validateChannel(v:unknown):v is string{return typeof v==='string'&&v.length>0&&v.length<=80&&/^[a-zA-Z0-9:_-]+$/.test(v)}
export function publish(channel:string,event:string,payload:unknown){const pulse:Pulse={id:`evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,channel,event,payload,timestamp:new Date().toISOString()};hub.history.unshift(pulse);if(hub.history.length>250)hub.history.length=250;hub.counts.set(channel,(hub.counts.get(channel)??0)+1);let delivered=0;hub.channels.get(channel)?.forEach(fn=>{try{fn(pulse);delivered++}catch{/* isolate subscriber errors */}});return{pulse,delivered}}
export function subscribe(channel:string,fn:Listener){const set=hub.channels.get(channel)??new Set<Listener>();set.add(fn);hub.channels.set(channel,set);return()=>{set.delete(fn);if(!set.size)hub.channels.delete(channel)}}
export function snapshot(){const names=new Set([...hub.channels.keys(),...hub.counts.keys()]);return{channels:[...names].map(channel=>({channel,subscribers:hub.channels.get(channel)?.size??0,published:hub.counts.get(channel)??0})),totalSubscribers:[...hub.channels.values()].reduce((n,s)=>n+s.size,0),totalPublished:[...hub.counts.values()].reduce((a,b)=>a+b,0),recent:hub.history.slice(0,30)}}
export function methodNotAllowed(res:VercelResponse,allow:string){res.setHeader('Allow',allow);return res.status(405).json({error:'Method not allowed'})}
export function setCors(req:VercelRequest,res:VercelResponse){const origin=req.headers.origin;if(origin)res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type')}
