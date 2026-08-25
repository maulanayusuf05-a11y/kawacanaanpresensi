import { createClient } from '@supabase/supabase-js';

const json = (res:any,status:number,body:unknown)=>res.status(status).setHeader('Content-Type','application/json').end(JSON.stringify(body));
const limits = (plan: string) => {
  const p = (plan || 'mulai').toLowerCase();
  if (p === 'school' || p === 'sekolah' || p === 'pro' || p === 'enterprise') {
    return { max_teachers: 9, max_students: 256, max_classes: 8 };
  }
  if (p === 'teacher' || p === 'guru') {
    return { max_teachers: 1, max_students: 32, max_classes: 1 };
  }
  // Paket Mulai / Gratis
  return { max_teachers: 1, max_students: 32, max_classes: 1 };
};

export default async function handler(req:any,res:any){
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'});
  const url=process.env.SUPABASE_URL||'';
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY||'';
  if(!url||!key) return json(res,500,{error:'SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib tersedia di Vercel.'});
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
  if(!token) return json(res,401,{error:'Unauthorized'});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:caller,error:callerError}=await admin.auth.getUser(token);
  if(callerError||!caller.user) return json(res,401,{error:'Invalid session'});
  const {data:profile}=await admin.from('profiles').select('id,name,username,role,school_id').eq('id',caller.user.id).maybeSingle();
  if(profile?.role!=='SUPER_ADMIN') return json(res,403,{error:'SUPER ADMIN privileges required'});
  const {action}=req.body||{};

  try{
    if(action==='health'||action==='system_health'){
      const t0 = Date.now();
      const [{ count: schoolsCount, error: schErr }, { count: usersCount, error: usrErr }, { count: logsCount }] = await Promise.all([
        admin.from('schools').select('*', { count: 'exact', head: true }),
        admin.from('profiles').select('*', { count: 'exact', head: true }),
        admin.from('audit_logs').select('*', { count: 'exact', head: true }),
      ]);
      const latencyMs = Date.now() - t0;
      return json(res,200,{
        ok: !schErr && !usrErr,
        status: schErr || usrErr ? 'degraded' : 'healthy',
        supabase: true,
        latencyMs,
        counts: {
          schools: schoolsCount || 0,
          users: usersCount || 0,
          auditLogs: logsCount || 0,
        },
        services: {
          database: schErr ? 'error' : 'operational',
          auth: usrErr ? 'error' : 'operational',
          storage: 'operational',
          apiRouter: 'operational',
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'production',
          region: process.env.VERCEL_REGION || 'asia-southeast1',
          uptime: process.uptime ? Math.floor(process.uptime()) : 86400,
        },
        timestamp: new Date().toISOString()
      });
    }

    if(action==='login_activity'){
      const limit=Math.min(Number(req.body.limit||100),300);
      const {data,error}=await admin.from('audit_logs').select('*, schools(name)').ilike('action','%LOGIN%').order('created_at',{ascending:false}).limit(limit);
      if(error) {
        // Fallback to recent audit logs if login events not distinct
        const {data:recent} = await admin.from('audit_logs').select('*, schools(name)').order('created_at',{ascending:false}).limit(50);
        return json(res,200,{ok:true,activities:(recent||[]).map((l:any)=>({...l,school_name:l.schools?.name||null,ip_address:l.details?.ip||'127.0.0.1',device:l.details?.device||'Browser Web'}))});
      }
      return json(res,200,{ok:true,activities:(data||[]).map((l:any)=>({...l,school_name:l.schools?.name||null,ip_address:l.details?.ip||'127.0.0.1',device:l.details?.device||'Browser Web'}))});
    }

    if(action==='critical_actions'){
      const limit=Math.min(Number(req.body.limit||100),300);
      const criticalKeywords=['DELETE','RESET','OVERRIDE','TOGGLE','UPDATE_CONFIG','ANNOUNCEMENT','SUSPEND'];
      const {data,error}=await admin.from('audit_logs').select('*, schools(name)').order('created_at',{ascending:false}).limit(250);
      if(error) throw error;
      const filtered = (data||[]).filter((l:any)=>{
        const act = (l.action||'').toUpperCase();
        return criticalKeywords.some(k => act.includes(k));
      }).slice(0, limit);
      return json(res,200,{ok:true,criticalLogs:filtered.map((l:any)=>({...l,school_name:l.schools?.name||null}))});
    }

    if(action==='school_details'){
      const schoolId=req.body.school_id||req.body.schoolId||req.body.id;
      if(!schoolId) return json(res,400,{error:'ID Sekolah wajib diisi.'});

      const { data: school, error: schErr } = await admin.from('schools').select('*').eq('id', schoolId).single();
      if (schErr || !school) return json(res, 404, { error: 'Sekolah tidak ditemukan.' });

      const [
        { data: profile },
        { data: sysConfig },
        { data: users },
        { data: classes },
        { data: students },
        { data: payments },
        { data: auditLogs }
      ] = await Promise.all([
        admin.from('school_profile').select('*').eq('school_id', schoolId).maybeSingle(),
        admin.from('system_config').select('*').eq('school_id', schoolId).maybeSingle(),
        admin.from('profiles').select('id, name, username, email, role, is_active, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }),
        admin.from('classes').select('id, name, grade, academic_year').eq('school_id', schoolId),
        admin.from('students').select('id, nama, nisn, class_id, status').eq('school_id', schoolId).limit(250),
        admin.from('payments').select('*').or(`school_id.eq.${schoolId},school_name.eq."${school.name}"`).order('created_at', { ascending: false }),
        admin.from('audit_logs').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(50)
      ]);

      return json(res, 200, {
        ok: true,
        school: {
          ...school,
          school_id: school.id,
        },
        profile: profile || {
          nama_sekolah: school.name,
          npsn: school.npsn || '',
          jenjang: 'SD',
          tahun_pelajaran: '2026/2027',
          semester: '1'
        },
        sysConfig: sysConfig || {},
        users: users || [],
        classes: classes || [],
        students: students || [],
        payments: payments || [],
        auditLogs: auditLogs || [],
        counts: {
          users: users?.length || 0,
          classes: classes?.length || 0,
          students: students?.length || 0,
          payments: payments?.length || 0,
        }
      });
    }

    if(action==='update_school_profile'){
      const schoolId = req.body.school_id || req.body.id;
      const profileData = req.body.profile || {};
      if(!schoolId) return json(res,400,{error:'ID Sekolah wajib diisi.'});

      const { data, error } = await admin.from('school_profile').upsert({
        school_id: schoolId,
        nama_sekolah: profileData.nama_sekolah || profileData.name,
        npsn: profileData.npsn,
        jenjang: profileData.jenjang || 'SD',
        alamat: profileData.alamat || null,
        desa_kelurahan: profileData.kelurahan || profileData.desa_kelurahan || null,
        kecamatan: profileData.kecamatan || null,
        kabupaten_kota: profileData.kota || profileData.kabupaten_kota || null,
        provinsi: profileData.provinsi || null,
        kode_pos: profileData.kode_pos || null,
        telepon_fax: profileData.telepon_fax || null,
        email: profileData.email || null,
        website: profileData.website || null,
        nama_kepala_sekolah: profileData.nama_kepala_sekolah || null,
        nip_kepala_sekolah: profileData.nip_kepala_sekolah || null,
        tahun_pelajaran: profileData.tahun_pelajaran || '2026/2027',
        semester: profileData.semester || '1'
      }, { onConflict: 'school_id' }).select().single();

      if (error) throw error;

      // Update tabel schools jika ada perubahan nama/npsn
      if (profileData.nama_sekolah || profileData.npsn) {
        await admin.from('schools').update({
          name: profileData.nama_sekolah || undefined,
          npsn: profileData.npsn || undefined
        }).eq('id', schoolId);
      }

      await admin.from('audit_logs').insert({
        actor_id: caller.user.id,
        actor_name: profile.name,
        actor_role: 'SUPER_ADMIN',
        action: 'UPDATE_SCHOOL_PROFILE',
        school_id: schoolId,
        details: profileData
      });

      return json(res, 200, { ok: true, profile: data });
    }

    if(action==='school_history'||action==='school_activity'){
      const schoolId=req.body.school_id||req.body.schoolId;
      if(!schoolId) return json(res,400,{error:'ID Sekolah diperlukan'});
      const [{data:logs},{data:school},{data:classes},{data:students}]=await Promise.all([
        admin.from('audit_logs').select('*').eq('school_id',schoolId).order('created_at',{ascending:false}).limit(50),
        admin.from('schools').select('*').eq('id',schoolId).single(),
        admin.from('classes').select('id, name').eq('school_id',schoolId),
        admin.from('students').select('id, nama, nisn, class_id').eq('school_id',schoolId).limit(100),
      ]);
      return json(res,200,{
        ok:true,
        school,
        logs:logs||[],
        classesCount:classes?.length||0,
        studentsCount:students?.length||0,
        sampleStudents:students||[]
      });
    }

    if(action==='get_qris_config'||action==='update_qris_config'){
      const {data:settings}=await admin.from('platform_settings').select('integrations').eq('id',1).single();
      const currentQRIS = (settings?.integrations?.qris_config) || {
        nmid: 'ID1024389281729',
        merchant_name: 'Kawacanaan Presensi Digital',
        acquirer: 'Bank Indonesia / QRIS Nasional',
        simulation_mode: false,
        fee_teacher_plan: 31000,
        fee_school_plan: 270000,
        unique_code_min: 100,
        unique_code_max: 999,
        instructions: 'Pindai kode QRIS menggunakan mobile banking (BCA, Mandiri, BRI, BNI, BSI) atau e-wallet (GoPay, OVO, DANA, ShopeePay).'
      };
      if(action==='get_qris_config') return json(res,200,{ok:true,qris:currentQRIS});
      const qrisData = req.body.qris || {};
      const integrations = { ...(settings?.integrations || {}), qris_config: { ...currentQRIS, ...qrisData } };
      const {error}=await admin.from('platform_settings').update({integrations}).eq('id',1);
      if(error) throw error;
      await admin.from('audit_logs').insert({actor_id:caller.user.id,actor_name:profile.name,actor_role:'SUPER_ADMIN',action:'UPDATE_QRIS_CONFIG',details:qrisData});
      return json(res,200,{ok:true,qris:integrations.qris_config});
    }

    if(action==='list'){
      const [{data:schools,error:sErr},{data:students},{data:profiles},{data:classes}]=await Promise.all([
        admin.from('schools').select('id,name,npsn,code,plan,status,subscription_started_at,subscription_expires_at,max_teachers,max_students,max_classes,notes,created_at,updated_at').order('created_at',{ascending:false}),
        admin.from('students').select('school_id'),
        admin.from('profiles').select('school_id, role').neq('role','SUPER_ADMIN'),
        admin.from('classes').select('school_id'),
      ]);
      if(sErr) throw sErr;

      const studentCounts: Record<string, number> = {};
      (students||[]).forEach((st:any)=>{ if(st.school_id) studentCounts[st.school_id]=(studentCounts[st.school_id]||0)+1; });

      const teacherAdminCounts: Record<string, number> = {};
      (profiles||[]).forEach((pr:any)=>{
        if(pr.school_id && (pr.role==='ADMIN'||pr.role==='WALI KELAS'||pr.role==='GURU MAPEL'||pr.role==='GURU'||pr.role==='KEPALA SEKOLAH')) {
          teacherAdminCounts[pr.school_id]=(teacherAdminCounts[pr.school_id]||0)+1;
        }
      });

      const classCounts: Record<string, number> = {};
      (classes||[]).forEach((cl:any)=>{ if(cl.school_id) classCounts[cl.school_id]=(classCounts[cl.school_id]||0)+1; });

      const rows = (schools||[]).map((s:any)=>{
        const p = (s.plan||'mulai').toLowerCase();
        const normPlan = (p==='school'||p==='sekolah') ? 'school' : (p==='teacher'||p==='guru') ? 'teacher' : 'mulai';
        
        const isPersonal = s.workspace_type === 'personal' || (Boolean(s.code?.startsWith('PER-')) && !s.npsn);
        const workspaceType = isPersonal ? 'personal' : 'school';

        return {
          ...s,
          school_id: s.id,
          plan: normPlan,
          raw_plan: s.plan,
          workspace_type: workspaceType,
          workspace_type_label: isPersonal ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah',
          student_count: studentCounts[s.id] || 0,
          teacher_admin_count: teacherAdminCounts[s.id] || 0,
          class_count: classCounts[s.id] || 0,
          is_personal: isPersonal,
        };
      });

      return json(res,200,{ok:true,schools:rows});
    }

    if(action==='dashboard'){
      const [{data:schools},{data:students},{data:classes},{data:users}]=await Promise.all([
        admin.from('schools').select('id,name,npsn,plan,status,subscription_expires_at,max_teachers,max_students,max_classes,created_at'),
        admin.from('students').select('id, school_id'),
        admin.from('classes').select('id, school_id'),
        admin.from('profiles').select('id, role, school_id').neq('role','SUPER_ADMIN'),
      ]);
      const rows=(schools||[]).map((s:any)=>({...s,school_id:s.id}));
      
      const planStats = {
        mulai: 0,
        teacher: 0,
        school: 0,
      };

      rows.forEach((s: any) => {
        const p = (s.plan || 'mulai').toLowerCase();
        if (p === 'school' || p === 'sekolah') planStats.school++;
        else if (p === 'teacher' || p === 'guru') planStats.teacher++;
        else planStats.mulai++;
      });

      return json(res,200,{
        ok:true,
        schools:rows,
        totals:{
          schools:rows.length,
          active:rows.filter((s:any)=>s.status==='active').length,
          teachers:(users||[]).filter((u:any)=>['ADMIN','WALI KELAS','GURU','KEPALA SEKOLAH'].includes(u.role)).length,
          students:students?.length||0,
          classes:classes?.length||0,
          users:users?.length||0,
          planBreakdown: planStats,
        }
      });
    }

    if(action==='create_school'){
      const p=req.body.payload||req.body;
      const name=String(p.name||'').trim(), npsn=String(p.npsn||'').trim(), plan=String(p.plan||'free');
      if(!name||!npsn) return json(res,400,{error:'Nama sekolah dan NPSN wajib diisi.'});
      const lim=limits(plan);
      const expires=p.subscription_expires_at||p.expiresAt||null;
      const started=p.subscription_started_at||p.startedAt||new Date().toISOString().slice(0, 10);
      const notes=p.notes !== undefined ? (p.notes ? String(p.notes).trim() : null) : null;
      const code=`SCH-${Date.now().toString(36).toUpperCase()}`;
      const workspaceType = p.workspace_type || 'school'; // Sekolah ber-NPSN adalah Ruang Kerja Sekolah
      const {data:school,error}=await admin.from('schools').insert({
        name,
        npsn,
        code,
        plan,
        status:p.status||'active',
        workspace_type: workspaceType,
        subscription_started_at:started,
        subscription_expires_at:expires,
        max_teachers:lim.max_teachers,
        max_students:lim.max_students,
        max_classes:lim.max_classes,
        notes:notes || null
      }).select().single();
      if(error||!school) return json(res,400,{error:error?.message||'Gagal membuat sekolah.'});
      await admin.from('school_profile').insert({school_id:school.id,nama_sekolah:name,npsn,jenjang:p.jenjang||'SD',tahun_pelajaran:`${new Date().getFullYear()}/${new Date().getFullYear()+1}`,semester:'1'});
      await admin.from('system_config').insert({school_id:school.id});
      try {
        const { error: subjectError } = await admin.from('subjects').insert([{school_id:school.id,name:'Tematik / Guru Kelas (Wali Kelas)',code:'TMK',is_specialized:false},{school_id:school.id,name:'Pendidikan Jasmani, Olahraga & Kesehatan (PJOK)',code:'PJOK',is_specialized:true},{school_id:school.id,name:'Pendidikan Agama & Budi Pekerti (PABP)',code:'PABP',is_specialized:true},{school_id:school.id,name:'Bahasa Inggris',code:'BING',is_specialized:true},{school_id:school.id,name:'Bahasa Daerah / Muatan Lokal',code:'MULOK',is_specialized:true},{school_id:school.id,name:'Seni Budaya & Prakarya (SBdP)',code:'SBDP',is_specialized:true}]);
        if (subjectError) console.warn('Gagal membuat mata pelajaran default:', subjectError.message);
      } catch (_) {}
      await admin.from('audit_logs').insert({actor_id:caller.user.id,actor_name:profile.name,actor_role:'SUPER_ADMIN',action:'CREATE_SCHOOL',school_id:school.id,details:{name,npsn,plan,workspace_type:workspaceType,notes}});
      return json(res,200,{ok:true,school:{...school,school_id:school.id,workspace_type:workspaceType}});
    }

    if(action==='update_school'){
      const p=req.body.payload||req.body; const id=p.school_id||p.id;
      if(!id) return json(res,400,{error:'ID sekolah wajib diisi.'});
      const plan=p.plan||'free'; const lim=limits(plan);
      const workspaceType = p.workspace_type || (p.npsn ? 'school' : 'personal');
      const updateData: any = {
        name: String(p.name||'').trim(),
        npsn: String(p.npsn||'').trim(),
        plan,
        status: p.status||'active',
        workspace_type: workspaceType,
        subscription_expires_at: p.subscription_expires_at||p.expiresAt||null,
        max_teachers: lim.max_teachers,
        max_students: lim.max_students,
        max_classes: lim.max_classes
      };
      if (p.subscription_started_at !== undefined) {
        updateData.subscription_started_at = p.subscription_started_at || null;
      }
      if (p.notes !== undefined) {
        updateData.notes = p.notes ? String(p.notes).trim() : null;
      }
      const {data,error}=await admin.from('schools').update(updateData).eq('id',id).select().single();
      if(error) return json(res,400,{error:error.message});
      await admin.from('school_profile').update({nama_sekolah:data.name,npsn:data.npsn}).eq('school_id',id);
      await admin.from('audit_logs').insert({actor_id:caller.user.id,actor_name:profile.name,actor_role:'SUPER_ADMIN',action:'UPDATE_SCHOOL',school_id:id,details:p});
      return json(res,200,{ok:true,school:{...data,school_id:data.id,workspace_type:workspaceType}});
    }

    if(action==='update_notes'||action==='save_notes'){
      const id=req.body.school_id||req.body.id;
      const notes=req.body.notes !== undefined ? (req.body.notes ? String(req.body.notes).trim() : null) : null;
      if(!id) return json(res,400,{error:'ID sekolah wajib diisi.'});
      const {data,error}=await admin.from('schools').update({notes}).eq('id',id).select().single();
      if(error) return json(res,400,{error:error.message});
      await admin.from('audit_logs').insert({actor_id:caller.user.id,actor_name:profile.name,actor_role:'SUPER_ADMIN',action:'UPDATE_SCHOOL_NOTES',school_id:id,details:{notes}});
      return json(res,200,{ok:true,school:data});
    }

    if(action==='toggle_school'){
      const id=req.body.school_id||req.body.id; const status=req.body.status||'active';
      if(!id) return json(res,400,{error:'ID sekolah wajib diisi.'});
      const {error}=await admin.from('schools').update({status}).eq('id',id); if(error) throw error;
      return json(res,200,{ok:true});
    }

    if(action==='delete_school'){
      const id=req.body.schoolId||req.body.school_id||req.body.id; if(!id) return json(res,400,{error:'ID sekolah atau ruang kerja wajib diisi.'});
      
      const { data: targetSchool } = await admin.from('schools').select('name, npsn, workspace_type, is_personal').eq('id', id).maybeSingle();
      const isPersonal = targetSchool?.workspace_type === 'personal' || targetSchool?.is_personal === true;
      const workspaceLabel = isPersonal ? `Ruang Kerja Individu (${targetSchool?.name || id})` : `Sekolah (${targetSchool?.name || id})`;

      // Hapus data terkait sekolah/ruang kerja secara menyeluruh
      try { await admin.from('teacher_class_assignments').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('attendance_records').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('students').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('classes').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('subjects').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('academic_events').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('school_profile').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('system_config').delete().eq('school_id', id); } catch (_) {}
      try { await admin.from('teachers').delete().eq('school_id', id); } catch (_) {}

      const { data: users } = await admin.from('profiles').select('id, name, username').eq('school_id', id);
      for(const u of users || []) {
        try { await admin.auth.admin.deleteUser(u.id); } catch (_) {}
      }
      try { await admin.from('profiles').delete().eq('school_id', id); } catch (_) {}

      const { error } = await admin.from('schools').delete().eq('id', id);
      if(error) throw error;

      await admin.from('audit_logs').insert({
        actor_id: caller.user.id,
        actor_name: profile.name,
        actor_role: 'SUPER_ADMIN',
        action: 'DELETE_SCHOOL',
        details: { schoolId: id, schoolName: targetSchool?.name, isPersonal, label: workspaceLabel }
      });

      return json(res,200,{ ok: true, message: `${workspaceLabel} beserta data terkait berhasil dihapus.` });
    }

    if(action==='delete_user'||action==='delete_admin'){
      const id=req.body.user_id||req.body.userId||req.body.id;
      if(!id) return json(res,400,{error:'User ID wajib disertakan.'});

      const { data: targetProfile } = await admin.from('profiles').select('id, name, username, role, school_id').eq('id', id).maybeSingle();
      if(!targetProfile) {
        return json(res,404,{error:'Pengguna tidak ditemukan di database profil.'});
      }

      // Bersihkan relasi penugasan guru jika ada
      try { await admin.from('teacher_class_assignments').delete().eq('teacher_id', id); } catch (_) {}
      try { await admin.from('teachers').delete().eq('id', id); } catch (_) {}
      
      // Hapus profil
      const { error: pErr } = await admin.from('profiles').delete().eq('id', id);
      if(pErr) throw pErr;

      // Hapus akun di Supabase Auth
      try {
        await admin.auth.admin.deleteUser(id);
      } catch (authErr) {
        console.warn('Supabase Auth user delete warning:', authErr);
      }

      // Catat di audit log
      await admin.from('audit_logs').insert({
        actor_id: caller.user.id,
        actor_name: profile.name,
        actor_role: 'SUPER_ADMIN',
        action: 'DELETE_USER',
        details: { userId: id, name: targetProfile.name, username: targetProfile.username, role: targetProfile.role, schoolId: targetProfile.school_id }
      });

      return json(res,200,{ ok: true, message: `Pengguna ${targetProfile.name} (${targetProfile.username}) berhasil dihapus.` });
    }

    if(action==='create_admin'){
      const schoolId=req.body.school_id||req.body.schoolId; const name=String(req.body.name||'').trim(); const username=String(req.body.username||'').trim().toLowerCase(); const email=String(req.body.email||'').trim().toLowerCase(); const password=String(req.body.password||''); const role=req.body.role||'ADMIN';
      if(!schoolId||!name||!username||!password) return json(res,400,{error:'Sekolah, nama, username, dan password wajib diisi.'});
      const authEmail=email||`${username}@login.edushift.local`;
      const {data:u,error}=await admin.auth.admin.createUser({email:authEmail,password,email_confirm:true,user_metadata:{name,username,role,school_id:schoolId}});
      if(error||!u.user) return json(res,400,{error:error?.message||'Gagal membuat akun.'});
      const {error:pe}=await admin.from('profiles').insert({id:u.user.id,school_id:schoolId,name,username,email:authEmail,role,is_active:true,must_change_password:true});
      if(pe){await admin.auth.admin.deleteUser(u.user.id);return json(res,400,{error:pe.message});}
      return json(res,200,{ok:true,userId:u.user.id});
    }

    if(action==='list_users'||action==='list_admins'){
      const schoolId=req.body.school_id||req.body.schoolId;
      let q=admin.from('profiles').select('id,school_id,name,username,email,role,student_id,is_active,must_change_password,created_at,schools:school_id(name,npsn,plan,workspace_type,code)');
      if(schoolId && schoolId !== 'all') {
        q=q.eq('school_id',schoolId);
      }
      if(action==='list_admins') q=q.in('role',['ADMIN','KEPALA SEKOLAH','GURU','WALI KELAS']);
      const {data,error}=await q.order('created_at',{ascending:false});
      if(error) throw error;
      const formatted = (data||[]).map((u:any)=>{
        const sch = u.schools as any;
        const isCideng = (sch?.name || '').toLowerCase().includes('cideng') || sch?.npsn === '20100123';
        const isPersonal = !isCideng && (sch?.workspace_type === 'personal' || (Boolean(sch?.code?.startsWith('PER-')) && !sch?.npsn));
        return {
          ...u,
          school_name: sch?.name || (isPersonal ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah'),
          school_plan: sch?.plan || 'mulai',
          workspace_type: isPersonal ? 'personal' : 'school',
          workspace_type_label: isPersonal ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah',
          npsn: sch?.npsn || null,
        };
      });
      return json(res,200,{ok:true,users:formatted,admins:formatted});
    }

    if(action==='reset_admin_password'){
      const id=req.body.user_id||req.body.userId; const password=String(req.body.password||''); if(!id||password.length<8) return json(res,400,{error:'User ID dan password minimal 8 karakter wajib diisi.'});
      const {error}=await admin.auth.admin.updateUserById(id,{password}); if(error) throw error;
      await admin.from('profiles').update({must_change_password:true}).eq('id',id); return json(res,200,{ok:true});
    }

    if(action==='toggle_admin'){
      const id=req.body.user_id||req.body.userId; const {error}=await admin.from('profiles').update({is_active:!!req.body.is_active}).eq('id',id); if(error) throw error; return json(res,200,{ok:true});
    }

    if(action==='payments'){
      const {data,error}=await admin.from('payments').select('*').order('created_at',{ascending:false}).limit(500);
      if(error) throw error;
      return json(res,200,{ok:true,payments:(data||[]).map((p:any)=>({id:p.id,invoiceNo:p.invoice_no,planId:p.plan_name?.toLowerCase().includes('guru')?'teacher':'school',planName:p.plan_name,amount:Number(p.amount),uniqueCode:Number(p.unique_code),totalAmount:Number(p.total_amount),schoolName:p.school_name,npsn:p.npsn||'',contactName:p.contact_name,contactPhone:p.contact_phone||'',email:p.email||'',status:p.status,paymentMethod:p.payment_method,createdAt:p.created_at,paidAt:p.paid_at||undefined,expiresAt:p.expires_at||'',qrisNmid:p.qris_nmid||''}))});
    }

    if(action==='audit'){
      const limit=Math.min(Number(req.body.limit||150),500);
      const {data,error}=await admin.from('audit_logs').select('*, schools(name)').order('created_at',{ascending:false}).limit(limit); if(error) throw error;
      const logs=(data||[]).map((l:any)=>({...l,school_name:l.schools?.name||null,actor_username:l.actor_id||null})); return json(res,200,{ok:true,logs});
    }

    if(action==='get_config'||action==='update_config'){
      const {data:settings}=await admin.from('platform_settings').select('integrations').eq('id',1).single();
      const defaultWorkspaceRules = {
        join_class_workspace_type: 'school',
        join_class_label: 'Ruang Kerja Sekolah',
        manage_own_class_workspace_type: 'personal',
        manage_own_class_label: 'Ruang Kerja Individu',
        rule_definition: 'Pilihan bergabung ke kelas termasuk ruang kerja sekolah, sedangkan kelola kelas sendiri termasuk ruang kerja individu.',
        sdn_cideng_07_type: 'school'
      };
      const currentConfig = (settings?.integrations?.platform_config) || {};
      const mergedConfig = {
        workspace_rules: defaultWorkspaceRules,
        ...currentConfig,
      };

      if(action==='get_config') return json(res,200,{ok:true,config:mergedConfig});
      const config=req.body.config||{};
      const integrations={
        ...(settings?.integrations||{}),
        platform_config: { ...mergedConfig, ...config, workspace_rules: defaultWorkspaceRules },
        workspace_rules: defaultWorkspaceRules
      };
      const {error}=await admin.from('platform_settings').update({integrations}).eq('id',1); if(error) throw error; 
      return json(res,200,{ok:true,config:integrations.platform_config});
    }

    if(action==='get_announcement'||action==='save_announcement'){
      const {data:settings}=await admin.from('platform_settings').select('integrations').eq('id',1).single();
      if(action==='get_announcement') return json(res,200,{ok:true,announcement:settings?.integrations?.announcement||null});
      const announcement={message:String(req.body.message||''),type:req.body.type||'info',active:Boolean(req.body.active),updatedAt:new Date().toISOString()};
      const integrations={...(settings?.integrations||{}),announcement}; const {error}=await admin.from('platform_settings').update({integrations}).eq('id',1); if(error) throw error; return json(res,200,{ok:true,announcement});
    }

    return json(res,400,{error:'Aksi tidak didukung.'});
  }catch(e:any){return json(res,500,{error:e?.message||'Internal server error'});}
}
