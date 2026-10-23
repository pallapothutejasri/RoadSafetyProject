import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from "recharts";

type Severity = "Minor" | "Serious" | "Fatal";
type Accident = {
  id: number; date: string; time: string; state: string; district: string;
  location: string; latitude: number | null; longitude: number | null;
  vehicle: string; accident_type: string; cause: string; severity: Severity;
  injured: number; fatalities: number; weather: string; road_condition: string;
  description: string; reporter: string; status: "Pending" | "Reviewed";
  admin_remarks: string; is_sample: boolean;
};
type Page = "Dashboard" | "Report Accident" | "Accident Reports" | "Live Map" | "Analytics" | "Safety Tips" | "Emergency Help" | "Settings";


const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const COLORS = ["#36b37e", "#ffab00", "#ff5630"];
const vehicles = ["Car", "Motorcycle", "Bus", "Truck", "Auto Rickshaw", "Bicycle"];
const districts = ["Guntur", "Tirupati", "Krishna", "NTR", "Visakhapatnam", "Chittoor", "Nellore", "Kurnool", "Kadapa", "Anantapur", "East Godavari", "Vizianagaram"];
const tips = [
  "Wear a seat belt in every car journey.", "Wear a certified helmet when riding a two-wheeler.",
  "Follow traffic signals, signs and lane markings.", "Never use a phone while driving.",
  "Keep a safe distance from vehicles ahead.", "Slow down in rain, fog and low visibility.",
  "Never drive under the influence of alcohol or drugs.", "Stop and rest when tired.",
  "Give pedestrians enough time to cross.", "Keep your vehicle maintained and roadworthy."
];
function MapResize() { const map = useMap(); useEffect(() => { const t = window.setTimeout(() => map.invalidateSize(), 180); return () => window.clearTimeout(t); }, [map]); return null; }
function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Admin" | "User">("User");
  const [loginError, setLoginError] = useState("");
  const [page, setPage] = useState<Page>("Dashboard");
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10), time: "12:00", state: "Andhra Pradesh",
    district: "Tirupati", location: "", latitude: "13.6288", longitude: "79.4192",
    vehicle: "Car", accident_type: "Collision", cause: "Unknown", severity: "Minor" as Severity,
    injured: "0", fatalities: "0", weather: "Clear", road_condition: "Dry", description: "", reporter: ""
  });

  async function loadAccidents() {
    setLoading(true); setApiError("");
    try {
      const res = await fetch(`${API}/accidents`);
      if (!res.ok) throw new Error("API returned " + res.status);
      setAccidents(await res.json());
    } catch {
      setApiError("Cannot connect to the API. Start the backend in the second terminal.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void loadAccidents(); }, []);

  const filtered = useMemo(() => accidents.filter(a => {
    const term = search.toLowerCase();
    const matches = `${a.id} ${a.location} ${a.district} ${a.vehicle} ${a.cause} ${a.accident_type}`.toLowerCase().includes(term);
    return matches && (severityFilter === "All" || a.severity === severityFilter) && (statusFilter === "All" || a.status === statusFilter);
  }), [accidents, search, severityFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: accidents.length,
    minor: accidents.filter(a => a.severity === "Minor").length,
    serious: accidents.filter(a => a.severity === "Serious").length,
    fatal: accidents.filter(a => a.severity === "Fatal").length,
    injured: accidents.reduce((n,a) => n + a.injured, 0),
    fatalities: accidents.reduce((n,a) => n + a.fatalities, 0),
    pending: accidents.filter(a => a.status === "Pending").length,
    reviewed: accidents.filter(a => a.status === "Reviewed").length
  }), [accidents]);

  const severityData = [{name:"Minor", count:stats.minor}, {name:"Serious", count:stats.serious}, {name:"Fatal", count:stats.fatal}];
  const vehicleData = vehicles.map(name => ({ name, count: accidents.filter(a => a.vehicle === name).length }));
  const districtData = [...new Set(accidents.map(a => a.district))].map(name => ({name, count: accidents.filter(a => a.district === name).length})).sort((a,b) => b.count-a.count).slice(0,7);
const [isRegistering, setIsRegistering] = useState(false);
const [fullName, setFullName] = useState("");
  

const login = async (e: FormEvent) => {
  e.preventDefault();
  setLoginError("");

  try {
    const response = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: username.trim(),
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    setRole(data.role);
    setUsername(data.full_name);
    setLoggedIn(true);
  } catch (error) {
    setLoginError(
      error instanceof Error ? error.message : "Unable to connect to the server"
    );
  }
};

  function logout() { setLoggedIn(false); setPassword(""); setPage("Dashboard"); setNotice(""); }
  function navigate(p: Page) {
    if (p === "Settings" && role !== "Admin") { setNotice("Settings are available to the demo admin account."); return; }
    setPage(p); setNotice(""); setSearch(""); setSeverityFilter("All"); setStatusFilter("All");
  }
  async function submitReport(e: FormEvent) {
    e.preventDefault(); setNotice("");
    const payload = {
      ...form, latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      injured: Number(form.injured), fatalities: Number(form.fatalities),
      reporter: form.reporter.trim() || username
    };
    try {
      const res = await fetch(`${API}/accidents`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail?.[0]?.msg || err.detail || "Please check the entered values."); }
      const saved = await res.json(); setNotice(`Report RS-${String(saved.id).padStart(4,"0")} saved successfully.`); setPage("Accident Reports");
      setForm(f => ({...f, location:"", description:"", injured:"0", fatalities:"0"})); await loadAccidents();
    } catch (err) { setNotice(err instanceof Error ? err.message : "Could not save report."); }
  }
  async function review(a: Accident, status: "Pending" | "Reviewed") {
    if (role !== "Admin") { setNotice("Sign in as admin to review reports."); return; }
    try {
      const res = await fetch(`${API}/accidents/${a.id}`, {method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status, admin_remarks:a.admin_remarks || ""})});
      if (!res.ok) throw new Error("Update failed");
      setNotice(`Report RS-${String(a.id).padStart(4,"0")} updated.`); await loadAccidents();
    } catch { setNotice("Could not update status. Check the backend."); }
  }
  function exportCsv() {
    const columns = ["id","date","time","district","location","vehicle","accident_type","cause","severity","injured","fatalities","weather","road_condition","status"];
    const csv = [columns.join(","), ...filtered.map(a => columns.map(k => `"${String((a as unknown as Record<string,unknown>)[k] ?? "").replace(/"/g,'""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a"); link.href=url; link.download="road-safety-reports.csv"; link.click(); URL.revokeObjectURL(url);
  }

const register = async (e: FormEvent) => {
  e.preventDefault();
  setLoginError("");

  try {
    const response = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email: username.trim(),
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Registration failed");
    }

    setRole(data.role);
    setUsername(data.full_name);
    setLoggedIn(true);
  } catch (error) {
    setLoginError(
      error instanceof Error ? error.message : "Unable to connect to the server"
    );
  }
};

  if (!loggedIn) return <div className="login-page">
    <section className="login-hero">
      <div className="hero-chip">● ROAD SAFETY • DATA FOR BETTER DECISIONS</div>
      <h1>Safer journeys<br/><span>start with insight.</span></h1>
      <p>Explore accident patterns, report incidents, and support safer roads through accessible data.</p>
      <div className="hero-points"><span>✓ Interactive accident map</span><span>✓ Live analytics dashboard</span><span>✓ Community reporting</span></div>
      <div className="road-art"><div className="road-line"/></div>
    </section>
    
<section className="login-area">
  <form
    className="login-card"
    onSubmit={isRegistering ? register : login}
  >
    <div className="brand">
      <span className="brand-icon">RS</span>
      <span>RoadSafety<span className="brand-light"> Insights</span></span>
    </div>

    <p className="eyebrow">
      {isRegistering ? "JOIN ROADSAFETY" : "WELCOME BACK"}
    </p>

    <h2>{isRegistering ? "Create your account" : "Sign in to continue"}</h2>

    <p className="muted">
      {isRegistering
        ? "Register with your name, email and password."
        : "Sign in using your registered email and password."}
    </p>

    {isRegistering && (
      <label>
        Full name
        <input
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Enter your full name"
          required
          autoComplete="name"
        />
      </label>
    )}

    <label>
      Email
      <input
        type="email"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
    </label>

    <label>
      Password
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder={isRegistering ? "At least 8 characters" : "Enter password"}
        required
        minLength={isRegistering ? 8 : undefined}
        autoComplete={isRegistering ? "new-password" : "current-password"}
      />
    </label>

    {loginError && <div className="alert error">{loginError}</div>}

    <button className="btn primary wide" type="submit">
      {isRegistering ? "Create account" : "Sign in"} <span>→</span>
    </button>

    <div className="demo-credentials">
      <span>
        {isRegistering ? "Already have an account?" : "New to RoadSafety?"}
      </span>
      <button
        type="button"
        className="btn"
        onClick={() => {
          setIsRegistering(!isRegistering);
          setLoginError("");
        }}
      >
        {isRegistering ? "Sign in" : "Create account"}
      </button>
    </div>
  </form>
</section>

     
     
  </div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand sidebar-brand"><span className="brand-icon">RS</span><span>RoadSafety<small>INSIGHTS PLATFORM</small></span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{([
        ["Dashboard","⌂"],["Report Accident","＋"],["Accident Reports","▤"],["Live Map","◎"],["Analytics","▥"],["Safety Tips","✓"],["Emergency Help","✚"],["Settings","⚙"]
      ] as [Page,string][]).filter(([p]) => p !== "Settings" || role === "Admin").map(([p,icon]) =>
        <button key={p} className={`nav-link ${page===p?"active":""}`} onClick={()=>navigate(p)}><span className="nav-icon">{icon}</span>{p}{page===p&&<span className="nav-dot"/>}</button>
      )}</nav>
      <div className="sidebar-bottom"><div className="online-dot"/> API connection {apiError ? <span className="offline">offline</span> : <span className="online">active</span>}<button onClick={logout} className="logout">↪ Log out</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="crumb">WORKSPACE / <b>{page.toUpperCase()}</b></div><h2>{page === "Dashboard" ? "Good day, " + username : page}</h2></div><div className="top-user"><div className="live-pill"><i/> {apiError ? "API offline" : "System live"}</div><div className="avatar">{username.charAt(0).toUpperCase()}</div><div><b>{username}</b><small>{role} account</small></div></div></header>
      <div className="content">
        {notice && <div className="alert" role="status">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
        {apiError && <div className="alert error">{apiError} <button onClick={()=>void loadAccidents()}>Retry</button></div>}
        {loading && <div className="loading">Loading accident records…</div>}
        {page === "Dashboard" && <>
          <div className="welcome-banner"><div><span className="eyebrow">YOUR ROAD SAFETY OVERVIEW</span><h3>Every data point can make a difference.</h3><p>Explore recorded patterns and help build awareness.</p></div><button className="btn primary" onClick={()=>navigate("Report Accident")}>＋ Report incident</button></div>
          <div className="stat-grid">
            <Stat title="Total reports" value={stats.total} icon="▤" tone="blue" sub="All records in database"/>
            <Stat title="Serious & fatal" value={stats.serious+stats.fatal} icon="⚠" tone="red" sub="Recorded high-severity reports"/>
            <Stat title="People injured" value={stats.injured} icon="＋" tone="orange" sub="Sum of recorded injuries"/>
            <Stat title="Awaiting review" value={stats.pending} icon="◷" tone="purple" sub={`${stats.reviewed} reports reviewed`}/>
          </div>
          <div className="two-col">
            <section className="panel"><PanelTitle title="Severity breakdown" sub="Reported records by severity"/><div className="chart"><ResponsiveContainer width="100%" height="250"><PieChart><Pie data={severityData} dataKey="count" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={4}>{severityData.map((entry,i)=><Cell key={entry.name} fill={COLORS[i]}/>)}</Pie><Tooltip/><Legend verticalAlign="bottom"/></PieChart></ResponsiveContainer></div></section>
            <section className="panel"><PanelTitle title="Reports by vehicle" sub="Compare vehicle categories"/><div className="chart"><ResponsiveContainer width="100%" height="250"><BarChart data={vehicleData} margin={{top:8,right:8,left:-20,bottom:28}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} fontSize={10}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#2e90fa" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div></section>
          </div>
          <div className="two-col lower"><section className="panel"><PanelTitle title="Location highlights" sub="Top districts in current records" action="View map" onAction={()=>navigate("Live Map")}/>{districtData.map((d,i)=><div className="rank-row" key={d.name}><span className="rank">{i+1}</span><span className="rank-name">{d.name}</span><div className="progress"><i style={{width:`${100*d.count/Math.max(1,...districtData.map(x=>x.count))}%`}}/></div><b>{d.count}</b></div>)}</section>
            <section className="panel summary-panel"><PanelTitle title="Report status" sub="Review progress"/><div className="summary-total">{stats.total}<small>total reports</small></div><div className="summary-line"><span><i className="legend green"/> Reviewed</span><b>{stats.reviewed}</b></div><div className="summary-line"><span><i className="legend amber"/> Pending</span><b>{stats.pending}</b></div><button className="btn subtle wide" onClick={()=>navigate("Accident Reports")}>Explore all reports →</button></section></div>
          <section className="panel"><PanelTitle title="Recent reports" sub="Latest entries from the database" action="View all" onAction={()=>navigate("Accident Reports")}/><Reports rows={accidents.slice(0,5)} admin={role==="Admin"} onReview={review}/></section>
          <p className="disclaimer">Demo dataset includes fictional sample records. Counts describe this dataset, not official accident statistics.</p>
        </>}
        {page === "Report Accident" && <section className="panel form-panel"><PanelTitle title="Submit an accident report" sub="Fields marked * are required. Only submit information you are authorised to share."/><form className="report-form" onSubmit={submitReport}>
          <h4>Incident details</h4>
          <label>Date *<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
          <label>Time *<input type="time" required value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></label>
          <label>District *<select value={form.district} onChange={e=>setForm({...form,district:e.target.value})}>{districts.map(d=><option key={d}>{d}</option>)}</select></label>
          <label className="span2">Exact road / location *<input required minLength={2} placeholder="Road, junction, highway or landmark" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
          <label>Latitude<input type="number" step="any" value={form.latitude} onChange={e=>setForm({...form,latitude:e.target.value})}/></label>
          <label>Longitude<input type="number" step="any" value={form.longitude} onChange={e=>setForm({...form,longitude:e.target.value})}/></label>
          <label>Vehicle type<select value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value})}>{vehicles.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Accident type<select value={form.accident_type} onChange={e=>setForm({...form,accident_type:e.target.value})}>{["Collision","Rear-end collision","Vehicle overturn","Pedestrian accident","Single-vehicle accident","Hit and run"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Suspected cause<select value={form.cause} onChange={e=>setForm({...form,cause:e.target.value})}>{["Speeding","Distracted driving","Poor road condition","Weather conditions","Traffic rule violation","Vehicle failure","Unknown"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Severity<select value={form.severity} onChange={e=>setForm({...form,severity:e.target.value as Severity})}>{["Minor","Serious","Fatal"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>People injured<input type="number" min="0" max="999" value={form.injured} onChange={e=>setForm({...form,injured:e.target.value})}/></label>
          <label>Fatalities recorded<input type="number" min="0" max="999" value={form.fatalities} onChange={e=>setForm({...form,fatalities:e.target.value})}/></label>
          <label>Weather<select value={form.weather} onChange={e=>setForm({...form,weather:e.target.value})}>{["Clear","Rainy","Foggy","Cloudy","Unknown"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Road condition<select value={form.road_condition} onChange={e=>setForm({...form,road_condition:e.target.value})}>{["Dry","Wet","Damaged","Slippery","Unknown"].map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Reporter name<input value={form.reporter} onChange={e=>setForm({...form,reporter:e.target.value})} placeholder="Optional"/></label>
          <label className="span2">Description<textarea rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Additional observations (avoid sensitive personal data)"/></label>
          <div className="span2 form-actions"><button className="btn primary">Save report</button><button type="reset" className="btn subtle" onClick={()=>setForm({...form,location:"",description:"",injured:"0",fatalities:"0"})}>Clear optional fields</button></div>
        </form></section>}
        {page === "Accident Reports" && <section className="panel"><PanelTitle title="Accident report register" sub="Search, filter, inspect and export records"/><div className="toolbar"><input placeholder="Search location, vehicle, district…" value={search} onChange={e=>setSearch(e.target.value)}/><select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)}><option>All</option><option>Minor</option><option>Serious</option><option>Fatal</option></select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option><option>Pending</option><option>Reviewed</option></select><button className="btn subtle" onClick={exportCsv}>↓ Export CSV</button></div><Reports rows={filtered} admin={role==="Admin"} onReview={review}/><p className="muted small">Showing {filtered.length} of {accidents.length} reports.</p></section>}
        {page === "Live Map" && <section className="panel"><PanelTitle title="Interactive accident map" sub="Select a marker to view report details. Map tiles require internet access."/><div className="map-legend"><span><i className="dot green"/> Minor</span><span><i className="dot amber"/> Serious</span><span><i className="dot red"/> Fatal</span><span className="muted small">{accidents.filter(a=>a.latitude!==null&&a.longitude!==null).length} mapped reports</span></div><div className="map-wrap"><MapContainer center={[15.1,80.0]} zoom={6} scrollWheelZoom={true} style={{height:"100%",width:"100%"}}><MapResize/><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{accidents.filter(a=>a.latitude!==null&&a.longitude!==null).map(a=><CircleMarker key={a.id} center={[a.latitude as number,a.longitude as number]} radius={a.severity==="Fatal"?10:7} pathOptions={{color:a.severity==="Fatal"?"#ff5630":a.severity==="Serious"?"#ffab00":"#36b37e",fillOpacity:.75}}><Popup><b>RS-{String(a.id).padStart(4,"0")} · {a.severity}</b><br/>{a.location}<br/>{a.district}<br/>{a.date} {a.time}<br/>Vehicle: {a.vehicle}<br/>Status: {a.status}</Popup></CircleMarker>)}</MapContainer></div><p className="disclaimer">Map markers are approximate sample locations. They do not indicate validated accident risk or official hotspot rankings.</p></section>}
        {page === "Analytics" && <div className="analytics-grid"><section className="panel"><PanelTitle title="Severity distribution" sub="Number of records by severity"/><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={severityData} dataKey="count" nameKey="name" outerRadius={100} label>{severityData.map((e,i)=><Cell key={e.name} fill={COLORS[i]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></section><section className="panel"><PanelTitle title="Vehicle comparisons" sub="Accident records by vehicle type"/><ResponsiveContainer width="100%" height={300}><BarChart data={vehicleData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={70} fontSize={10}/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#2e90fa" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></section><section className="panel full-span"><PanelTitle title="District comparisons" sub="Top districts in current records"/><ResponsiveContainer width="100%" height={320}><BarChart data={districtData} layout="vertical" margin={{left:20}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={115}/><Tooltip/><Bar dataKey="count" fill="#7f56d9" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></section></div>}
        {page === "Safety Tips" && <section className="panel"><PanelTitle title="Road safety essentials" sub="Small habits can help prevent crashes and reduce harm."/><div className="tips-grid">{tips.map((tip,i)=><article className="tip-card" key={tip}><span>{String(i+1).padStart(2,"0")}</span><p>{tip}</p></article>)}</div></section>}
        {page === "Emergency Help" && <section className="panel emergency"><div className="emergency-icon">!</div><span className="eyebrow">EMERGENCY INFORMATION</span><h3>Get to safety. Call for help.</h3><p>If an accident is happening now, move to a safe place if possible and contact emergency services. Share the location clearly and follow the operator's instructions.</p><div className="emergency-number"><small>India emergency number</small><strong>112</strong><a href="tel:112">Call 112 from your phone</a></div><p className="muted small">This information page does not dispatch responders or transmit a report to emergency services.</p></section>}
        {page === "Settings" && <section className="panel settings"><PanelTitle title="Account & system settings" sub="Demo account information"/><div className="setting-row"><span>Username</span><b>{username}</b></div><div className="setting-row"><span>Role</span><b>{role}</b></div><div className="setting-row"><span>Reports stored</span><b>{stats.total}</b></div><div className="setting-row"><span>Database</span><b>Configured through backend .env</b></div><button className="btn primary" onClick={logout}>Log out</button></section>}
      </div>
      <footer><span>RoadSafety Insights © 2026</span><span>Safer roads through responsible data insights</span></footer>
    </main>
  </div>;
}
function Stat({title,value,icon,tone,sub}:{title:string;value:number;icon:string;tone:string;sub:string}) { return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-title">{title}</div><div className="stat-value">{value.toLocaleString()}</div><div className="stat-sub">{sub}</div></article>; }
function PanelTitle({title,sub,action,onAction}:{title:string;sub:string;action?:string;onAction?:()=>void}) { return <div className="panel-title"><div><h3>{title}</h3><p>{sub}</p></div>{action&&<button className="link-btn" onClick={onAction}>{action} →</button>}</div>; }
function Reports({rows,admin,onReview}:{rows:Accident[];admin:boolean;onReview:(a:Accident,s:"Pending"|"Reviewed")=>void}) { return <div className="table-scroll"><table><thead><tr><th>Report</th><th>Date / time</th><th>Location</th><th>Vehicle</th><th>Severity</th><th>Injured</th><th>Fatalities</th><th>Status</th>{admin&&<th>Admin review</th>}</tr></thead><tbody>{rows.map(a=><tr key={a.id}><td><b className="report-id">RS-{String(a.id).padStart(4,"0")}</b>{a.is_sample&&<small className="sample-tag">Sample</small>}</td><td>{a.date}<small>{a.time}</small></td><td>{a.location}<small>{a.district}, {a.state}</small></td><td>{a.vehicle}</td><td><span className={`severity ${a.severity.toLowerCase()}`}>{a.severity}</span></td><td>{a.injured}</td><td>{a.fatalities}</td><td><span className={`status ${a.status.toLowerCase()}`}>{a.status}</span></td>{admin&&<td><select value={a.status} onChange={e=>onReview(a,e.target.value as "Pending"|"Reviewed")}><option>Pending</option><option>Reviewed</option></select></td>}</tr>)}{rows.length===0&&<tr><td colSpan={admin?9:8} className="empty">No reports match these filters.</td></tr>}</tbody></table></div>; }
export default App;
