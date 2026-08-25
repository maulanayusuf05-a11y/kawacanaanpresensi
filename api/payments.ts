import { createClient } from '@supabase/supabase-js';
const json=(res:any,status:number,body:unknown)=>res.status(status).setHeader('Content-Type','application/json').end(JSON.stringify(body));
export default async function handler(req:any,res:any){
 if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
 const url=process.env.SUPABASE_URL||'', key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
 if(!url||!key) return json(res,500,{error:'Supabase server configuration is missing.'});
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim(); if(!token)return json(res,401,{error:'Unauthorized'});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await db.auth.getUser(token); if(authError||!auth.user)return json(res,401,{error:'Invalid session'});
 const {data:profile}=await db.from('profiles').select('role,school_id').eq('id',auth.user.id).single(); if(!profile)return json(res,403,{error:'Profile not found'});
 const b=req.body||{};
 if(b.action==='settle'){
   if(!['ADMIN','SUPER_ADMIN'].includes(profile.role))return json(res,403,{error:'Only admin can record payment.'});
   const t=b.transaction; if(!t?.invoiceNo)return json(res,400,{error:'Invoice tidak valid.'});
   const {data,error}=await db.from('payments').upsert({invoice_no:t.invoiceNo,school_id:profile.role==='SUPER_ADMIN'?(t.schoolId||null):profile.school_id,plan_name:t.planName,amount:t.amount,unique_code:t.uniqueCode,total_amount:t.totalAmount,status:'SETTLED',payment_method:'QRIS',school_name:t.schoolName,npsn:t.npsn||null,contact_name:t.contactName,contact_phone:t.contactPhone||null,email:t.email||null,qris_nmid:t.qrisNmid,created_at:t.createdAt,expires_at:t.expiresAt,paid_at:t.paidAt||new Date().toISOString()},{onConflict:'invoice_no'}).select().single();
   if(error)return json(res,400,{error:error.message}); return json(res,200,{ok:true,payment:data});
 }
 return json(res,400,{error:'Aksi pembayaran tidak didukung.'});
}
