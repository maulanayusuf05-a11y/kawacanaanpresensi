import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, usernameToEmail } from '../lib/supabase';
import { Student, AttendanceRecord, AttendanceStatus, AttendanceType, Subject, UserAccount, UserAccountInput, SchoolProfile, AcademicEvent, SystemConfig, ActiveView, SchoolClass, Teacher, GeneratedAccountResult, UserRole, WorkspaceMembership } from '../types';
import { INITIAL_SCHOOL_PROFILE, INITIAL_SYSTEM_CONFIG, DEFAULT_SD_SUBJECTS } from '../data/initialData';

interface Toast { id:string; type:'success'|'info'|'error'; message:string; }
interface AppContextType {
 currentUser: UserAccount|null; setCurrentUser:(u:UserAccount|null)=>void; logout:()=>Promise<void>; registrationRequired:boolean; setRegistrationRequired:(v:boolean)=>void; activeView:ActiveView; setActiveView:(v:ActiveView)=>void;
 // Workspace & Onboarding
 userWorkspaces: WorkspaceMembership[];
 activeWorkspace: WorkspaceMembership | null;
 isOnboarding: boolean;
 setIsOnboarding: (v: boolean) => void;
 isSelectingWorkspace: boolean;
 setIsSelectingWorkspace: (v: boolean) => void;
 selectWorkspace: (ws: WorkspaceMembership) => Promise<void>;
 openOnboarding: () => void;
 returnToWorkspaceSelector: () => void;
 loadUserDataAfterOnboarding: (userId: string) => Promise<void>;
 loadData: (userId?: string) => Promise<void>;
 schoolProfile:SchoolProfile; updateSchoolProfile:(p:SchoolProfile)=>Promise<void>; systemConfig:SystemConfig; updateSystemConfig:(c:SystemConfig)=>Promise<void>;
 classes:SchoolClass[]; addClass:(c:Omit<SchoolClass,'id'>)=>Promise<void>; updateClass:(id:string,c:Omit<SchoolClass,'id'>)=>Promise<void>; deleteClass:(id:string)=>Promise<void>; assignTeacherClasses:(teacherId:string,classIds:string[])=>Promise<void>; importClasses:(items:Array<Omit<SchoolClass,'id'> & { waliKelasNameInput?: string }>,replaceExisting?:boolean)=>Promise<void>;
 teachers:Teacher[]; addTeacher:(t:Omit<Teacher,'id'>)=>Promise<void>; updateTeacher:(id:string,t:Omit<Teacher,'id'>)=>Promise<void>; deleteTeacher:(id:string)=>Promise<void>; importTeachers:(t:Omit<Teacher,'id'>[],replaceExisting?:boolean)=>Promise<void>;
 subjects:Subject[]; addSubject:(s:Omit<Subject,'id'>)=>Promise<void>; updateSubject:(id:string,s:Omit<Subject,'id'>)=>Promise<void>; deleteSubject:(id:string)=>Promise<void>;
 students:Student[]; addStudent:(s:Omit<Student,'id'>)=>Promise<void>; updateStudent:(id:string,s:Omit<Student,'id'>)=>Promise<void>; deleteStudent:(id:string)=>Promise<void>; deleteStudentsByClass:(classId:string)=>Promise<void>; importStudents:(s:Omit<Student,'id'>[],replaceExisting?:boolean,targetClassId?:string)=>Promise<void>;
 users:UserAccount[]; addUser:(u:UserAccountInput)=>Promise<void>; deleteUser:(id:string)=>Promise<void>; updateUser:(id:string,data:Partial<UserAccount>)=>Promise<void>; syncUsersWithStudents:()=>Promise<void>; generateAccountsFromReferences:(options?: { resetExistingPasswords?: boolean }) => Promise<GeneratedAccountResult[]>; updateUserPassword:(id:string,p:string)=>Promise<void>;
 academicEvents:AcademicEvent[]; addAcademicEvent:(e:Omit<AcademicEvent,'id'>)=>Promise<void>; deleteAcademicEvent:(id:string)=>Promise<void>;
 activeStudyDays:number[]; updateActiveStudyDays:(d:number[])=>Promise<void>; effectiveDaysConfig:{[key:string]:number}; updateEffectiveDays:(key:string,d:number)=>Promise<void>;
 getBaseStudyDaysForMonth:(year:number,month:number)=>number; getEffectiveDaysForMonth:(year:number|string,month?:number)=>number;
 getDateStatus:(date:string)=>{isStudyDay:boolean;isHoliday:boolean;isEffective:boolean;label:string;badgeColor:string;eventTitle?:string};
 attendanceRecords:AttendanceRecord[]; currentAttendanceDate:string; setCurrentAttendanceDate:(d:string)=>void;
 saveDailyAttendance:(date:string,r:AttendanceRecord[],options?:{type?:AttendanceType;subjectId?:string|null;subjectName?:string|null;classId?:string|null})=>Promise<void>;
 getAttendanceForDate:(date:string,options?:{type?:AttendanceType;subjectId?:string|null;classId?:string|null})=>AttendanceRecord[];
 submitStudentAttendance:(studentId:string,type:'masuk'|'pulang'|'izin'|'sakit',notes?:string,customDate?:string)=>Promise<{success:boolean;message:string}>;
 changeOwnPassword:(newPassword:string)=>Promise<{success:boolean;message:string}>;
 resetAllDataToProductionReady:()=>Promise<void>; toasts:Toast[]; showToast:(m:string,t?:Toast['type'])=>void; removeToast:(id:string)=>void;
 impersonateSchool:(school: { id: string; name: string; plan?: string }) => void;
 stopImpersonation:() => void;
 globalAnnouncement: { id?: string; message: string; type: 'info' | 'warning' | 'alert'; active: boolean; updatedAt?: string } | null;
 updateGlobalAnnouncement: (announcement: { message: string; type: 'info' | 'warning' | 'alert'; active: boolean }) => Promise<void>;
}
const AppContext=createContext<AppContextType|undefined>(undefined);

const emptyUser=(p:any):UserAccount=>{
  const email = (p.email || '').trim().toLowerCase();
  const isGoogle = !!p.is_google_auth || !!p.isGoogleAuth || p.auth_provider === 'google' || p.provider === 'google' || email.endsWith('@gmail.com') || email.endsWith('@googlemail.com') || email.includes('belajar.id') || email.includes('google');
  return {
    id: p.id,
    name: p.name || '',
    username: p.username || '',
    password: p.password || undefined,
    role: p.role,
    email: p.email || null,
    authProvider: p.auth_provider || p.provider || (isGoogle ? 'google' : null),
    isGoogleAuth: isGoogle,
    studentId: p.student_id || null,
    schoolId: p.school_id || null,
    schoolCode: p.school_code || p.schoolCode || p.code || null,
    mustChangePassword: !!p.must_change_password,
    classIds: p.class_ids || [],
    classNames: p.class_names || [],
    subscriptionPlan: p.subscription_plan || null,
    subscriptionStatus: p.subscription_status || null,
    subscriptionExpiresAt: p.subscription_expires_at || null,
    maxTeachers: p.max_teachers,
    maxStudents: p.max_students,
    maxClasses: p.max_classes,
  };
};
const dbStudent=(s:any):Student=>({id:s.id,nisn:s.nisn,nama:s.nama,gender:s.gender,classId:s.class_id||null,className:s.class_name||''});
const dbTeacher=(t:any):Teacher=>{
  const jabRaw = String(t.jabatan || '').trim();
  const jenisRaw = String(t.jenis_ptk || '').trim();
  const mapelRaw = String(t.mata_pelajaran || '').trim();

  let resolvedJabatan: 'Wali Kelas' | 'Guru Mapel' | 'Kepala Sekolah' = 'Wali Kelas';
  
  if (jabRaw) {
    if (jabRaw.toLowerCase().includes('kepala')) {
      resolvedJabatan = 'Kepala Sekolah';
    } else if (jabRaw.toLowerCase().includes('mapel') || jabRaw.toLowerCase().includes('mata pelajaran') || jabRaw.toLowerCase().includes('bidang studi')) {
      resolvedJabatan = 'Guru Mapel';
    } else if (jabRaw.toLowerCase().includes('wali') || jabRaw.toLowerCase().includes('kelas')) {
      resolvedJabatan = 'Wali Kelas';
    } else {
      resolvedJabatan = jabRaw === 'Guru Mapel' ? 'Guru Mapel' : 'Wali Kelas';
    }
  } else if (jenisRaw) {
    if (jenisRaw.toLowerCase().includes('kepala')) {
      resolvedJabatan = 'Kepala Sekolah';
    } else if (jenisRaw.toLowerCase().includes('mapel') || jenisRaw.toLowerCase().includes('mata pelajaran')) {
      resolvedJabatan = 'Guru Mapel';
    } else if (jenisRaw.toLowerCase().includes('wali') || jenisRaw.toLowerCase().includes('kelas')) {
      resolvedJabatan = 'Wali Kelas';
    } else {
      resolvedJabatan = jenisRaw === 'Guru Mapel' ? 'Guru Mapel' : 'Wali Kelas';
    }
  } else if (mapelRaw) {
    if (mapelRaw.toLowerCase().includes('kepala')) {
      resolvedJabatan = 'Kepala Sekolah';
    } else if (mapelRaw === 'Guru Mapel' || mapelRaw.toLowerCase() === 'guru mapel' || mapelRaw.toLowerCase().includes('mapel') || mapelRaw.toLowerCase().includes('mata pelajaran')) {
      resolvedJabatan = 'Guru Mapel';
    } else if (mapelRaw.toLowerCase().includes('wali') || mapelRaw.toLowerCase().includes('kelas')) {
      resolvedJabatan = 'Wali Kelas';
    } else if (mapelRaw && mapelRaw !== '-' && mapelRaw !== 'PNS' && mapelRaw !== 'PPPK' && mapelRaw !== 'Honorer') {
      resolvedJabatan = 'Guru Mapel';
    } else {
      resolvedJabatan = 'Wali Kelas';
    }
  }

  const finalJabatan = t.jabatan || resolvedJabatan;

  return {
    id: t.id,
    nama: t.nama || '',
    nip: t.nip || '',
    jenisKelamin: t.jenis_kelamin || t.jenisKelamin || 'L',
    jabatan: finalJabatan,
    jenisPTK: t.jenis_ptk || t.jenisPTK || finalJabatan,
    mataPelajaran: t.mata_pelajaran || t.mataPelajaran || finalJabatan,
    statusKepegawaian: t.status_kepegawaian || t.statusKepegawaian || 'PNS',
    noHp: t.no_hp || t.noHp || '',
  };
};

const dbSubject=(x:any):Subject=>{
  let extra:any = {};
  let cleanCode = x.code || '';
  if (cleanCode && cleanCode.includes('__META:')) {
    const parts = cleanCode.split('__META:');
    cleanCode = parts[0];
    try {
      extra = JSON.parse(parts[1]);
    } catch (_) {}
  }
  return {
    id: x.id,
    name: x.name,
    code: cleanCode || undefined,
    isSpecialized: !!x.is_specialized,
    teacherId: extra.teacherId || x.teacher_id || null,
    teacherName: extra.teacherName || x.teacher_name || null,
    targetClassIds: extra.targetClassIds || [],
    targetClassNames: extra.targetClassNames || [],
    scheduleDays: extra.scheduleDays || [],
    lessonPeriod: extra.lessonPeriod || '',
  };
};

