import { createClient } from '@supabase/supabase-js';
const json=(res:any,status:number,body:unknown)=>res.status(status).setHeader('Content-Type','application/json').end(JSON.stringify(body));
export default async function handler(req:any,res:any){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const url=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||''; if(!url||!key)return json(res,500,{error:'Server configuration missing'});
 const username=String(req.body?.username||'').trim().toLowerCase(); if(!username)return json(res,400,{error:'Username wajib diisi'});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}); const {data}=await db.from('profiles').select('email').eq('username',username).eq('is_active',true).maybeSingle();
 return json(res,200,{ok:true,email:data?.email||`${username}@login.edushift.local`});
}
