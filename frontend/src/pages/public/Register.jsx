import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, MapPin, Phone, Upload, CheckCircle,
  ChevronRight, ChevronLeft, AlertCircle, FileText, X, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

const SECTORS = ['Tricycle franchise holder / TODA Member'];
const GENDERS = ['Male','Female','Other'];
const CIVIL_STATUSES = ['Single','Married','Widowed','Separated','Annulled'];
const EDUCATION = [
  'Elementary Graduate','High School Graduate','Vocational / Technical',
  'College Level','College Graduate','Post Graduate','None'
];
const PROVINCES = [
  'Abra', 'Agusan del Norte', 'Agusan del Sur', 'Aklan', 'Albay', 'Antique', 'Apayao', 'Aurora', 
  'Basilan', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Biliran', 'Bohol', 'Bukidnon', 'Bulacan', 
  'Cagayan', 'Camarines Norte', 'Camarines Sur', 'Camiguin', 'Capiz', 'Catanduanes', 'Cavite', 
  'Cebu', 'Cotabato', 'Davao de Oro', 'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 
  'Davao Oriental', 'Dinagat Islands', 'Eastern Samar', 'Guimaras', 'Ifugao', 'Ilocos Norte', 
  'Ilocos Sur', 'Iloilo', 'Isabela', 'Kalinga', 'La Union', 'Laguna', 'Lanao del Norte', 
  'Lanao del Sur', 'Leyte', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Marinduque', 
  'Masbate', 'Metro Manila', 'Misamis Occidental', 'Misamis Oriental', 'Mountain Province', 
  'Negros Occidental', 'Negros Oriental', 'Northern Samar', 'Nueva Ecija', 'Nueva Vizcaya', 
  'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Pampanga', 'Pangasinan', 'Quezon', 
  'Quirino', 'Rizal', 'Romblon', 'Samar', 'Sarangani', 'Siquijor', 'Sorsogon', 'South Cotabato', 
  'Southern Leyte', 'Sultan Kudarat', 'Sulu', 'Surigao del Norte', 'Surigao del Sur', 'Tarlac', 
  'Tawi-Tawi', 'Zambales', 'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay'
];

const MONTHS = [
  { val: '1', label: 'January' }, { val: '2', label: 'February' }, { val: '3', label: 'March' },
  { val: '4', label: 'April' }, { val: '5', label: 'May' }, { val: '6', label: 'June' },
  { val: '7', label: 'July' }, { val: '8', label: 'August' }, { val: '9', label: 'September' },
  { val: '10', label: 'October' }, { val: '11', label: 'November' }, { val: '12', label: 'December' }
];
const YEARS = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 18 - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const formatFranchise = (val) => {
  let clean = val.replace(/[^a-zA-Z0-9]/g, '');
  if (clean.length > 4) {
    clean = clean.slice(0, 4) + '-' + clean.slice(4, 10);
  }
  return clean.toUpperCase();
};

const formatLicense = (val) => {
  let clean = val.replace(/[^a-zA-Z0-9]/g, '');
  let formatted = '';
  if (clean.length > 0) formatted += clean.substring(0, 3);
  if (clean.length > 3) formatted += '-' + clean.substring(3, 5);
  if (clean.length > 5) formatted += '-' + clean.substring(5, 11);
  return formatted.toUpperCase();
};

const ATTACHMENTS = [
  { key: 'drivers_license',   label: "Driver's License",               required: true  },
  { key: 'franchise_receipt', label: "Franchise Receipt / Mayor's Permit", required: true  },
  { key: 'cedula',            label: 'Updated Cedula',                  required: true  },
  { key: 'id_picture',        label: '2x2 ID Picture',                  required: true  },
  { key: 'valid_id',          label: 'Valid Government ID (3 signatures)',required: false },
];

const STEPS = ['Personal Info','Upload Requirements','Review & Submit'];