const packSubjectCode=(s:Omit<Subject, 'id'>):string=>{
  const baseCode = (s.code || s.name.slice(0, 4)).toUpperCase().trim();
  const meta = {
    teacherId: s.teacherId || null,
    teacherName: s.teacherName || null,
    targetClassIds: s.targetClassIds || [],
    targetClassNames: s.targetClassNames || [],
    scheduleDays: s.scheduleDays || [],
    lessonPeriod: s.lessonPeriod || '',
  };
  return `${baseCode}__META:${JSON.stringify(meta)}`;
};
const dbAttendance=(r:any, students:Student[]):AttendanceRecord=>({id:r.id,date:r.date,studentId:r.student_id,studentName:students.find(s=>s.id===r.student_id)?.nama||'',status:r.status,checkInTime:r.check_in_time?String(r.check_in_time).slice(0,5):'-',checkOutTime:r.check_out_time?String(r.check_out_time).slice(0,5):'-',notes:r.notes||'',type:r.type||'DAILY',subjectId:r.subject_id||null,subjectName:r.subject_name||null,classId:r.class_id||students.find(s=>s.id===r.student_id)?.classId||null,teacherId:r.updated_by||null});
const dbEvent=(e:any):AcademicEvent=>({id:e.id,date:e.date,dateDisplay:e.date_display||e.date,title:e.title,isEffective:e.is_effective,notes:e.notes||''});
const formatFullAlamat=(p:{jalan?:string;desaKelurahan?:string;kecamatan?:string;kabupatenKota?:string;provinsi?:string;kodePos?:string}):string=>{const parts=[p.jalan,p.desaKelurahan?`Desa/Kel. ${p.desaKelurahan}`:'',p.kecamatan?`Kec. ${p.kecamatan}`:'',p.kabupatenKota,p.provinsi,p.kodePos?`Kode Pos ${p.kodePos}`:''].filter(Boolean);return parts.join(', ');};

const dbSchool=(p:any, extraCode?:string):SchoolProfile=>{
  if(!p) return { ...INITIAL_SCHOOL_PROFILE, kodeSekolah: extraCode ? String(extraCode).replace(/^SCH-?/i, '').trim().toUpperCase() : '' };
  let ext:any={};
  const rawAlamat = String(p.alamat || '').trim();
  if(rawAlamat.startsWith('{') || rawAlamat.startsWith('__EXTJSON__:')){
    try{
      const raw = rawAlamat.startsWith('__EXTJSON__:') ? rawAlamat.slice(12) : rawAlamat;
      ext = JSON.parse(raw);
    }catch(_){}
  }
  const rawCode = extraCode || p.code || p.kode_sekolah || p.kodeSekolah || ext.kodeSekolah || ext.kode_sekolah || '';
  const cleanKodeSekolah = rawCode ? String(rawCode).replace(/^SCH-?/i, '').trim().toUpperCase() : '';
  const jenjang = ext.jenjang || p.jenjang || 'SD/MI';
  const jalan = (ext.jalan !== undefined && ext.jalan !== null) ? ext.jalan : (p.jalan || (rawAlamat.startsWith('__EXTJSON__:') || rawAlamat.startsWith('{') ? '' : rawAlamat));
  const desaKelurahan = ext.desaKelurahan || ext.desa_kelurahan || ext.kelurahan || p.desa_kelurahan || p.kelurahan || p.desaKelurahan || '';
  const kecamatan = ext.kecamatan || p.kecamatan || '';
  const kabupatenKota = ext.kabupatenKota || ext.kabupaten_kota || ext.kota || p.kabupaten_kota || p.kota || p.kabupatenKota || '';
  const provinsi = ext.provinsi || p.provinsi || '';
  const kodePos = ext.kodePos || ext.kode_pos || p.kode_pos || p.kodePos || '';
  const teleponFax = ext.teleponFax || ext.telepon_fax || ext.telepon || p.telepon_fax || p.telepon || p.teleponFax || '';
  const email = ext.email || p.email || '';
  const website = ext.website || p.website || '';
  
  const formattedAddress = formatFullAlamat({ jalan, desaKelurahan, kecamatan, kabupatenKota, provinsi, kodePos });
  const fullAlamat = ext.full || formattedAddress || (rawAlamat.startsWith('__EXTJSON__:') || rawAlamat.startsWith('{') ? '' : rawAlamat);

  const namaKepalaSekolah = p.nama_kepala_sekolah || p.namaKepalaSekolah || ext.namaKepalaSekolah || ext.nama_kepala_sekolah || '';
  const nipKepalaSekolah = p.nip_kepala_sekolah || p.nipKepalaSekolah || ext.nipKepalaSekolah || ext.nip_kepala_sekolah || '';

  let semester = p.semester || ext.semester || '1 (Ganjil)';
  if (semester === '1') semester = '1 (Ganjil)';
  if (semester === '2') semester = '2 (Genap)';

  return {
    namaSekolah: p.nama_sekolah || p.namaSekolah || ext.namaSekolah || '',
    jenjang,
    npsn: p.npsn || ext.npsn || '',
    kodeSekolah: cleanKodeSekolah,
    alamat: fullAlamat,
    jalan,
    desaKelurahan,
    kecamatan,
    kabupatenKota,
    provinsi,
    kodePos,
    teleponFax,
    email,
    website,
    tahunPelajaran: p.tahun_pelajaran || p.tahunPelajaran || ext.tahunPelajaran || '2025/2026',
    semester,
    kelas: p.kelas || '',
    namaKepalaSekolah,
    nipKepalaSekolah,
    namaWaliKelas: p.nama_wali_kelas || p.namaWaliKelas || '',
    nipWaliKelas: p.nip_wali_kelas || p.nipWaliKelas || ''
  };
};
const dbConfig=(c:any):SystemConfig=>({appTitle:c.app_title||INITIAL_SYSTEM_CONFIG.appTitle,appSubtitle:c.app_subtitle||'',footerCopyright:c.footer_copyright||INITIAL_SYSTEM_CONFIG.footerCopyright,schoolLogoUrl:c.school_logo_url||'',letterheadType:c.letterhead_type||'standard_text',letterheadImageUrl:c.letterhead_image_url||'',showLetterhead:c.show_letterhead??true,defaultCheckInTime:c.default_check_in_time||'06:30 AM',defaultCheckOutTime:c.default_check_out_time||'12:20 PM',reportPlace:c.report_place||'',reportDate:c.report_date||new Date().toISOString().slice(0,10),activeStudyDays:c.active_study_days||[1,2,3,4,5],studentSelfAttendanceEnabled:c.student_self_attendance_enabled??true,checkInStartTime:String(c.check_in_start_time||'06:00').slice(0,5),checkInDeadlineTime:String(c.check_in_deadline_time||'07:00').slice(0,5),checkOutStartTime:String(c.check_out_start_time||'12:30').slice(0,5),autoMarkLate:c.auto_mark_late??true});

