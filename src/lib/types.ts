export type Pulse={id:string;channel:string;event:string;payload:unknown;timestamp:string};
export type ChannelStat={channel:string;subscribers:number;published:number};
export type Transport='connecting'|'connected'|'demo'|'disconnected';