const initForm = {
  sector: 'Tricycle franchise holder / TODA Member',
  surname: '', given_name: '', middle_name: '',
  complete_address: '', barangay: '', town_city: '', province: '',
  date_of_birth: '', age: '', gender: '',
  cellphone: '', civil_status: '', spouse_name: '',
  educational_attainment: '', toda_name: '',
  franchise_number: '', drivers_license_number: '',
  is_certified: false,
};

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState(initForm);
  const [errors, setErrors]     = useState({});
  const [files, setFiles]       = useState({});    // { drivers_license: File, ... }
  const [previews, setPreviews] = useState({});   // { drivers_license: url/null }
  const [uploading, setUploading] = useState({});
  const [uploaded, setUploaded] = useState({});   // { drivers_license: { id, url, name } }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [refNumber, setRefNumber]   = useState('');
  const [dupWarning, setDupWarning] = useState(null);
  const fileInputRefs = useRef({});

  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobYear, setDobYear] = useState('');

  useEffect(() => {
    if (dobMonth && dobDay && dobYear) {
      const formattedDate = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
      const dobDate = new Date(formattedDate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) calculatedAge--;
      
      setForm(f => ({ ...f, date_of_birth: formattedDate, age: calculatedAge >= 0 ? calculatedAge : '' }));
      setErrors(e => ({ ...e, date_of_birth: '', age: '' }));
    } else {
      setForm(f => ({ ...f, date_of_birth: '', age: '' }));
    }
  }, [dobMonth, dobDay, dobYear]);

  // ── Form field change ──────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let val = type === 'checkbox' ? checked : value;

    if (name === 'franchise_number') {
      val = formatFranchise(val);
    } else if (name === 'drivers_license_number') {
      val = formatLicense(val);
    }

    setForm(f => ({ ...f, [name]: val }));
    setErrors(e => ({ ...e, [name]: '' }));
  };

  // ── Step 1 validation ──────────────────────────────────────────
  const validateStep1 = () => {
    const errs = {};
    const req = ['surname','given_name','complete_address','barangay','town_city',
                  'province','date_of_birth','age','gender','cellphone','civil_status'];
    req.forEach(f => { if (!form[f]) errs[f] = 'This field is required.'; });

    if (form.civil_status === 'Married' && !form.spouse_name) {
      errs.spouse_name = 'Spouse name is required for married applicants.';
    }
    if (form.cellphone && !/^09\d{9}$/.test(form.cellphone)) {
      errs.cellphone = 'Enter a valid Philippine cellphone number (e.g. 09171234567).';
    }
    if (form.age && (form.age < 18 || form.age > 120)) {
      errs.age = 'Age must be between 18 and 120.';
    }

    if (Object.keys(errs).length > 0) {
      toast.error('Please check all fields and fix the errors.');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 2 validation ──────────────────────────────────────────
  const validateStep2 = () => {
    const required = ATTACHMENTS.filter(a => a.required);
    const missing  = required.filter(a => !uploaded[a.key]);
    if (missing.length > 0) {
      toast.error(`Please upload: ${missing.map(a => a.label).join(', ')}`);
      return false;
    }
    return true;
  };

  // ── File selection & upload ────────────────────────────────────
  const handleFileChange = async (attKey, file) => {
    if (!file) return;

    // Client-side size/type check
    const maxSize = 5 * 1024 * 1024;
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is 5MB.`);
      return;
    }
    if (!allowed.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, WEBP, PDF allowed.');
      return;
    }

    setFiles(f => ({ ...f, [attKey]: file }));

    // Preview for images
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviews(p => ({ ...p, [attKey]: url }));
    } else {
      setPreviews(p => ({ ...p, [attKey]: 'pdf' }));
    }

    // We need a reference number to upload — if no tempRef exists, use temp
    const tempRef = form._tempRef || '';
    if (tempRef) {
      await uploadFile(attKey, file, tempRef);
    }
  };

  const uploadFile = async (attKey, file, refNum) => {
    setUploading(u => ({ ...u, [attKey]: true }));
    const fd = new FormData();
    fd.append('reference_number', refNum);
    fd.append('attachment_type', attKey);
    fd.append('file', file);

    try {
      const res = await api.post('/upload.php', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setUploaded(u => ({ ...u, [attKey]: res.data }));
        toast.success(`${ATTACHMENTS.find(a=>a.key===attKey)?.label} uploaded!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed.');
      setFiles(f => { const c = {...f}; delete c[attKey]; return c; });
      setPreviews(p => { const c = {...p}; delete c[attKey]; return c; });
    } finally {
      setUploading(u => ({ ...u, [attKey]: false }));
    }
  };

  const removeFile = (attKey) => {
    setFiles(f => { const c = {...f}; delete c[attKey]; return c; });
    setPreviews(p => { const c = {...p}; delete c[attKey]; return c; });
    setUploaded(u => { const c = {...u}; delete c[attKey]; return c; });
  };

  // ── Navigation ─────────────────────────────────────────────────
  const goNext = async () => {
    if (step === 0) {
      if (!validateStep1()) return;
      // Pre-register to get reference number for file uploads
      if (!form._tempRef) {
        try {
          const res = await api.post('/applications.php?action=submit', {
            ...form, is_certified: 1,
          });
          if (res.data.warning) {
            setDupWarning(res.data);
            return;
          }
          if (res.data.success) {
            setRefNumber(res.data.reference_number);
            setForm(f => ({ ...f, _tempRef: res.data.reference_number }));
          }
        } catch (err) {
          if (err.response?.status === 409) {
            setDupWarning(err.response.data);
            return;
          }
          toast.error(err.response?.data?.error || 'Error saving application. Please try again.');
          return;
        }
      }
      setStep(1);
      window.scrollTo(0,0);
    } else if (step === 1) {
      if (!validateStep2()) return;
      setStep(2);
      window.scrollTo(0,0);
    }
  };

  const goBack = () => {
    setStep(s => s - 1);
    window.scrollTo(0,0);
  };

  // ── Final submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.is_certified) {
      toast.error('Please check the certification box.');
      return;
    }
    // Application was already submitted in step 0, just confirm
    setSubmitting(true);
    try {
      setSubmitted(true);
    } catch (err) {
      toast.error('Submission error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Duplicate override ─────────────────────────────────────────
  const proceedDespiteDuplicate = () => {
    setDupWarning(null);
    setStep(1);
  };

  // ── Render success ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="public-page">
        <div className="public-card" style={{ maxWidth: 540, margin: '0 auto' }}>
          <div className="success-screen">
            <div className="success-icon">
              <CheckCircle size={44} />
            </div>
            <h2 style={{ color: 'var(--success)', marginBottom: 8 }}>Application Submitted!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 380, margin: '0 auto 20px' }}>
              Your MRD application has been submitted and is <strong>pending for approval</strong>.
              The admin will review your application shortly.
            </p>
            <div className="ref-number-box">
              <div className="label">YOUR REFERENCE NUMBER</div>
              <div className="ref">{refNumber}</div>
            </div>
            <div className="alert alert-info" style={{ textAlign: 'left', maxWidth: 400, margin: '16px auto' }}>
              <AlertCircle size={16} />
              <div>
                <strong>Important:</strong> Save your reference number. You will need it to track
                your application status.
              </div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/track')}>
              Track Application Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Duplicate warning modal ────────────────────────────────────
  if (dupWarning) {
    return (
      <div className="public-page">
        <div className="public-card" style={{ maxWidth: 500, margin: '0 auto', padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <AlertCircle size={52} color="var(--warning)" />
          </div>
          <h3 style={{ textAlign: 'center', marginBottom: 12 }}>Possible Duplicate Found</h3>
          <div className="alert alert-warning">
            <AlertCircle size={16} />
            <div>{dupWarning.message}</div>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            If you believe this is an error and you are a new applicant, you may proceed.
            Otherwise, use reference number <strong>{dupWarning.duplicate_ref}</strong> to track
            your existing application.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-block" onClick={() => navigate('/track')}>
              Track Existing
            </button>
            <button className="btn btn-warning btn-block" onClick={proceedDespiteDuplicate}>
              Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="public-page">
      {/* Header */}
      <div className="public-header">
        <div className="gov-logo">🍚</div>
        <h1>MRD Registration Form</h1>
        <p>Monthly Rice Distribution Program — TODA Members</p>
      </div>

      {/* Main card */}
      <div className="public-card">
        {/* Step progress */}
        <div className="step-progress">
          {STEPS.map((label, i) => (
            <div key={i} className={`step-item ${i === step ? 'active' : i < step ? 'done' : ''}`}>
              <div className="step-num">
                {i < step ? <CheckCircle size={16} /> : i + 1}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* Step 1: Personal Information */}
        {step === 0 && (
          <div className="step-form">
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={20} color="var(--primary)" /> Personal Information
            </h3>

            {/* Sector */}
            <div className="form-group">
              <label className="form-label">Sector <span className="required">*</span></label>
              <select name="sector" className="form-control" value={form.sector} onChange={handleChange}>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Name */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Surname <span className="required">*</span></label>
                <input type="text" name="surname" className={`form-control ${errors.surname?'error':''}`}
                  value={form.surname} onChange={handleChange} placeholder="e.g. Dela Cruz" />
                {errors.surname && <div className="form-error"><AlertCircle size={13}/>{errors.surname}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Given Name <span className="required">*</span></label>
                <input type="text" name="given_name" className={`form-control ${errors.given_name?'error':''}`}
                  value={form.given_name} onChange={handleChange} placeholder="e.g. Juan" />
                {errors.given_name && <div className="form-error"><AlertCircle size={13}/>{errors.given_name}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Middle Name</label>
              <input type="text" name="middle_name" className="form-control"
                value={form.middle_name} onChange={handleChange} placeholder="e.g. Santos" />
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label"><MapPin size={14} style={{marginRight:4}}/>Complete Address <span className="required">*</span></label>
              <input type="text" name="complete_address" className={`form-control ${errors.complete_address?'error':''}`}
                value={form.complete_address} onChange={handleChange}
                placeholder="House No., Street, Subdivision/Village" />
              {errors.complete_address && <div className="form-error"><AlertCircle size={13}/>{errors.complete_address}</div>}
            </div>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Barangay <span className="required">*</span></label>
                <input type="text" name="barangay" className={`form-control ${errors.barangay?'error':''}`}
                  value={form.barangay} onChange={handleChange} placeholder="e.g. Poblacion" />
                {errors.barangay && <div className="form-error"><AlertCircle size={13}/>{errors.barangay}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Town / City <span className="required">*</span></label>
                <input type="text" name="town_city" className={`form-control ${errors.town_city?'error':''}`}
                  value={form.town_city} onChange={handleChange} placeholder="e.g. Quezon City" />
                {errors.town_city && <div className="form-error"><AlertCircle size={13}/>{errors.town_city}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Province <span className="required">*</span></label>
                <select name="province" className={`form-control ${errors.province?'error':''}`}
                  value={form.province} onChange={handleChange}>
                  <option value="">Select Province</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {errors.province && <div className="form-error"><AlertCircle size={13}/>{errors.province}</div>}
              </div>
            </div>

            {/* Personal details */}
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Date of Birth <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className={`form-control ${errors.date_of_birth?'error':''}`} value={dobMonth} onChange={e => setDobMonth(e.target.value)}>
                    <option value="">Month</option>
                    {MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                  </select>
                  <select className={`form-control ${errors.date_of_birth?'error':''}`} value={dobDay} onChange={e => setDobDay(e.target.value)}>
                    <option value="">Day</option>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className={`form-control ${errors.date_of_birth?'error':''}`} value={dobYear} onChange={e => setDobYear(e.target.value)}>
                    <option value="">Year</option>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                {errors.date_of_birth && <div className="form-error"><AlertCircle size={13}/>{errors.date_of_birth}</div>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Age <span className="required">*</span></label>
                <input type="number" name="age" className={`form-control ${errors.age?'error':''}`}
                  value={form.age} onChange={handleChange} min="18" max="120" readOnly />
                {errors.age && <div className="form-error"><AlertCircle size={13}/>{errors.age}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gender <span className="required">*</span></label>
                <select name="gender" className={`form-control ${errors.gender?'error':''}`}
                  value={form.gender} onChange={handleChange}>
                  <option value="">Select Gender</option>
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
                {errors.gender && <div className="form-error"><AlertCircle size={13}/>{errors.gender}</div>}
              </div>
              <div className="form-group">
                <label className="form-label"><Phone size={14} style={{marginRight:4}}/>Cellphone Number <span className="required">*</span></label>
                <input type="tel" name="cellphone" className={`form-control ${errors.cellphone?'error':''}`}
                  value={form.cellphone} onChange={handleChange} placeholder="09XXXXXXXXX" maxLength={11} />
                {errors.cellphone && <div className="form-error"><AlertCircle size={13}/>{errors.cellphone}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Civil Status <span className="required">*</span></label>
                <select name="civil_status" className={`form-control ${errors.civil_status?'error':''}`}
                  value={form.civil_status} onChange={handleChange}>
                  <option value="">Select Status</option>
                  {CIVIL_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                {errors.civil_status && <div className="form-error"><AlertCircle size={13}/>{errors.civil_status}</div>}
              </div>
              {form.civil_status === 'Married' && (
                <div className="form-group">
                  <label className="form-label">Spouse Name <span className="required">*</span></label>
                  <input type="text" name="spouse_name" className={`form-control ${errors.spouse_name?'error':''}`}
                    value={form.spouse_name} onChange={handleChange} placeholder="Full name of spouse" />
                  {errors.spouse_name && <div className="form-error"><AlertCircle size={13}/>{errors.spouse_name}</div>}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Highest Educational Attainment</label>
              <select name="educational_attainment" className="form-control"
                value={form.educational_attainment} onChange={handleChange}>
                <option value="">Select Education</option>
                {EDUCATION.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>

            {/* TODA Info */}
            <h3 style={{ margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              🚲 TODA Information
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">TODA Name</label>
                <input type="text" name="toda_name" className="form-control"
                  value={form.toda_name} onChange={handleChange} placeholder="e.g. Brgy. Poblacion TODA" />
              </div>
              <div className="form-group">
                <label className="form-label">Franchise Number <span style={{color:'var(--text-muted)',fontWeight:400}}>(if available)</span></label>
                <input type="text" name="franchise_number" className="form-control"
                  value={form.franchise_number} onChange={handleChange} placeholder="e.g. 2024-001234" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Driver's License Number <span style={{color:'var(--text-muted)',fontWeight:400}}>(if available)</span></label>
              <input type="text" name="drivers_license_number" className="form-control"
                value={form.drivers_license_number} onChange={handleChange} placeholder="e.g. N01-23-456789" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-primary btn-lg" onClick={goNext}>
                Next: Upload Requirements <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload Requirements */}
        {step === 1 && (
          <div className="step-form">
            <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Upload size={20} color="var(--primary)" /> Upload Requirements
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 20 }}>
              Accepted formats: JPG, PNG, WEBP, PDF · Maximum size: 5MB per file
            </p>

            <div className="attachment-grid">
              {ATTACHMENTS.map(att => (
                <AttachmentUploader
                  key={att.key}
                  att={att}
                  file={files[att.key]}
                  preview={previews[att.key]}
                  uploadedInfo={uploaded[att.key]}
                  uploading={uploading[att.key]}
                  refNum={form._tempRef}
                  onFile={(f) => handleFileChange(att.key, f)}
                  onRemove={() => removeFile(att.key)}
                  fileInputRef={el => fileInputRefs.current[att.key] = el}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn btn-outline" onClick={goBack}>
                <ChevronLeft size={18} /> Back
              </button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={goNext}>
                Next: Review & Submit <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 2 && (
          <div className="step-form">
            <h3 style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Eye size={20} color="var(--primary)" /> Review Your Information
            </h3>

            {/* Summary */}
            <div className="card" style={{ marginBottom: 16, background: '#F8F9FA' }}>
              <div className="detail-grid">
                {[
                  ['Sector', form.sector],
                  ['Full Name', `${form.given_name} ${form.middle_name || ''} ${form.surname}`.trim()],
                  ['Date of Birth', form.date_of_birth],
                  ['Age', form.age],
                  ['Gender', form.gender],
                  ['Civil Status', form.civil_status],
                  ['Cellphone', form.cellphone],
                  ['Address', form.complete_address],
                  ['Barangay', form.barangay],
                  ['Town/City', form.town_city],
                  ['Province', form.province],
                  ['TODA Name', form.toda_name || '—'],
                  ['Franchise No.', form.franchise_number || '—'],
                  ['License No.', form.drivers_license_number || '—'],
                ].map(([label, val]) => (
                  <div key={label} className="detail-item">
                    <label>{label}</label>
                    <p>{val || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments summary */}
            <h4 style={{ marginBottom: 12 }}>Uploaded Documents</h4>
            <div style={{ marginBottom: 20 }}>
              {ATTACHMENTS.map(att => (
                <div key={att.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--border)'
                }}>
                  {uploaded[att.key]
                    ? <CheckCircle size={18} color="var(--success)" />
                    : <AlertCircle size={18} color={att.required ? 'var(--danger)' : 'var(--text-muted)'} />
                  }
                  <span style={{ flex: 1, fontSize: '0.9rem' }}>{att.label}</span>
                  {uploaded[att.key]
                    ? <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Uploaded</span>
                    : <span style={{ fontSize: '0.8rem', color: att.required ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {att.required ? 'Missing' : 'Optional'}
                      </span>
                  }
                </div>
              ))}
            </div>

            {/* Certification */}
            <div className="checkbox-group" style={{ marginBottom: 20 }}>
              <input type="checkbox" id="is_certified" name="is_certified"
                checked={form.is_certified} onChange={handleChange} />
              <label htmlFor="is_certified">
                <strong>I certify</strong> that all information submitted is true and correct.
                I understand that providing false information is punishable by law and may result
                in disqualification from the MRD Program.
              </label>
            </div>

            {!form.is_certified && (
              <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                <AlertCircle size={16} />
                Please check the certification box to submit.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={goBack}>
                <ChevronLeft size={18} /> Back
              </button>
              <button
                className="btn btn-success btn-lg"
                style={{ flex: 1 }}
                onClick={handleSubmit}
                disabled={submitting || !form.is_certified}
              >
                {submitting
                  ? <><div className="spinner-sm" /> Submitting...</>
                  : <><CheckCircle size={18} /> Submit Application</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginTop: 28 }}>
        MRD – Monthly Rice Distribution Program · Powered by LGU
      </div>
    </div>
  );
}

// ── Attachment Uploader Component ──────────────────────────────────
function AttachmentUploader({ att, file, preview, uploadedInfo, uploading, refNum, onFile, onRemove, fileInputRef }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div className="attachment-item">
      <div className="attachment-label">
        <h4>
          <FileText size={16} color="var(--primary)" />
          {att.label}
        </h4>
        <span className={`req-tag ${att.required ? 'required' : 'optional'}`}>
          {att.required ? 'Required' : 'Optional'}
        </span>
      </div>

      {!file ? (
        <div
          className="upload-area"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef?.click()}
        >
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            ref={fileInputRef}
            onChange={(e) => onFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <div className="upload-icon"><Upload size={28} /></div>
          <p>Click or drag & drop to upload</p>
          <div className="upload-hint">JPG, PNG, WEBP, PDF · Max 5MB</div>
        </div>
      ) : (
        <div className="upload-preview">
          {preview === 'pdf' ? (
            <div className="pdf-icon">📄</div>
          ) : preview ? (
            <img src={preview} alt="preview" />
          ) : null}
          <div className="upload-preview-info">
            <div className="file-name">{file.name}</div>
            <div className="file-size">{(file.size / 1024).toFixed(1)} KB</div>
            {uploading && <div style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>Uploading...</div>}
            {uploadedInfo && <div style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>✓ Uploaded</div>}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onRemove} title="Remove">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