export const AppProvider:React.FC<{children:React.ReactNode}>=({children})=>{
 const [currentUser,setCurrentUser]=useState<UserAccount|null>(null);
 const [registrationRequired,setRegistrationRequired]=useState(false);
 const [passwordRecovery,setPasswordRecovery]=useState(false);

 // Workspace & Onboarding State
 const [userWorkspaces, setUserWorkspaces] = useState<WorkspaceMembership[]>([]);
 const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceMembership | null>(null);
 const [isOnboarding, setIsOnboarding] = useState<boolean>(false);
 const [isSelectingWorkspace, setIsSelectingWorkspace] = useState<boolean>(false);

 const getInitialActiveView = (): ActiveView => 'login';
 const [activeView,setActiveViewState]=useState<ActiveView>('login');
 const activeViewRef = React.useRef<ActiveView>('login');
 const loadRequestRef=React.useRef(0);
 const navigationIntentRef=React.useRef(0);
 const setActiveView=(view:ActiveView)=>{ navigationIntentRef.current+=1; activeViewRef.current=view; setActiveViewState(view); };
 const [schoolProfile,setSchoolProfile]=useState<SchoolProfile>(INITIAL_SCHOOL_PROFILE);
 const [systemConfig,setSystemConfig]=useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
 const [classes,setClasses]=useState<SchoolClass[]>([]);
 const [teachers,setTeachers]=useState<Teacher[]>([]);
 const [subjects,setSubjects]=useState<Subject[]>(DEFAULT_SD_SUBJECTS);
 const [students,setStudents]=useState<Student[]>([]);
 const [users,setUsers]=useState<UserAccount[]>([]);
 const [academicEvents,setAcademicEvents]=useState<AcademicEvent[]>([]);
 const [activeStudyDays,setActiveStudyDays]=useState<number[]>([1,2,3,4,5]);
 const [effectiveDaysConfig,setEffectiveDaysConfig]=useState<{[key:string]:number}>({});
 const [attendanceRecords,setAttendanceRecords]=useState<AttendanceRecord[]>([]);
 const [currentAttendanceDate,setCurrentAttendanceDate]=useState(new Date().toISOString().slice(0,10));
 const [toasts,setToasts]=useState<Toast[]>([]);
 const [globalAnnouncement, setGlobalAnnouncement] = useState<{ id?: string; message: string; type: 'info' | 'warning' | 'alert'; active: boolean; updatedAt?: string } | null>(null);

 useEffect(() => {
   if (!currentUser || currentUser.role !== 'SUPER_ADMIN') return;
   supabase.from('platform_settings').select('integrations').eq('id', 1).maybeSingle().then(({ data }) => {
     const ann = (data as any)?.integrations?.announcement;
     if (ann && ann.message) {
       setGlobalAnnouncement(ann);
     }
   });
 }, [currentUser]);

 const updateGlobalAnnouncement = async (ann: { message: string; type: 'info' | 'warning' | 'alert'; active: boolean }) => {
   try {
     const { data: current } = await supabase.from('platform_settings').select('integrations').eq('id', 1).maybeSingle();
     const nextIntegrations = { ...(current?.integrations || {}), announcement: { ...ann, updatedAt: new Date().toISOString() } };
     await supabase.from('platform_settings').update({ integrations: nextIntegrations }).eq('id', 1);
     setGlobalAnnouncement({ ...ann, updatedAt: new Date().toISOString() });
     showToast('Pengumuman global berhasil diperbarui.', 'success');
   } catch (e: any) {
     showToast(e.message || 'Gagal menyimpan pengumuman.', 'error');
   }
 };

 const impersonateSchool = (school: { id: string; name: string; plan?: string }) => { showToast(`Mode impersonasi langsung dinonaktifkan untuk keamanan RLS. Gunakan akun ADMIN sekolah untuk masuk sebagai tenant ${school.name}.`, 'info'); };
 const stopImpersonation = () => { if (currentUser?.impersonatedFrom) { setCurrentUser(currentUser.impersonatedFrom); setActiveView('superadmin'); } };
 const showToast=(message:string,type:Toast['type']='success')=>{const id=Math.random().toString(36).slice(2,9);setToasts(p=>[...p,{id,type,message}]);window.setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3500)};
 
 const logout=async()=>{
   try { 
    } catch (_) {}
   await supabase.auth.signOut();
   setCurrentUser(null);
   setUserWorkspaces([]);
   setActiveWorkspace(null);
   setIsOnboarding(false);
   setIsSelectingWorkspace(false);
   activeViewRef.current = 'login';
   setActiveViewState('login');
   setStudents([]);
   setClasses([]);
   setTeachers([]);
   setUsers([]);
   setAttendanceRecords([]);
 };
 const removeToast=(id:string)=>setToasts(p=>p.filter(t=>t.id!==id));

 const loadDataForSchool = async (schoolId: string, baseProfile: any, targetRole: UserRole) => {
   let tenantSchool: any = null;
   try {
     const res = await supabase.from('schools').select('name,npsn,code,plan,status,subscription_expires_at,max_teachers,max_students,max_classes,workspace_type,is_personal').eq('id',schoolId).maybeSingle();
     tenantSchool = res.data;
   } catch (_) {}
   let authoritativeSchoolCode = tenantSchool?.code ? String(tenantSchool.code).replace(/^SCH-?/i, '').trim().toUpperCase() : '';
   const hydratedBase={...baseProfile,school_id:schoolId,school_code:authoritativeSchoolCode || null,role:targetRole,subscription_plan:tenantSchool?.plan || 'teacher',subscription_status:tenantSchool?.status || 'active',subscription_expires_at:tenantSchool?.subscription_expires_at,max_teachers:tenantSchool?.max_teachers,max_students:tenantSchool?.max_students,max_classes:tenantSchool?.max_classes};
   
   const [,stu,school,config,events,effective,attendance,allProfiles,classRows,teacherAssignments,teacherRows]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',baseProfile.id).maybeSingle(), 
    supabase.from('students').select('*, classes:class_id(id,name,grade,academic_year)').eq('school_id',schoolId).order('nama'), 
    supabase.from('school_profile').select('*').eq('school_id',schoolId).maybeSingle(), 
    supabase.from('system_config').select('*').eq('school_id',schoolId).maybeSingle(), 
    supabase.from('academic_events').select('*').eq('school_id',schoolId).order('date'), 
    supabase.from('effective_days').select('*').eq('school_id',schoolId), 
    supabase.from('attendance_records').select('*').eq('school_id',schoolId).order('date'), 
    supabase.from('profiles').select('*').eq('school_id',schoolId).order('name'), 
    supabase.from('classes').select('*, wali:wali_kelas_id(id,name)').eq('school_id',schoolId).order('grade').order('name'), 
    supabase.from('teacher_class_assignments').select('teacher_id,class_id,classes(name)').eq('school_id',schoolId), 
    supabase.from('teachers').select('*').eq('school_id',schoolId).order('nama')
   ]);

   const baseTeachers = (teacherRows.data || []).map(dbTeacher);
   setTeachers(baseTeachers); 

   const classList = (classRows.data || []).map((c: any) => {
      let waliName = c.wali?.name || null;
      let waliId = c.wali_kelas_id || null;
      // Verify against teacher master records
      const matchedTeacher = baseTeachers.find((t) => t.id === waliId || (waliName && t.nama?.trim().toLowerCase() === waliName.trim().toLowerCase()));
      if (matchedTeacher) {
        waliName = matchedTeacher.nama;
        waliId = matchedTeacher.id;
      } else {
        waliName = null;
        waliId = null;
      }
      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        academicYear: c.academic_year,
        waliKelasId: waliId,
        waliKelasName: waliName,
      };
   });
   setClasses(classList); 
   const ss=(stu.data||[]).map((x:any)=>dbStudent({...x,class_name:x.classes?.name||''})); 
   setStudents(ss); 
   
   const assignmentMap:any={}; 
   (teacherAssignments.data||[]).forEach((a:any)=>{
     if(!assignmentMap[a.teacher_id]) assignmentMap[a.teacher_id]=[];
     assignmentMap[a.teacher_id].push({id:a.class_id,name:a.classes?.name||''});
   }); 
   classList.forEach((c: any) => {
     if (c.waliKelasId) {
       if (!assignmentMap[c.waliKelasId]) assignmentMap[c.waliKelasId] = [];
       if (!assignmentMap[c.waliKelasId].some((x: any) => x.id === c.id)) {
         assignmentMap[c.waliKelasId].push({ id: c.id, name: c.name });
       }
     }
   });
   const hydratedUsers=(allProfiles.data||[]).map((p:any)=>{
     const u=emptyUser(p); 
     const aa=assignmentMap[u.id]||[]; 
     return {...u,classIds:aa.map((x:any)=>x.id),classNames:aa.map((x:any)=>x.name).filter(Boolean)};
   }); 
   const matchedMe = hydratedUsers.find((u:any)=>u.id===baseProfile.id);
   const me={...emptyUser(hydratedBase),...(matchedMe||{}),schoolCode:authoritativeSchoolCode || (baseProfile as any)?.school_code || (baseProfile as any)?.schoolCode || null}; 
   if (baseProfile.role === 'WALI KELAS' && (!me.classIds || me.classIds.length === 0)) {
     const myWaliClasses = classList.filter((c: any) => c.waliKelasId === me.id || (c.waliKelasName && me.name && c.waliKelasName.trim().toLowerCase() === me.name.trim().toLowerCase()));
     if (myWaliClasses.length > 0) {
       me.classIds = myWaliClasses.map((c: any) => c.id);
       me.classNames = myWaliClasses.map((c: any) => c.name);
     }
   }
   setCurrentUser(me); 
   setUsers(hydratedUsers); 
   let rawSchoolData = school.data;
   if ((!rawSchoolData || !authoritativeSchoolCode) && schoolId) {
     try {
       const { data: sessionData } = await supabase.auth.getSession();
       const token = sessionData.session?.access_token || '';
       const res = await fetch('/api/onboarding', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           ...(token ? { Authorization: `Bearer ${token}` } : {})
         },
         body: JSON.stringify({ action: 'get_school_profile', school_id: schoolId })
       });
       const json = await res.json();
       if (json.ok) {
         if (json.profile && !rawSchoolData) {
           rawSchoolData = json.profile;
         }
         if (!authoritativeSchoolCode && json.school?.code) {
           authoritativeSchoolCode = String(json.school.code).replace(/^SCH-?/i, '').trim().toUpperCase();
         }
       }
     } catch (_) {}
   }
   let loadedSchool = rawSchoolData ? dbSchool(rawSchoolData, authoritativeSchoolCode) : dbSchool(null, authoritativeSchoolCode);

   if (schoolId) {
     try {
       const cachedStr = localStorage.getItem(`kawacanaan_school_profile_${schoolId}`);
       if (cachedStr) {
         const cached = JSON.parse(cachedStr);
         loadedSchool = {
           ...loadedSchool,
           namaSekolah: loadedSchool.namaSekolah || cached.namaSekolah || '',
           jenjang: loadedSchool.jenjang || cached.jenjang || 'SD/MI',
           npsn: loadedSchool.npsn || cached.npsn || '',
           kodeSekolah: authoritativeSchoolCode || loadedSchool.kodeSekolah || cached.kodeSekolah || '',
           jalan: loadedSchool.jalan || cached.jalan || '',
           desaKelurahan: loadedSchool.desaKelurahan || cached.desaKelurahan || '',
           kecamatan: loadedSchool.kecamatan || cached.kecamatan || '',
           kabupatenKota: loadedSchool.kabupatenKota || cached.kabupatenKota || '',
           provinsi: loadedSchool.provinsi || cached.provinsi || '',
           kodePos: loadedSchool.kodePos || cached.kodePos || '',
           teleponFax: loadedSchool.teleponFax || cached.teleponFax || '',
           email: loadedSchool.email || cached.email || '',
           website: loadedSchool.website || cached.website || '',
           namaKepalaSekolah: loadedSchool.namaKepalaSekolah || cached.namaKepalaSekolah || '',
           nipKepalaSekolah: loadedSchool.nipKepalaSekolah || cached.nipKepalaSekolah || '',
           tahunPelajaran: loadedSchool.tahunPelajaran || cached.tahunPelajaran || '2025/2026',
           semester: loadedSchool.semester || cached.semester || '1 (Ganjil)',
         };
         loadedSchool.alamat = formatFullAlamat(loadedSchool) || loadedSchool.alamat || '';
       }
     } catch (_) {}
   } 
   const myClass=((me.role==='GURU'||me.role==='WALI KELAS'||me.role==='GURU MAPEL')&&me.classIds?.length===1)?classList.find((c:any)=>c.id===me.classIds?.[0]):null; 
   setSchoolProfile(myClass?{...loadedSchool,kelas:myClass.name,namaWaliKelas:me.name}:loadedSchool); 
   const cfg=config.data?dbConfig(config.data):INITIAL_SYSTEM_CONFIG; 
   setSystemConfig(cfg); 
   setActiveStudyDays(cfg.activeStudyDays||[1,2,3,4,5]); 
   setAcademicEvents((events.data||[]).map(dbEvent)); 
   const ed:any={};
   (effective.data||[]).forEach((x:any)=>ed[x.month_key]=x.days);
   setEffectiveDaysConfig(ed);
   setAttendanceRecords((attendance.data||[]).map((r:any)=>dbAttendance(r,ss))); 
   const {data:subjectRows}=await supabase.from('subjects').select('*').eq('school_id',schoolId).order('name'); 
   setSubjects((subjectRows||[]).map(dbSubject));
 };

 const selectWorkspace = async (ws: WorkspaceMembership) => {
   setActiveWorkspace(ws);
   setIsSelectingWorkspace(false);
   setIsOnboarding(false);
   const { data: baseProfile } = await supabase.from('profiles').select('*').eq('id', ws.userId).maybeSingle();
   if (baseProfile) {
     await loadDataForSchool(ws.workspaceId, baseProfile, ws.role);
   }
   
   if (ws.role === 'SUPER_ADMIN') {
     setActiveView('superadmin');
   } else if (ws.role === 'SISWA') {
     setActiveView('portal-siswa');
   } else {
     setActiveView('dashboard');
   }
 };

 const openOnboarding = () => {
   setIsOnboarding(true);
   setIsSelectingWorkspace(false);
 };

 const returnToWorkspaceSelector = () => {
   setIsOnboarding(false);
   if (userWorkspaces.length > 0) {
     setIsSelectingWorkspace(true);
   } else {
     setActiveView('login');
   }
 };

 const loadUserDataAfterOnboarding = async (userId: string) => {
   setIsOnboarding(false);
   setIsSelectingWorkspace(false);
   await loadData(userId);
 };

 const loadData=async(userId:string)=>{
   if (!userId) {
     const { data: sessionData } = await supabase.auth.getSession();
     userId = sessionData.session?.user?.id || '';
   }
   if (!userId) {
     setIsOnboarding(false);
     setActiveView('login');
     return;
   }

   const requestId=++loadRequestRef.current;

   // Ambil daftar ruang kerja / membership user terlebih dahulu via backend API (bypass RLS)
   let memberships: WorkspaceMembership[] = [];
   try {
     const res = await fetch('/api/onboarding', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ action: 'get_user_workspaces', user_id: userId })
     });
     const json = await res.json();
     if (json.success && Array.isArray(json.workspaces)) {
       memberships = json.workspaces;
     }
   } catch (_) {}

   let {data:baseProfile,error:baseError}=await supabase.from('profiles').select('*').eq('id',userId).maybeSingle();
   
   // Jika profil belum ada di Supabase client tapi memberships ditemukan (mis. baru selesai onboarding), buat objek baseProfile
   if (!baseProfile && memberships.length > 0) {
     const chosen = memberships[0];
     baseProfile = {
       id: userId,
       school_id: chosen.workspaceId,
       role: chosen.role || 'WALI KELAS',
       name: 'Pengguna',
       username: 'user_' + userId.slice(0, 8),
       is_active: true,
     };
   }

   // Jika profil belum ada dan belum punya ruang kerja sama sekali -> Arahkan ke Onboarding
   if (!baseProfile && memberships.length === 0) {
     setIsOnboarding(true);
     setIsSelectingWorkspace(false);
     setRegistrationRequired(false);
     return;
   }

   if(baseProfile && baseProfile.is_active===false){ 
     await supabase.auth.signOut(); 
     setCurrentUser(null); 
     setActiveView('login'); 
     showToast('Akun Anda dinonaktifkan oleh administrator.','error'); 
     return; 
   }

   if(baseProfile && baseProfile.role==='SUPER_ADMIN'){
     const {data:platform}=await supabase.from('platform_settings').select('security').eq('id',1).maybeSingle();
     if(platform?.security?.mfaRequiredForSuperAdmin){
       const {data:factors}=await supabase.auth.mfa.listFactors();
       const verified=(factors?.totp||[]).some((f:any)=>f.status==='verified');
       if(!verified){ await supabase.auth.signOut(); setCurrentUser(null); setActiveView('login'); showToast('MFA wajib untuk akun Super Admin. Aktifkan authenticator terlebih dahulu.','error'); return; }
     }
     try { await supabase.rpc('touch_presence'); } catch (_) { /* presence is non-blocking */ }
     setRegistrationRequired(false);
     setIsOnboarding(false);
     setIsSelectingWorkspace(false);
     setCurrentUser(emptyUser(baseProfile));
     if (activeViewRef.current === 'login') {
       setActiveView('superadmin');
     }
     return;
   }

   // Fallback jika belum ada record multi-workspace di endpoint: bangun dari baseProfile
   if (memberships.length === 0 && baseProfile && baseProfile.school_id) {
     const { data: schoolRow } = await supabase.from('schools').select('name, npsn, code, plan, workspace_type, is_personal').eq('id', baseProfile.school_id).maybeSingle();
     const schoolRowCode = schoolRow?.code ? String(schoolRow.code).replace(/^SCH-?/i, '').trim().toUpperCase() : null;
     const isPersonal =
       (baseProfile as any).workspace_type === 'personal' ||
       (baseProfile as any).registration_mode === 'personal' ||
       schoolRow?.workspace_type === 'personal' ||
       (schoolRow as any)?.is_personal === true ||
       schoolRow?.plan === 'mulai';

     memberships.push({
       id: 'ws-mem-' + baseProfile.id,
       userId: baseProfile.id,
       workspaceId: baseProfile.school_id,
       workspaceCode: schoolRowCode,
       role: baseProfile.role as UserRole,
       workspaceName: schoolRow?.name || (isPersonal ? 'Ruang Kerja Individu' : 'Ruang Kerja Sekolah'),
       workspaceType: isPersonal ? 'personal' : 'school',
       npsn: schoolRow?.npsn || null,
       subscriptionPlan: (schoolRow?.plan || (isPersonal ? 'mulai' : 'sekolah')) as any,
       joinedAt: baseProfile.created_at || new Date().toISOString()
     });
   }

   setUserWorkspaces(memberships);

   if (memberships.length === 0) {
     setIsOnboarding(true);
     setIsSelectingWorkspace(false);
     return;
   }

   const targetWorkspace: WorkspaceMembership | null = null;

   if (memberships.length > 1 && !targetWorkspace) {
     // User memiliki beberapa workspace dan belum memilih yang aktif
     setIsSelectingWorkspace(true);
     setIsOnboarding(false);
     return;
   }

   // Default ke workspace pertama jika hanya 1 atau sudah ada yang dipilih
   const chosenWorkspace = targetWorkspace || memberships[0];
   setActiveWorkspace(chosenWorkspace);
   setIsSelectingWorkspace(false);
   setIsOnboarding(false);

   await loadDataForSchool(chosenWorkspace.workspaceId, baseProfile, chosenWorkspace.role);

   if (activeViewRef.current === 'login') {
     if (chosenWorkspace.role === 'SISWA') {
       setActiveView('portal-siswa');
     } else {
       setActiveView('dashboard');
     }
   }
 };
 useEffect(()=>{
   let mounted=true;

   // Password recovery harus diperlakukan berbeda dari login biasa.
   // Supabase akan membuat session recovery saat link dari email diklik.
   // Jangan loadData()/redirect ke dashboard pada event ini.
   const handleAuthEvent=(event:string, session:any)=>{
     if(!mounted) return;

     if(event==='PASSWORD_RECOVERY'){
       setPasswordRecovery(true);
       setCurrentUser(null);
       setRegistrationRequired(false);
       setActiveView('login');
       return;
     }

     if(session?.user){
       setPasswordRecovery(false);
       if (typeof window !== 'undefined' && window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('refresh_token='))) {
         window.history.replaceState(null, '', window.location.pathname + window.location.search);
       }
       setTimeout(()=>loadData(session.user.id),0);
       return;
     }

     setPasswordRecovery(false);
     setCurrentUser(null);
     setRegistrationRequired(false);
     setActiveView('login');
     setStudents([]);
     setClasses([]);
     setTeachers([]);
     setUsers([]);
     setAttendanceRecords([]);
   };

   supabase.auth.getSession().then(({data})=>{
     if(!mounted) return;
     // Jika user membuka /reset-password tanpa event recovery (misalnya
     // refresh setelah link diproses), tetap tampilkan form selama ada session.
     if(window.location.pathname==='/reset-password' && data.session){
       setPasswordRecovery(true);
       return;
     }
     if(data.session?.user) loadData(data.session.user.id);
   });

   const {data:sub}=supabase.auth.onAuthStateChange(handleAuthEvent);
   return()=>{mounted=false;sub.subscription.unsubscribe()};
 },[]);

 // Presensi sesi ringan: menandai akun ini "sedang aktif" agar terlihat di
 // Monitoring Real-Time Super Admin (lihat public.touch_presence() & tabel
 // active_sessions pada 02_superadmin_pro.sql). Tidak berpengaruh
 // apa pun pada akun yang bukan Super Admin selain baris last_seen_at sendiri.
 useEffect(()=>{
   if(!currentUser?.id) return;
   const ping=()=>{ supabase.rpc('touch_presence').then(undefined,()=>{}); };
   ping();
   const id=window.setInterval(ping,60000);
   return ()=>window.clearInterval(id);
 },[currentUser?.id]);

 const apiUser=async(action:string,payload:any={})=>{const {data}=await supabase.auth.getSession();const r=await fetch('/api/admin-users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${data.session?.access_token||''}`},body:JSON.stringify({action,...payload})});const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'Operasi akun gagal');return body};
  const updateSchoolProfile = async (p: SchoolProfile) => {
    const fullAlamat = formatFullAlamat(p) || p.alamat || '';
    const extPayload = {
      full: fullAlamat,
      jenjang: p.jenjang || 'SD/MI',
      jalan: p.jalan || '',
      desaKelurahan: p.desaKelurahan || '',
      kecamatan: p.kecamatan || '',
      kabupatenKota: p.kabupatenKota || '',
      provinsi: p.provinsi || '',
      kodePos: p.kodePos || '',
      teleponFax: p.teleponFax || '',
      email: p.email || '',
      website: p.website || '',
      namaKepalaSekolah: p.namaKepalaSekolah || '',
      nipKepalaSekolah: p.nipKepalaSekolah || '',
      tahunPelajaran: p.tahunPelajaran || '2025/2026',
      semester: p.semester || '1 (Ganjil)',
    };
    const serializedAlamat = `__EXTJSON__:${JSON.stringify(extPayload)}`;
    const schoolId = currentUser?.schoolId || activeWorkspace?.workspaceId || null;

    const normalizedProfile: SchoolProfile = {
      ...p,
      kodeSekolah: p.kodeSekolah || schoolProfile.kodeSekolah || '',
      alamat: fullAlamat,
      jenjang: p.jenjang || 'SD/MI',
      jalan: p.jalan || '',
      desaKelurahan: p.desaKelurahan || '',
      kecamatan: p.kecamatan || '',
      kabupatenKota: p.kabupatenKota || '',
      provinsi: p.provinsi || '',
      kodePos: p.kodePos || '',
      teleponFax: p.teleponFax || '',
      email: p.email || '',
      website: p.website || '',
      namaKepalaSekolah: p.namaKepalaSekolah || '',
      nipKepalaSekolah: p.nipKepalaSekolah || '',
      tahunPelajaran: p.tahunPelajaran || '2025/2026',
      semester: p.semester || '1 (Ganjil)',
      kelas: p.kelas || '',
      namaWaliKelas: p.namaWaliKelas || '',
      nipWaliKelas: p.nipWaliKelas || '',
    };

    // 1. Langsung update state global agar UI stabil & instan tanpa flicker
    setSchoolProfile(normalizedProfile);
    if (p.namaSekolah && activeWorkspace) {
      setActiveWorkspace(prev => prev ? { ...prev, workspaceName: p.namaSekolah } : null);
    }
    if (p.namaSekolah && currentUser) {
      setCurrentUser(prev => prev ? { ...prev, schoolName: p.namaSekolah } : null);
    }

    // 2. Simpan cache per school ID ke localStorage agar tahan refresh & switch tab
    if (schoolId) {
      try {
        localStorage.setItem(`kawacanaan_school_profile_${schoolId}`, JSON.stringify(normalizedProfile));
      } catch (_) {}
    }

    // 3. Simpan dan sinkronisasi ke tabel school_profile dan schools (Superadmin) via API service-role
    let apiSuccess = false;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'save_school_profile',
          schoolId,
          namaSekolah: p.namaSekolah,
          npsn: p.npsn,
          jenjang: p.jenjang || 'SD/MI',
          alamat: serializedAlamat,
          tahunPelajaran: p.tahunPelajaran || '2025/2026',
          semester: p.semester || '1 (Ganjil)',
          kelas: p.kelas || '',
          namaKepalaSekolah: p.namaKepalaSekolah || '',
          nipKepalaSekolah: p.nipKepalaSekolah || '',
          namaWaliKelas: p.namaWaliKelas || '',
          nipWaliKelas: p.nipWaliKelas || '',
        })
      });
      const jsonRes = await res.json().catch(() => ({}));
      if (res.ok && (jsonRes.ok || jsonRes.success)) {
        apiSuccess = true;
      }
    } catch (err: any) {
      console.warn('API save_school_profile warning:', err?.message);
    }

    // 4. Fallback upsert langsung jika API gagal atau untuk multi-redundansi
    if (schoolId) {
      try {
        await supabase.from('school_profile').upsert({
          school_id: schoolId,
          nama_sekolah: p.namaSekolah,
          npsn: p.npsn || null,
          alamat: serializedAlamat,
          tahun_pelajaran: p.tahunPelajaran || '2025/2026',
          semester: p.semester || '1 (Ganjil)',
          kelas: p.kelas || '',
          nama_kepala_sekolah: p.namaKepalaSekolah || '',
          nip_kepala_sekolah: p.nipKepalaSekolah || '',
          nama_wali_kelas: p.namaWaliKelas || '',
          nip_wali_kelas: p.nipWaliKelas || ''
        }, { onConflict: 'school_id' });

        if (p.namaSekolah || p.npsn) {
          const schUp: any = {};
          if (p.namaSekolah) schUp.name = p.namaSekolah;
          if (p.npsn) schUp.npsn = p.npsn;
          await supabase.from('schools').update(schUp).eq('id', schoolId);
        }
      } catch (upsertErr: any) {
        console.warn('Direct upsert school_profile warning:', upsertErr?.message);
      }
    }

    showToast('Identitas Sekolah berhasil disimpan');
  };
 const updateSystemConfig=async(c:SystemConfig)=>{const {error}=await supabase.from('system_config').upsert({school_id:currentUser?.schoolId||null,app_title:c.appTitle,app_subtitle:c.appSubtitle,footer_copyright:c.footerCopyright,school_logo_url:c.schoolLogoUrl||'',letterhead_type:c.letterheadType||'standard_text',letterhead_image_url:c.letterheadImageUrl||'',show_letterhead:c.showLetterhead??true,default_check_in_time:c.defaultCheckInTime,default_check_out_time:c.defaultCheckOutTime,report_place:c.reportPlace,report_date:c.reportDate,active_study_days:c.activeStudyDays||activeStudyDays,student_self_attendance_enabled:c.studentSelfAttendanceEnabled,check_in_start_time:c.checkInStartTime,check_in_deadline_time:c.checkInDeadlineTime,check_out_start_time:c.checkOutStartTime,auto_mark_late:c.autoMarkLate},{onConflict:'school_id'});if(error)return showToast(error.message,'error');setSystemConfig(c);setActiveStudyDays(c.activeStudyDays||activeStudyDays);showToast('Pengaturan Sistem berhasil diperbarui')};
 const resolveWaliKelas = async (inputWaliId: string | null) => {
    if (!inputWaliId) return { dbWaliId: null, waliName: null, internalId: null };
    const userMatch = users.find((u) => u.id === inputWaliId);
    if (userMatch) return { dbWaliId: userMatch.id, waliName: userMatch.name, internalId: userMatch.id };

    const teacherMatch = teachers.find((t) => t.id === inputWaliId);
    if (teacherMatch) {
      const teacherNip = (teacherMatch.nip || '').trim().toLowerCase();
      const teacherName = (teacherMatch.nama || '').trim().toLowerCase();
      const matchedAccount = users.find(
        (u) =>
          (teacherNip && teacherNip !== '-' && u.username.toLowerCase() === teacherNip) ||
          u.name.trim().toLowerCase() === teacherName
      );
      if (matchedAccount) {
        return { dbWaliId: matchedAccount.id, waliName: teacherMatch.nama, internalId: matchedAccount.id };
      }
      return { dbWaliId: null, waliName: teacherMatch.nama, internalId: teacherMatch.id };
    }

    try {
      const { data: profData } = await supabase.from('profiles').select('id,name').eq('id', inputWaliId).maybeSingle();
      if (profData) return { dbWaliId: profData.id, waliName: profData.name, internalId: profData.id };
    } catch (_) {}

    return { dbWaliId: null, waliName: null, internalId: null };
  };
 const addClass = async (c: Omit<SchoolClass, 'id'>) => {
    try {
      const { dbWaliId, waliName, internalId } = await resolveWaliKelas(c.waliKelasId || null);
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: c.name.trim(),
          grade: c.grade,
          academic_year: c.academicYear || schoolProfile.tahunPelajaran || '2026/2027',
          wali_kelas_id: dbWaliId,
          school_id: currentUser?.schoolId || null,
        })
        .select('*, wali:wali_kelas_id(id,name)')
        .single();
      if (error) throw error;
      setClasses((p) => [
        ...p,
        {
          id: data.id,
          name: data.name,
          grade: data.grade,
          academicYear: data.academic_year,
          waliKelasId: dbWaliId || internalId || null,
          waliKelasName: waliName || data.wali?.name || null,
        },
      ]);
      showToast(`Kelas ${data.name} berhasil ditambahkan`);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };
 const updateClass = async (id: string, c: Omit<SchoolClass, 'id'>) => {
    try {
      const { dbWaliId, waliName, internalId } = await resolveWaliKelas(c.waliKelasId || null);
      const { data, error } = await supabase
        .from('classes')
        .update({
          name: c.name.trim(),
          grade: c.grade,
          academic_year: c.academicYear || schoolProfile.tahunPelajaran || '2026/2027',
          wali_kelas_id: dbWaliId,
        })
        .eq('id', id)
        .select('*, wali:wali_kelas_id(id,name)')
        .single();
      if (error) throw error;
      setClasses((p) =>
        p.map((x) =>
          x.id === id
            ? {
                id: data.id,
                name: data.name,
                grade: data.grade,
                academicYear: data.academic_year,
                waliKelasId: dbWaliId || internalId || null,
                waliKelasName: waliName || data.wali?.name || null,
              }
            : x
        )
      );
      showToast(`Kelas ${data.name} berhasil diperbarui`);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };
 const deleteClass=async(id:string)=>{try{const {error}=await supabase.from('classes').delete().eq('id',id);if(error)throw error;setClasses(p=>p.filter(x=>x.id!==id));setStudents(p=>p.map(s=>s.classId===id?{...s,classId:null,className:''}:s));showToast('Kelas berhasil dihapus','info')}catch(e:any){showToast(e.message,'error')}};
  const addTeacher=async(t:Omit<Teacher,'id'>)=>{try{const jab=(t.jabatan||t.jenisPTK||'Wali Kelas').trim();const schoolId=currentUser?.schoolId||null;let savedTeacher:any=null;try{const {data:sessionData}=await supabase.auth.getSession();const token=sessionData.session?.access_token||'';const res=await fetch('/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action:'save_teacher',schoolId,nama:t.nama.trim(),nip:t.nip.trim(),jenisKelamin:t.jenisKelamin,jabatan:jab,statusKepegawaian:(t.statusKepegawaian||'').trim(),noHp:(t.noHp||'').trim()})});const json=await res.json();if(json.teacher)savedTeacher=json.teacher}catch(_){};if(!savedTeacher){const {data,error}=await supabase.from('teachers').insert({nama:t.nama.trim(),nip:t.nip.trim(),jenis_kelamin:t.jenisKelamin,mata_pelajaran:jab,status_kepegawaian:(t.statusKepegawaian||'').trim(),no_hp:(t.noHp||'').trim(),school_id:schoolId}).select().single();if(error)throw error;savedTeacher=data}const finalTeacher=dbTeacher({...savedTeacher,jabatan:jab,jenis_ptk:jab,mata_pelajaran:jab});setTeachers(p=>[...p.filter(x=>x.id!==finalTeacher.id),finalTeacher]);showToast(`Data guru ${finalTeacher.nama} berhasil ditambahkan`)}catch(e:any){showToast(e.message,'error')}};
  const updateTeacher=async(id:string,t:Omit<Teacher,'id'>)=>{try{const jab=(t.jabatan||t.jenisPTK||'Wali Kelas').trim();const schoolId=currentUser?.schoolId||null;let updatedTeacher:any=null;try{const {data:sessionData}=await supabase.auth.getSession();const token=sessionData.session?.access_token||'';const res=await fetch('/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action:'save_teacher',teacherId:id,schoolId,nama:t.nama.trim(),nip:t.nip.trim(),jenisKelamin:t.jenisKelamin,jabatan:jab,statusKepegawaian:(t.statusKepegawaian||'').trim(),noHp:(t.noHp||'').trim()})});const json=await res.json();if(json.teacher)updatedTeacher=json.teacher}catch(_){};if(!updatedTeacher){const {data,error}=await supabase.from('teachers').update({nama:t.nama.trim(),nip:t.nip.trim(),jenis_kelamin:t.jenisKelamin,mata_pelajaran:jab,status_kepegawaian:(t.statusKepegawaian||'').trim(),no_hp:(t.noHp||'').trim()}).eq('id',id).select().single();if(error)throw error;updatedTeacher=data}const finalTeacher=dbTeacher({...updatedTeacher,jabatan:jab,jenis_ptk:jab,mata_pelajaran:jab});setTeachers(p=>p.map(x=>x.id===id?finalTeacher:x));showToast('Data guru berhasil diperbarui')}catch(e:any){showToast(e.message,'error')}};
  const importTeachers = async (items: Omit<Teacher, 'id'>[], replaceExisting = false) => {
    try {
      if (!items.length) throw new Error('Tidak ada data guru yang valid untuk diimpor');
      const schoolId = currentUser?.schoolId || null;
      if (replaceExisting) {
        if (schoolId) {
          await supabase.from('teachers').delete().eq('school_id', schoolId);
        } else {
          await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
        setTeachers([]);
      }
      for (const t of items) {
        await addTeacher(t);
      }
      showToast(`Berhasil mengimpor ${items.length} data guru.`);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };
  const importClasses = async (items: Array<Omit<SchoolClass, 'id'> & { waliKelasNameInput?: string }>, replaceExisting = false) => {
    try {
      if (!items.length) throw new Error('Tidak ada data kelas yang valid untuk diimpor');
      const schoolId = currentUser?.schoolId || null;
      if (replaceExisting) {
        if (schoolId) {
          await supabase.from('classes').delete().eq('school_id', schoolId);
        } else {
          await supabase.from('classes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
        setClasses([]);
      }
      for (const c of items) {
        let targetWaliId = c.waliKelasId || null;
        if (!targetWaliId && c.waliKelasNameInput) {
          const matchedT = teachers.find((t) => t.nama.trim().toLowerCase() === c.waliKelasNameInput?.trim().toLowerCase());
          if (matchedT) {
            targetWaliId = matchedT.id;
          }
        }
        await addClass({
          name: c.name,
          grade: c.grade,
          academicYear: c.academicYear || schoolProfile.tahunPelajaran || '2026/2027',
          waliKelasId: targetWaliId,
          waliKelasName: c.waliKelasName || null,
        });
      }
      showToast(`Berhasil mengimpor ${items.length} data kelas.`);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };
  const deleteTeacher=async(id:string)=>{try{const teacherToDelete=teachers.find(t=>t.id===id);const teacherName=teacherToDelete?.nama;const schoolId=currentUser?.schoolId;try{const {data:sessionData}=await supabase.auth.getSession();const token=sessionData.session?.access_token||'';await fetch('/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({action:'delete_teacher',teacherId:id,teacherName,schoolId})})}catch(_){};await supabase.from('teachers').delete().eq('id',id);if(schoolId&&teacherName){await supabase.from('teachers').delete().eq('school_id',schoolId).eq('nama',teacherName)}await supabase.from('teacher_class_assignments').delete().eq('teacher_id',id);await supabase.from('classes').update({wali_kelas_id:null}).eq('wali_kelas_id',id);if(schoolId){await supabase.from('classes').update({wali_kelas_id:null}).eq('school_id',schoolId).eq('wali_kelas_id',id)}setTeachers(p=>p.filter(x=>x.id!==id && (teacherName ? x.nama.trim().toLowerCase() !== teacherName.trim().toLowerCase() : true)));setClasses(p=>p.map(c=>(c.waliKelasId===id||(teacherName&&c.waliKelasName?.trim().toLowerCase()===teacherName.trim().toLowerCase()))?{...c,waliKelasId:null,waliKelasName:null}:c));showToast('Data guru berhasil dihapus','info')}catch(e:any){showToast(e.message,'error')}};
 const assignTeacherClasses=async(teacherId:string,classIds:string[])=>{try{await supabase.from('teacher_class_assignments').delete().eq('teacher_id',teacherId);if(classIds.length){const {error}=await supabase.from('teacher_class_assignments').insert(classIds.map(classId=>({school_id:currentUser?.schoolId,teacher_id:teacherId,class_id:classId})));if(error)throw error}setUsers(p=>p.map(u=>u.id===teacherId?{...u,classIds,classNames:classIds.map(id=>classes.find(c=>c.id===id)?.name||'').filter(Boolean)}:u));showToast('Penugasan kelas guru berhasil diperbarui')}catch(e:any){showToast(e.message,'error')}};
 const addStudent=async(s:Omit<Student,'id'>)=>{try{const {data,error}=await supabase.from('students').insert({nisn:s.nisn.trim(),nama:s.nama.trim().toUpperCase(),gender:s.gender,class_id:s.classId||null,school_id:currentUser?.schoolId||null}).select('*, classes:class_id(name)').single();if(error)throw error;const ns=dbStudent({...data,class_name:data.classes?.name||''});setStudents(p=>[...p,ns]);if(currentUser?.role==='ADMIN'){try{await apiUser('create',{name:ns.nama,username:ns.nisn,password:ns.nisn,role:'SISWA',studentId:ns.id});showToast(`Data siswa ${ns.nama} dan akun siswa berhasil ditambahkan`)}catch(accountError:any){showToast(`Data siswa ${ns.nama} berhasil ditambahkan. Akun belum dibuat. (${accountError?.message||'Menunggu Admin'})`,'info')}}else showToast(`Data siswa ${ns.nama} berhasil ditambahkan.`)}catch(e:any){showToast(e.message,'error')}};
 const updateStudent=async(id:string,s:Omit<Student,'id'>)=>{try{const {error}=await supabase.from('students').update({nisn:s.nisn,nama:s.nama.toUpperCase(),gender:s.gender,class_id:s.classId||null}).eq('id',id);if(error)throw error;const old=students.find(y=>y.id===id);const u=users.find(x=>x.username===old?.nisn);if(u&&currentUser?.role==='ADMIN')await apiUser('update',{userId:u.id,name:s.nama.toUpperCase(),username:s.nisn,role:'SISWA',studentId:id});setStudents(p=>p.map(x=>x.id===id?{...s,id,className:classes.find(c=>c.id===s.classId)?.name||''}:x));setUsers(p=>p.map(x=>x.id===u?.id?{...x,name:s.nama.toUpperCase(),username:s.nisn}:x));showToast('Data siswa berhasil diperbarui')}catch(e:any){showToast(e.message,'error')}};
 const deleteStudent=async(id:string)=>{try{const old=students.find(y=>y.id===id);const {error}=await supabase.from('students').delete().eq('id',id);if(error)throw error;const u=users.find(x=>x.username===old?.nisn);if(u)await apiUser('delete',{userId:u.id}).catch(()=>{});setStudents(p=>p.filter(x=>x.id!==id));setUsers(p=>p.filter(x=>x.id!==u?.id));setAttendanceRecords(p=>p.filter(x=>x.studentId!==id));showToast('Data siswa berhasil dihapus','info')}catch(e:any){showToast(e.message,'error')}};
 const deleteStudentsByClass=async(classId:string)=>{try{const classStudents=students.filter(s=>s.classId===classId);if(!classStudents.length)return;for(const s of classStudents){const u=users.find(x=>x.username===s.nisn);if(u)await apiUser('delete',{userId:u.id}).catch(()=>{})}const {error}=await supabase.from('students').delete().eq('class_id',classId);if(error)throw error;const sIds=new Set(classStudents.map(s=>s.id));setStudents(p=>p.filter(s=>!sIds.has(s.id)));setUsers(p=>p.filter(u=>!classStudents.some(cs=>cs.nisn===u.username)));setAttendanceRecords(p=>p.filter(r=>!sIds.has(r.studentId)));showToast(`Semua siswa di kelas (${classStudents.length} siswa) berhasil dihapus`,'info')}catch(e:any){showToast(e.message,'error')}};
 const importStudents=async(items:Omit<Student,'id'>[],replaceExisting=false,targetClassId?:string)=>{try{if(!items.length)throw new Error('Tidak ada data siswa yang valid untuk diimpor');const classIdToReplace = targetClassId || (items.every(it => it.classId && it.classId === items[0].classId) ? items[0].classId : null);if(replaceExisting){if(classIdToReplace){const classStudents = students.filter(s => s.classId === classIdToReplace);for(const s of classStudents){const u=users.find(x=>x.username===s.nisn);if(u)await apiUser('delete',{userId:u.id}).catch(()=>{})}await supabase.from('students').delete().eq('class_id',classIdToReplace);setStudents(p=>p.filter(s=>s.classId!==classIdToReplace))}else{for(const s of students){const u=users.find(x=>x.username===s.nisn);if(u)await apiUser('delete',{userId:u.id}).catch(()=>{})}await supabase.from('students').delete().neq('id','00000000-0000-0000-0000-000000000000');setStudents([])}}for(const s of items)await addStudent(s);showToast(`Berhasil mengimpor ${items.length} data siswa.`)}catch(e:any){showToast(e.message,'error')}};
 const hydrateUser=async(p:any):Promise<UserAccount>=>{const base=emptyUser(p);if(base.role==='GURU'||base.role==='WALI KELAS'||base.role==='GURU MAPEL'){const {data}=await supabase.from('teacher_class_assignments').select('class_id, classes(name)').eq('teacher_id',base.id);base.classIds=(data||[]).map((x:any)=>x.class_id);base.classNames=(data||[]).map((x:any)=>x.classes?.name).filter(Boolean)}return base};
 const addUser=async(u:UserAccountInput)=>{try{const res=await apiUser('create',{name:u.name,email:u.email||null,username:u.username,password:u.password,role:u.role,studentId:u.studentId||null,classIds:u.classIds||[]});const {data}=await supabase.from('profiles').select('*').eq('username',u.username.toLowerCase()).single();if(data){if((u.role==='GURU'||u.role==='WALI KELAS'||u.role==='GURU MAPEL')&&u.classIds?.length){await assignTeacherClasses(data.id,u.classIds);for(const cid of u.classIds){await supabase.from('classes').update({wali_kelas_id:data.id}).eq('id',cid);}setClasses(prev=>prev.map(c=>(u.classIds?.includes(c.id)?{...c,waliKelasId:data.id,waliKelasName:data.name}:c)));}const nu=await hydrateUser(data);setUsers(p=>[...p,nu])}showToast(`Akun pengguna ${u.name} berhasil ditambahkan`)}catch(e:any){showToast(e.message,'error')}};
 const deleteUser=async(id:string)=>{try{await apiUser('delete',{userId:id});setUsers(p=>p.filter(x=>x.id!==id));if(currentUser?.id===id)await supabase.auth.signOut();showToast('Akun pengguna berhasil dihapus','info')}catch(e:any){showToast(e.message,'error')}};
 const updateUser=async(id:string,data:Partial<UserAccount>)=>{try{await apiUser('update',{userId:id,name:data.name,email:data.email||null,username:data.username,role:data.role,studentId:data.studentId||null,classIds:data.classIds||[]});if(data.role==='GURU'||data.role==='WALI KELAS'||data.role==='GURU MAPEL')await assignTeacherClasses(id,(data.classIds||[]));else await assignTeacherClasses(id,[]);setUsers(p=>p.map(x=>x.id===id?{...x,...data,classNames:(data.classIds||x.classIds||[]).map(cid=>classes.find(c=>c.id===cid)?.name||'').filter(Boolean)}:x));if(currentUser?.id===id)setCurrentUser(p=>p?{...p,...data}:p);showToast('Data akun pengguna berhasil diperbarui')}catch(e:any){showToast(e.message,'error')}};
  const generateRandomPassword = (length = 8): string => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    let pwd = '';
    pwd += uppers[Math.floor(Math.random() * uppers.length)];
    pwd += lowers[Math.floor(Math.random() * lowers.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    for (let i = 3; i < length; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
  };

  const sanitizeUsername = (raw: string, fallbackPrefix: string): string => {
    let cleaned = (raw || '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (cleaned.length < 3) {
      cleaned = `${fallbackPrefix}_${cleaned || Math.floor(1000 + Math.random() * 9000)}`;
    }
    return cleaned.slice(0, 60);
  };

  const generateAccountsFromReferences = async (options?: { resetExistingPasswords?: boolean }): Promise<GeneratedAccountResult[]> => {
    const resetExisting = !!options?.resetExistingPasswords;
    const results: GeneratedAccountResult[] = [];
    const schoolId = currentUser?.schoolId;
    if (!schoolId) {
      showToast('ID Sekolah tidak valid.', 'error');
      return results;
    }

    try {
      // 1. Data Kepala Sekolah
      if (schoolProfile.namaKepalaSekolah && schoolProfile.nipKepalaSekolah) {
        const ksName = schoolProfile.namaKepalaSekolah.trim();
        const ksUsername = sanitizeUsername(schoolProfile.nipKepalaSekolah, 'ks');
        const existing = users.find((u) => u.role === 'KEPALA SEKOLAH' || u.username.toLowerCase() === ksUsername.toLowerCase());

        if (!existing) {
          const password = generateRandomPassword(8);
          try {
            await apiUser('create', { name: ksName, username: ksUsername, password, role: 'KEPALA SEKOLAH' });
            results.push({ name: ksName, username: ksUsername, password, role: 'KEPALA SEKOLAH', category: 'KEPALA SEKOLAH', status: 'CREATED' });
          } catch (err: any) {
            results.push({ name: ksName, username: ksUsername, role: 'KEPALA SEKOLAH', category: 'KEPALA SEKOLAH', status: 'SKIPPED', error: err?.message });
          }
        } else if (resetExisting) {
          const newPassword = generateRandomPassword(8);
          try {
            await apiUser('password', { userId: existing.id, password: newPassword });
            results.push({ id: existing.id, name: existing.name, username: existing.username, password: newPassword, role: existing.role, category: 'KEPALA SEKOLAH', status: 'UPDATED' });
          } catch (err: any) {
            results.push({ id: existing.id, name: existing.name, username: existing.username, role: existing.role, category: 'KEPALA SEKOLAH', status: 'SKIPPED', error: err?.message });
          }
        }
      }

      // 2. Data Guru
      for (const teacher of teachers) {
        const teacherName = teacher.nama.trim();
        const teacherUsername = sanitizeUsername(teacher.nip && teacher.nip !== '-' ? teacher.nip : teacher.nama, 'guru');
        const existing = users.find(
          (u) =>
            u.username.toLowerCase() === teacherUsername.toLowerCase() ||
            (u.name.trim().toLowerCase() === teacherName.toLowerCase() && (u.role === 'GURU' || u.role === 'WALI KELAS' || u.role === 'GURU MAPEL'))
        );

        const linkedClass = classes.find(
          (c) =>
            c.waliKelasId === teacher.id ||
            (c.waliKelasName && c.waliKelasName.trim().toLowerCase() === teacherName.toLowerCase())
        );
        const classIds = linkedClass ? [linkedClass.id] : [];
        const role: UserRole = teacher.jabatan === 'Wali Kelas' || linkedClass ? 'WALI KELAS' : 'GURU MAPEL';

        if (!existing) {
          const password = generateRandomPassword(8);
          try {
            const res = await apiUser('create', { name: teacherName, username: teacherUsername, password, role, classIds });
            const createdUserId = res?.userId;
            if (createdUserId && linkedClass) {
              await supabase.from('classes').update({ wali_kelas_id: createdUserId }).eq('id', linkedClass.id);
              setClasses((prev) =>
                prev.map((c) => (c.id === linkedClass.id ? { ...c, waliKelasId: createdUserId, waliKelasName: teacherName } : c))
              );
            }
            results.push({
              name: teacherName,
              username: teacherUsername,
              password,
              role,
              category: 'GURU',
              className: linkedClass?.name,
              status: 'CREATED',
            });
          } catch (err: any) {
            results.push({
              name: teacherName,
              username: teacherUsername,
              role,
              category: 'GURU',
              className: linkedClass?.name,
              status: 'SKIPPED',
              error: err?.message,
            });
          }
        } else if (resetExisting) {
          const newPassword = generateRandomPassword(8);
          try {
            await apiUser('password', { userId: existing.id, password: newPassword });
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              password: newPassword,
              role: existing.role,
              category: 'GURU',
              className: existing.classNames?.join(', ') || linkedClass?.name,
              status: 'UPDATED',
            });
          } catch (err: any) {
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              role: existing.role,
              category: 'GURU',
              status: 'SKIPPED',
              error: err?.message,
            });
          }
        }
      }

      // 3. Data Siswa
      for (const student of students) {
        const studentName = student.nama.trim();
        const studentUsername = sanitizeUsername(student.nisn, 'sis');
        const existing = users.find(
          (u) => u.role === 'SISWA' && (u.studentId === student.id || u.username.toLowerCase() === studentUsername.toLowerCase())
        );

        if (!existing) {
          const password = generateRandomPassword(8);
          try {
            await apiUser('create', {
              name: studentName,
              username: studentUsername,
              password,
              role: 'SISWA',
              studentId: student.id,
            });
            results.push({
              name: studentName,
              username: studentUsername,
              password,
              role: 'SISWA',
              category: 'SISWA',
              className: student.className,
              status: 'CREATED',
            });
          } catch (err: any) {
            results.push({
              name: studentName,
              username: studentUsername,
              role: 'SISWA',
              category: 'SISWA',
              className: student.className,
              status: 'SKIPPED',
              error: err?.message,
            });
          }
        } else if (resetExisting) {
          const newPassword = generateRandomPassword(8);
          try {
            await apiUser('password', { userId: existing.id, password: newPassword });
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              password: newPassword,
              role: 'SISWA',
              category: 'SISWA',
              className: student.className,
              status: 'UPDATED',
            });
          } catch (err: any) {
            results.push({
              id: existing.id,
              name: existing.name,
              username: existing.username,
              role: 'SISWA',
              category: 'SISWA',
              status: 'SKIPPED',
              error: err?.message,
            });
          }
        }
      }

      // Refresh users state
      const [teacherAssignments, allProfiles] = await Promise.all([
        supabase.from('teacher_class_assignments').select('teacher_id, class_id, classes(name)').eq('school_id', schoolId),
        supabase.from('profiles').select('*').eq('school_id', schoolId).order('name'),
      ]);

      const assignmentMap: any = {};
      (teacherAssignments.data || []).forEach((a: any) => {
        if (!assignmentMap[a.teacher_id]) assignmentMap[a.teacher_id] = [];
        assignmentMap[a.teacher_id].push({ id: a.class_id, name: a.classes?.name || '' });
      });

      const hydratedUsers = (allProfiles.data || []).map((p: any) => {
        const u = emptyUser(p);
        const aa = assignmentMap[u.id] || [];
        return { ...u, classIds: aa.map((x: any) => x.id), classNames: aa.map((x: any) => x.name).filter(Boolean) };
      });
      setUsers(hydratedUsers);

      const createdCount = results.filter((r) => r.status === 'CREATED').length;
      const updatedCount = results.filter((r) => r.status === 'UPDATED').length;
      if (createdCount > 0 || updatedCount > 0) {
        showToast(`Berhasil men-generate ${createdCount} akun baru dan mengacak ${updatedCount} password akun.`);
      } else {
        showToast('Semua data referensi (Guru & Siswa) sudah memiliki akun pengguna.', 'info');
      }
      return results;
    } catch (e: any) {
      showToast(e.message || 'Gagal men-generate akun pengguna', 'error');
      return results;
    }
  };

  const syncUsersWithStudents = async () => {
    await generateAccountsFromReferences({ resetExistingPasswords: false });
  };
 const updateUserPassword=async(id:string,p:string)=>{try{await apiUser('password',{userId:id,password:p});showToast('Password akun berhasil diperbarui')}catch(e:any){showToast(e.message,'error')}};
 const checkCalendarAdminAuth=():boolean=>{
   const isPersonal=activeWorkspace?.workspaceType==='personal'||(currentUser?.subscriptionPlan==='mulai'&&!currentUser?.schoolId);
   if(isPersonal)return true;
   if(currentUser?.role==='ADMIN'||currentUser?.role==='SUPER_ADMIN')return true;
   showToast('Hanya Admin Sekolah yang dapat mengisi dan mengubah kalender akademik.','error');
   return false;
 };
 const addAcademicEvent=async(e:Omit<AcademicEvent,'id'>)=>{if(!checkCalendarAdminAuth())return;try{const {data,error}=await supabase.from('academic_events').insert({date:e.date,date_display:e.dateDisplay,title:e.title,is_effective:e.isEffective,notes:e.notes||'',school_id:currentUser?.schoolId||null}).select().single();if(error)throw error;setAcademicEvents(p=>[...p,dbEvent(data)]);showToast('Agenda akademik berhasil ditambahkan')}catch(x:any){showToast(x.message,'error')}};
 const deleteAcademicEvent=async(id:string)=>{if(!checkCalendarAdminAuth())return;const {error}=await supabase.from('academic_events').delete().eq('id',id);if(error)return showToast(error.message,'error');setAcademicEvents(p=>p.filter(e=>e.id!==id));showToast('Agenda akademik telah dihapus','info')};
 const updateActiveStudyDays=async(days:number[])=>{if(!checkCalendarAdminAuth())return;const c={...systemConfig,activeStudyDays:days};await updateSystemConfig(c)};
 const updateEffectiveDays=async(monthKey:string,days:number)=>{if(!checkCalendarAdminAuth())return;const {error}=await supabase.from('effective_days').upsert({school_id:currentUser?.schoolId||null,month_key:monthKey,days},{onConflict:'school_id,month_key'});if(error)return showToast(error.message,'error');setEffectiveDaysConfig(p=>({...p,[monthKey]:days}));showToast('Hari belajar efektif diperbarui')};
 const getBaseStudyDaysForMonth=(year:number,month:number)=>{let c=0,total=new Date(year,month,0).getDate();for(let d=1;d<=total;d++){if(activeStudyDays.includes(new Date(year,month-1,d).getDay()))c++}return c};
 const getEffectiveDaysForMonth=(year:number|string,month?:number)=>{const key=typeof year==='string'?year:`${year}-${String(month).padStart(2,'0')}`;const [y,m]=key.split('-').map(Number);const base=effectiveDaysConfig[key]??getBaseStudyDaysForMonth(y,m);const holidays=academicEvents.filter(e=>e.date.startsWith(key)&&!e.isEffective).filter(e=>activeStudyDays.includes(new Date(e.date).getDay())).length;return Math.max(0,base-holidays)};
 const getDateStatus=(date:string)=>{const [y,m,d]=date.split('-').map(Number);const day=new Date(y,m-1,d).getDay();const isStudyDay=activeStudyDays.includes(day);const ev=academicEvents.find(e=>e.date===date);if(ev&&!ev.isEffective)return{isStudyDay,isHoliday:true,isEffective:false,label:`Libur: ${ev.title}`,badgeColor:'bg-rose-50 text-rose-700 border-rose-200',eventTitle:ev.title};if(ev&&ev.isEffective)return{isStudyDay:true,isHoliday:false,isEffective:true,label:`Agenda Efektif: ${ev.title}`,badgeColor:'bg-blue-50 text-blue-700 border-blue-200',eventTitle:ev.title};if(!isStudyDay)return{isStudyDay:false,isHoliday:false,isEffective:false,label:'Libur Rutin (Bukan Hari Belajar)',badgeColor:'bg-slate-100 text-slate-600 border-slate-200'};return{isStudyDay:true,isHoliday:false,isEffective:true,label:'Hari Efektif Belajar',badgeColor:'bg-emerald-50 text-emerald-700 border-emerald-200'}};
  const addSubject = async (s: Omit<Subject, "id">) => {
    try {
      const packedCode = packSubjectCode(s);
      const { data, error } = await supabase.from('subjects').insert({ school_id: currentUser?.schoolId, name: s.name.trim(), code: packedCode, is_specialized: !!s.isSpecialized }).select().single();
      if (error) throw error;
      setSubjects((p) => [...p, dbSubject(data)]);
      showToast("Mata pelajaran " + s.name + " berhasil ditambahkan!");
    } catch (e:any) { showToast(e.message || 'Gagal menyimpan mata pelajaran.', 'error'); }
  };
  const updateSubject = async (id: string, s: Omit<Subject, "id">) => {
    try {
      const packedCode = packSubjectCode(s);
      const { data, error } = await supabase.from('subjects').update({ name:s.name.trim(), code: packedCode, is_specialized:!!s.isSpecialized }).eq('id',id).select().single();
      if (error) throw error;
      setSubjects((p) => p.map((sub) => sub.id === id ? dbSubject(data) : sub));
      showToast("Mata pelajaran " + s.name + " berhasil diperbarui");
    } catch (e:any) { showToast(e.message || 'Gagal memperbarui mata pelajaran.', 'error'); }
  };
  const deleteSubject = async (id: string) => {
    try { const {error}=await supabase.from('subjects').delete().eq('id',id); if(error) throw error; setSubjects((p) => p.filter((s) => s.id !== id)); showToast("Mata pelajaran berhasil dihapus", "info"); }
    catch(e:any){ showToast(e.message || 'Gagal menghapus mata pelajaran.', 'error'); }
  };
  const getAttendanceForDate = (
    date: string,
    options?: { type?: AttendanceType; subjectId?: string | null; classId?: string | null }
  ): AttendanceRecord[] => {
    const targetType: AttendanceType = options?.type || "DAILY";
    const targetSubjectId = options?.subjectId || null;
    const targetClassId = options?.classId || null;
    const targetStudents = targetClassId ? students.filter((s) => s.classId === targetClassId) : students;
    const sortedStudents = [...targetStudents].sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    const dailyRecordsMap = new Map<string, AttendanceRecord>(
      attendanceRecords.filter((a) => a.date === date && (!a.type || a.type === "DAILY")).map((a) => [a.studentId, a])
    );
    const specificRecordsMap = new Map<string, AttendanceRecord>(
      attendanceRecords
        .filter((a) => {
          if (a.date !== date) return false;
          if (targetType === "SUBJECT") {
            return a.type === "SUBJECT" && a.subjectId === targetSubjectId;
          }
          return !a.type || a.type === "DAILY";
        })
        .map((a) => [a.studentId, a])
    );
    return sortedStudents.map((s) => {
      const existing = specificRecordsMap.get(s.id);
      if (existing) return existing;
      if (targetType === "SUBJECT") {
        const dailyRec = dailyRecordsMap.get(s.id);
        const isPermitOrSick = dailyRec?.status === "Sakit" || dailyRec?.status === "Izin";
        const inheritedStatus = isPermitOrSick ? dailyRec.status : ("" as AttendanceStatus);
        const inheritedNotes = isPermitOrSick ? "(Sinkron Wali Kelas: " + dailyRec.status + ")" : "";
        return {
          id: "att-subj-" + date + "-" + (targetSubjectId || "gen") + "-" + s.id,
          date,
          studentId: s.id,
          studentName: s.nama,
          status: inheritedStatus,
          checkInTime: isPermitOrSick ? dailyRec?.checkInTime || "" : "",
          checkOutTime: isPermitOrSick ? dailyRec?.checkOutTime || "" : "",
          notes: inheritedNotes,
          type: "SUBJECT" as AttendanceType,
          subjectId: targetSubjectId,
          classId: targetClassId || s.classId || null,
        };
      }
      return {
        id: "att-" + date + "-" + s.id,
        date,
        studentId: s.id,
        studentName: s.nama,
        status: "" as AttendanceStatus,
        checkInTime: "",
        checkOutTime: "",
        notes: "",
        type: "DAILY" as AttendanceType,
        classId: targetClassId || s.classId || null,
      };
    });
  };
  const saveDailyAttendance = async (
    date: string,
    records: AttendanceRecord[],
    options?: { type?: AttendanceType; subjectId?: string | null; subjectName?: string | null; classId?: string | null }
  ) => {
    try {
      const dateStatus = getDateStatus(date);
      if (!dateStatus.isEffective) {
        showToast(`Presensi tanggal ${date} dikunci karena ${dateStatus.label}`, 'error');
        return;
      }
      const targetType: AttendanceType = options?.type || records[0]?.type || "DAILY";
      const targetSubjectId = options?.subjectId ?? records[0]?.subjectId ?? null;
      const targetSubjectName = options?.subjectName ?? records[0]?.subjectName ?? null;
      const targetClassId = options?.classId ?? records[0]?.classId ?? null;

      const targetStudentIds = records.map((r) => r.studentId).filter(Boolean);

      // Always delete existing records for the targeted students on this date & mode
      if (targetStudentIds.length > 0) {
        let del = supabase
          .from('attendance_records')
          .delete()
          .eq('date', date)
          .eq('type', targetType)
          .in('student_id', targetStudentIds);

        if (currentUser?.schoolId) {
          del = del.eq('school_id', currentUser.schoolId);
        }
        if (targetType === 'SUBJECT' && targetSubjectId) {
          del = del.eq('subject_id', targetSubjectId);
        }
        const { error: delError } = await del;
        if (delError) throw delError;
      }

      const payload = records
        .filter((r) => r.status && r.status !== '-')
        .map((r) => ({
          school_id: currentUser?.schoolId || null,
          date,
          student_id: r.studentId,
          class_id: r.classId || students.find((s) => s.id === r.studentId)?.classId || null,
          type: targetType,
          subject_id: targetSubjectId || null,
          status: r.status,
          check_in_time: r.checkInTime && r.checkInTime !== '-' ? r.checkInTime : null,
          check_out_time: r.checkOutTime && r.checkOutTime !== '-' ? r.checkOutTime : null,
          notes: r.notes || null,
          updated_by: currentUser?.id || null,
        }));

      if (payload.length > 0) {
        const { error: insertError } = await supabase.from('attendance_records').insert(payload);
        if (insertError) throw insertError;
      }

      const activeRecords: AttendanceRecord[] = records
        .filter((r) => Boolean(r.status && r.status !== '-'))
        .map((r) => ({
          ...r,
          type: targetType,
          subjectId: targetSubjectId,
          subjectName: targetSubjectName,
          classId: targetClassId || r.classId,
          teacherId: currentUser?.id,
          teacherName: currentUser?.name,
        }));

      const targetStudentIdSet = new Set(targetStudentIds);

      setAttendanceRecords((prev) => {
        const filtered = prev.filter((r) => {
          if (r.date !== date) return true;
          if (targetType === "SUBJECT") {
            return !(r.type === "SUBJECT" && r.subjectId === targetSubjectId && targetStudentIdSet.has(r.studentId));
          }
          return !( (!r.type || r.type === "DAILY") && targetStudentIdSet.has(r.studentId) );
        });
        return [...filtered, ...activeRecords];
      });

      const modeLabel = targetType === "SUBJECT" ? "Mata Pelajaran " + (targetSubjectName || "") : "Harian (Wali Kelas)";
      if (payload.length === 0) {
        showToast("Data absensi " + modeLabel + " tanggal " + date + " berhasil di-reset!", "info");
      } else {
        showToast("Data absensi " + modeLabel + " tanggal " + date + " berhasil disimpan!", "success");
      }
    } catch (e: any) {
      showToast(e.message || "Gagal memproses data absensi", "error");
    }
  };
  const submitStudentAttendance = async (
    studentId: string,
    type: 'masuk' | 'pulang' | 'izin' | 'sakit',
    notes?: string,
    customDate?: string
  ) => {
    try {
      if (!currentUser || currentUser.role !== 'SISWA') {
        return { success: false, message: 'Hanya akun SISWA yang dapat menggunakan presensi mandiri.' };
      }
      if (studentId !== currentUser.studentId) {
        return { success: false, message: 'Akses presensi tidak valid untuk akun ini.' };
      }
      const target = customDate || currentAttendanceDate;
      const dateStatus = getDateStatus(target);
      if (!dateStatus.isEffective) {
        const msg = `Presensi tanggal ${target} dikunci karena ${dateStatus.label}`;
        showToast(msg, 'error');
        return { success: false, message: msg };
      }
      if (!systemConfig.studentSelfAttendanceEnabled) {
        const msg = 'Presensi mandiri siswa sedang dinonaktifkan oleh pihak sekolah.';
        showToast(msg, 'error');
        return { success: false, message: msg };
      }

      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const currentMinutes = currentH * 60 + currentM;
      const currentTimeStr = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

      let finalNotes = notes || '';

      // Enforce Jam Buka Presensi Masuk & Batas Masuk Tepat Waktu
      if (type === 'masuk') {
        if (systemConfig.checkInStartTime) {
          const [startH, startM] = systemConfig.checkInStartTime.split(':').map(Number);
          const startMinutes = (startH || 0) * 60 + (startM || 0);
          if (currentMinutes < startMinutes) {
            const msg = `Presensi masuk belum dibuka. Jam buka presensi masuk: ${systemConfig.checkInStartTime} WIB.`;
            showToast(msg, 'error');
            return { success: false, message: msg };
          }
        }

        if (systemConfig.checkInDeadlineTime) {
          const [dlH, dlM] = systemConfig.checkInDeadlineTime.split(':').map(Number);
          const deadlineMinutes = (dlH || 7) * 60 + (dlM || 0);
          if (currentMinutes > deadlineMinutes && systemConfig.autoMarkLate !== false) {
            finalNotes = finalNotes ? `${finalNotes} (Terlambat)` : 'Terlambat';
          }
        }
      }

      // Enforce Jam Buka Presensi Pulang
      if (type === 'pulang') {
        if (systemConfig.checkOutStartTime) {
          const [outH, outM] = systemConfig.checkOutStartTime.split(':').map(Number);
          const outMinutes = (outH || 12) * 60 + (outM || 30);
          if (currentMinutes < outMinutes) {
            const msg = `Presensi pulang belum dibuka. Jam buka presensi pulang: ${systemConfig.checkOutStartTime} WIB.`;
            showToast(msg, 'error');
            return { success: false, message: msg };
          }
        }
      }

      // Attempt RPC first, with robust fallback to direct table operation if RPC fails
      let mappedResult: AttendanceRecord | null = null;
      try {
        const { data, error } = await supabase.rpc('submit_student_attendance', {
          p_student_id: studentId,
          p_action: type,
          p_notes: finalNotes || null,
          p_target_date: target,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) {
          mappedResult = dbAttendance(row, students);
        }
      } catch (rpcErr) {
        // Fallback: direct table operation
        const existingRecord = attendanceRecords.find(
          (r) => r.date === target && r.studentId === studentId && (!r.type || r.type === 'DAILY')
        );
        const studentObj = students.find((s) => s.id === studentId);

        const updatePayload: any = {
          school_id: currentUser.schoolId || null,
          student_id: studentId,
          class_id: studentObj?.classId || null,
          date: target,
          type: 'DAILY',
          updated_by: currentUser.id,
        };

        if (type === 'masuk') {
          updatePayload.status = 'Hadir';
          updatePayload.check_in_time = currentTimeStr;
          updatePayload.notes = finalNotes || null;
        } else if (type === 'pulang') {
          updatePayload.check_out_time = currentTimeStr;
        } else if (type === 'izin') {
          updatePayload.status = 'Izin';
          updatePayload.notes = notes || 'Izin';
        } else if (type === 'sakit') {
          updatePayload.status = 'Sakit';
          updatePayload.notes = notes || 'Sakit';
        }

        if (existingRecord?.id) {
          const { data: upData, error: upErr } = await supabase
            .from('attendance_records')
            .update(updatePayload)
            .eq('id', existingRecord.id)
            .select()
            .single();
          if (upErr) throw upErr;
          mappedResult = dbAttendance(upData, students);
        } else {
          const { data: inData, error: inErr } = await supabase
            .from('attendance_records')
            .insert(updatePayload)
            .select()
            .single();
          if (inErr) throw inErr;
          mappedResult = dbAttendance(inData, students);
        }
      }

      if (mappedResult) {
        setAttendanceRecords((p) => [
          ...p.filter(
            (r) =>
              r.id !== mappedResult!.id &&
              !(r.date === mappedResult!.date && r.studentId === mappedResult!.studentId && (!r.type || r.type === 'DAILY'))
          ),
          mappedResult,
        ]);
      }

      const isLateArrival = type === 'masuk' && finalNotes.includes('Terlambat');
      const label =
        type === 'izin' || type === 'sakit'
          ? `Pengajuan ${type.toUpperCase()} berhasil dikirim ke Wali Kelas`
          : type === 'masuk'
          ? isLateArrival
            ? `Presensi Masuk berhasil dicatat (Terlambat - Pukul ${currentTimeStr} WIB)`
            : `Presensi Masuk berhasil dicatat pukul ${currentTimeStr} WIB`
          : `Presensi Pulang berhasil dicatat pukul ${currentTimeStr} WIB`;

      showToast(label, type === 'izin' || type === 'sakit' ? 'info' : isLateArrival ? 'info' : 'success');
      return { success: true, message: 'Berhasil' };
    } catch (e: any) {
      const message = e?.message || 'Presensi gagal diproses.';
      showToast(message, 'error');
      return { success: false, message };
    }
  };
 const resetAllDataToProductionReady=async()=>{showToast('Reset data demo tidak digunakan pada versi Supabase. Gunakan SQL Editor untuk reset database secara sengaja.','info')};
 const changeOwnPassword=async(newPassword:string):Promise<{success:boolean;message:string}>=>{
  try{
   if(!newPassword||newPassword.length<8) return {success:false,message:'Password minimal 8 karakter.'};
   const {error:authError}=await supabase.auth.updateUser({password:newPassword});
   if(authError) throw authError;
   const {error:rpcError}=await supabase.rpc('mark_password_changed');
   if(rpcError) throw rpcError;
   setCurrentUser(p=>p?{...p,mustChangePassword:false}:p);
   showToast('Password berhasil diganti.');
   return {success:true,message:'Berhasil'};
  }catch(e:any){const message=e?.message||'Gagal mengganti password.';showToast(message,'error');return{success:false,message}}
 };
    return <AppContext.Provider value={{logout,classes,addClass,updateClass,deleteClass,assignTeacherClasses,importClasses,teachers,addTeacher,updateTeacher,deleteTeacher,importTeachers,subjects,addSubject,updateSubject,deleteSubject,currentUser,setCurrentUser,registrationRequired,setRegistrationRequired,passwordRecovery,setPasswordRecovery,activeView,setActiveView,userWorkspaces,activeWorkspace,isOnboarding,setIsOnboarding,isSelectingWorkspace,setIsSelectingWorkspace,selectWorkspace,openOnboarding,returnToWorkspaceSelector,loadUserDataAfterOnboarding,loadData,schoolProfile,updateSchoolProfile,systemConfig,updateSystemConfig,students,addStudent,updateStudent,deleteStudent,deleteStudentsByClass,importStudents,users,addUser,deleteUser,updateUser,syncUsersWithStudents,generateAccountsFromReferences,updateUserPassword,academicEvents,addAcademicEvent,deleteAcademicEvent,activeStudyDays,updateActiveStudyDays,effectiveDaysConfig,updateEffectiveDays,getBaseStudyDaysForMonth,getEffectiveDaysForMonth,getDateStatus,attendanceRecords,currentAttendanceDate,setCurrentAttendanceDate,saveDailyAttendance,getAttendanceForDate,submitStudentAttendance,changeOwnPassword,resetAllDataToProductionReady,toasts,showToast,removeToast,impersonateSchool,stopImpersonation,globalAnnouncement,updateGlobalAnnouncement}}>{children}</AppContext.Provider>;
};
export const useApp=()=>{const c=useContext(AppContext);if(!c)throw new Error('useApp must be used within an AppProvider');return c};
