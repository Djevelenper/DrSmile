import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Calendar, 
  Wallet as WalletIcon, 
  QrCode, 
  Plus, 
  ChevronRight, 
  Bell, 
  Search, 
  CreditCard, 
  Users, 
  TrendingUp,
  LogOut,
  Stethoscope,
  ArrowRightLeft,
  MessageSquare,
  FileText,
  Settings,
  LayoutDashboard,
  Megaphone,
  BarChart3,
  ShieldAlert,
  Home,
  Clock,
  Share2,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Wallet, Appointment, AdminStats, UserRole, Service, WalletHistoryEntry, Partner } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletHistory, setWalletHistory] = useState<WalletHistoryEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'LOGIN' | 'PORTAL'>('LOGIN');
  
  // Navigation States
  const [patientTab, setPatientTab] = useState<'HOME' | 'APPOINTMENTS' | 'WALLET' | 'CHAT' | 'PROFILE'>('HOME');
  const [adminSection, setAdminSection] = useState<'DASHBOARD' | 'CALENDAR' | 'CRM' | 'BILLING' | 'PARTNERS' | 'LEDGER' | 'SETTINGS'>('DASHBOARD');

  // Form States
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('PATIENT');
  const [partnerCode, setPartnerCode] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser]);

  const fetchInitialData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [walletRes, apptsRes, servicesRes] = await Promise.all([
        fetch(`/api/wallet/${currentUser.id}`),
        fetch(`/api/appointments?${currentUser.role === 'PATIENT' ? `patient_id=${currentUser.id}` : ''}`),
        fetch('/api/services')
      ]);
      
      const walletData = await walletRes.json();
      setWallet(walletData.wallet);
      setWalletHistory(walletData.history);
      setAppointments(await apptsRes.json());
      setServices(await servicesRes.json());

      if (currentUser.role === 'ADMIN') {
        const statsRes = await fetch('/api/admin/stats');
        setAdminStats(await statsRes.json());
        const partnersRes = await fetch('/api/partners');
        setPartners(await partnersRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, role, name, partner_code: partnerCode }),
      });
      const user = await res.json();
      setCurrentUser(user);
      setView('PORTAL');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async (apptId: number, patientId: number, amount: number) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        appointment_id: apptId,
        payment_method: 'CARD',
        wallet_to_use: 0
      }),
    });
    if (res.ok) fetchInitialData();
  };

  if (view === 'LOGIN') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card max-w-md w-full p-8 shadow-2xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center shadow-lg transform -rotate-6">
              <Stethoscope className="text-white w-10 h-10" />
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold text-center mb-2 tracking-tight">Doctor Smile</h1>
          <p className="text-slate-500 text-center mb-8">Premium Dental Care Experience</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
              <input 
                type="text" 
                required 
                className="input-field" 
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
              <input 
                type="tel" 
                required 
                className="input-field" 
                placeholder="+381 64 123 456"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Role</label>
                <select 
                  className="input-field"
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                >
                  <option value="PATIENT">Patient</option>
                  <option value="ADMIN">Admin</option>
                  <option value="PARTNER">Partner</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Partner Code</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Optional"
                  value={partnerCode}
                  onChange={e => setPartnerCode(e.target.value)}
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-4 text-lg shadow-xl shadow-slate-900/20 mt-4"
            >
              {loading ? 'Entering...' : 'Enter Portal'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // --- PATIENT PORTAL ---
  if (currentUser?.role === 'PATIENT') {
    return (
      <div className="min-h-screen bg-[#f8fafc] pb-24">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 sticky top-0 z-20">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
                <Stethoscope className="text-white w-5 h-5" />
              </div>
              <span className="font-serif font-bold text-xl tracking-tight">Doctor Smile</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setView('LOGIN')}
                className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto p-6">
          <AnimatePresence mode="wait">
            {patientTab === 'HOME' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Welcome */}
                <div>
                  <h2 className="text-3xl font-serif font-bold text-slate-900">Hello, {currentUser.name.split(' ')[0]}!</h2>
                  <p className="text-slate-500">Your smile journey is looking great.</p>
                </div>

                {/* Wallet Card */}
                <div className="card bg-slate-900 text-white p-8 relative overflow-hidden shadow-2xl shadow-slate-900/20">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Available Credits</p>
                        <h3 className="text-4xl font-serif font-bold">{wallet?.balance.toFixed(2)} SC</h3>
                      </div>
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                        <WalletIcon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setPatientTab('WALLET')}
                        className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-95"
                      >
                        Use Credits
                      </button>
                      <button className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md hover:bg-white/20 transition-all">
                        <QrCode className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
                </div>

                {/* Next Appointment */}
                <div className="card p-6 border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Next Appointment</p>
                      <h4 className="text-lg font-bold">Dental Checkup</h4>
                    </div>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-tighter rounded-full">
                      Confirmed
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500 text-sm mb-4">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>Oct 24, 2024</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>10:30 AM</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 btn-secondary py-2.5 text-xs">Reschedule</button>
                    <button className="flex-1 btn-secondary py-2.5 text-xs border-red-100 text-red-500 hover:bg-red-50">Cancel</button>
                  </div>
                </div>

                {/* Quick Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setPatientTab('APPOINTMENTS')}
                    className="card p-5 flex flex-col items-center gap-3 hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="font-bold text-sm">Book Visit</span>
                  </button>
                  <button 
                    onClick={() => setPatientTab('WALLET')}
                    className="card p-5 flex flex-col items-center gap-3 hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Share2 className="w-6 h-6 text-amber-600" />
                    </div>
                    <span className="font-bold text-sm">Referral</span>
                  </button>
                </div>
              </motion.div>
            )}

            {patientTab === 'APPOINTMENTS' && (
              <motion.div 
                key="appts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-serif font-bold">Appointments</h2>
                  <button className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {appointments.map(appt => (
                    <div key={appt.id} className="card p-5 flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                        <Calendar className="w-7 h-7 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold">{appt.service_name}</h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${appt.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">
                          {new Date(appt.start_time).toLocaleDateString()} at {new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {patientTab === 'WALLET' && (
              <motion.div 
                key="wallet"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-serif font-bold">Digital Wallet</h2>
                
                <div className="card bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white">
                  <p className="text-slate-400 text-sm font-medium mb-1">Total Balance</p>
                  <h3 className="text-4xl font-serif font-bold mb-8">{wallet?.balance.toFixed(2)} SC</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Referral Code</p>
                      <p className="font-mono font-bold">{currentUser.referral_code}</p>
                    </div>
                    <button className="btn-primary bg-white text-slate-900 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                      <Share2 className="w-3 h-3" />
                      Share
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-900">Transaction History</h4>
                  {walletHistory.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entry.type === 'DEBIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {entry.type === 'DEBIT' ? <TrendingUp className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{entry.description}</p>
                          <p className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`font-bold ${entry.type === 'DEBIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {entry.type === 'DEBIT' ? '+' : '-'}{entry.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 z-30">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <TabButton active={patientTab === 'HOME'} onClick={() => setPatientTab('HOME')} icon={<Home />} label="Home" />
            <TabButton active={patientTab === 'APPOINTMENTS'} onClick={() => setPatientTab('APPOINTMENTS')} icon={<Calendar />} label="Visits" />
            <TabButton active={patientTab === 'WALLET'} onClick={() => setPatientTab('WALLET')} icon={<WalletIcon />} label="Wallet" />
            <TabButton active={patientTab === 'CHAT'} onClick={() => setPatientTab('CHAT')} icon={<MessageSquare />} label="Chat" />
            <TabButton active={patientTab === 'PROFILE'} onClick={() => setPatientTab('PROFILE')} icon={<UserIcon />} label="Profile" />
          </div>
        </nav>
      </div>
    );
  }

  // --- ADMIN PORTAL ---
  if (currentUser?.role === 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 text-white flex flex-col sticky top-0 h-screen">
          <div className="p-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Stethoscope className="text-slate-900 w-6 h-6" />
            </div>
            <span className="font-serif font-bold text-2xl">SmileAdmin</span>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <SidebarItem active={adminSection === 'DASHBOARD'} onClick={() => setAdminSection('DASHBOARD')} icon={<LayoutDashboard />} label="Dashboard" />
            <SidebarItem active={adminSection === 'CALENDAR'} onClick={() => setAdminSection('CALENDAR')} icon={<Calendar />} label="Calendar" />
            <SidebarItem active={adminSection === 'CRM'} onClick={() => setAdminSection('CRM')} icon={<Users />} label="Patients" />
            <SidebarItem active={adminSection === 'BILLING'} onClick={() => setAdminSection('BILLING')} icon={<CreditCard />} label="Billing" />
            <SidebarItem active={adminSection === 'PARTNERS'} onClick={() => setAdminSection('PARTNERS')} icon={<Share2 />} label="Partners" />
            <SidebarItem active={adminSection === 'LEDGER'} onClick={() => setAdminSection('LEDGER')} icon={<BarChart3 />} label="Ledger" />
            <div className="pt-4 mt-4 border-t border-white/10">
              <SidebarItem active={false} onClick={() => {}} icon={<Megaphone />} label="Campaigns" />
              <SidebarItem active={adminSection === 'SETTINGS'} onClick={() => setAdminSection('SETTINGS')} icon={<Settings />} label="Settings" />
            </div>
          </nav>

          <div className="p-6 border-t border-white/10">
            <button 
              onClick={() => setView('LOGIN')}
              className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10 overflow-auto">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900 capitalize">{adminSection}</h1>
              <p className="text-slate-500">Welcome back, {currentUser.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search anything..." className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-3 w-80 focus:outline-none focus:ring-2 focus:ring-slate-900/5" />
              </div>
              <button className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {adminSection === 'DASHBOARD' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Total Patients" value={adminStats?.totalUsers || 0} icon={<Users className="text-blue-600" />} trend="+12%" color="bg-blue-50" />
                  <StatCard label="Total Revenue" value={`€${adminStats?.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="text-emerald-600" />} trend="+8.4%" color="bg-emerald-50" />
                  <StatCard label="Wallet Liability" value={`€${adminStats?.outstandingLiability.toFixed(2)}`} icon={<WalletIcon className="text-amber-600" />} trend="-2.1%" color="bg-amber-50" />
                  <StatCard label="Active Partners" value={partners.length} icon={<Share2 className="text-purple-600" />} trend="Stable" color="bg-purple-50" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Appointments */}
                  <div className="lg:col-span-2 card">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Recent Appointments</h3>
                      <button className="text-slate-500 text-sm font-bold hover:text-slate-900">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/50">
                            <th className="px-6 py-4">Patient</th>
                            <th className="px-6 py-4">Service</th>
                            <th className="px-6 py-4">Time</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adminStats?.recentAppts.map(appt => (
                            <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-sm">{appt.patient_name}</p>
                                <p className="text-[10px] text-slate-400">ID: #{appt.patient_id}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-medium">{appt.service_name}</span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium">{new Date(appt.start_time).toLocaleDateString()}</p>
                                <p className="text-xs text-slate-400">{new Date(appt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${appt.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>
                                  {appt.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {appt.status !== 'COMPLETED' && (
                                  <button 
                                    onClick={() => handleCheckout(appt.id, appt.patient_id, 500)}
                                    className="text-slate-900 font-bold text-xs hover:underline"
                                  >
                                    Checkout
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Fraud Alerts */}
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-lg">Risk Monitoring</h3>
                      <ShieldAlert className="text-amber-500 w-5 h-5" />
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-red-800 font-bold text-sm mb-1">High Velocity Transfer</p>
                        <p className="text-red-600 text-xs">User #104 sent 500 SC twice in 10 mins.</p>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-amber-800 font-bold text-sm mb-1">New Partner Spike</p>
                        <p className="text-amber-600 text-xs">Hotel Alpha referred 15 users today.</p>
                      </div>
                    </div>
                    <button className="btn-secondary w-full mt-6 py-3 text-sm">View Security Logs</button>
                  </div>
                </div>
              </motion.div>
            )}

            {adminSection === 'PARTNERS' && (
              <motion.div 
                key="partners"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="flex justify-between items-center">
                  <div className="flex gap-4">
                    <button className="btn-primary flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Add Partner
                    </button>
                    <button className="btn-secondary flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Export Report
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-bold">Filter</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partners.map(p => (
                    <div key={p.id} className="card p-6 hover:shadow-xl transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <Share2 className="w-7 h-7" />
                        </div>
                        <button className="p-2 text-slate-300 hover:text-slate-900">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>
                      <h4 className="text-xl font-bold mb-1">{p.company_name}</h4>
                      <p className="text-slate-400 text-sm mb-4">{p.city} • {p.type}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Commission</p>
                          <p className="font-bold">{p.commission_rate}%</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Code</p>
                          <p className="font-mono font-bold text-xs">{p.unique_code}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">Active</span>
                        <button className="text-slate-900 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

  // --- PARTNER PORTAL ---
  if (currentUser?.role === 'PARTNER') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Share2 className="text-white w-5 h-5" />
              </div>
              <span className="font-serif font-bold text-2xl tracking-tight">Partner Hub</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-bold">{currentUser.name}</p>
                <p className="text-xs text-slate-400">Premium Partner</p>
              </div>
              <button 
                onClick={() => setView('LOGIN')}
                className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-8 space-y-8">
          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 card bg-indigo-600 text-white p-10 relative overflow-hidden shadow-2xl shadow-indigo-200">
              <div className="relative z-10">
                <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-2">Available for Payout</p>
                <h2 className="text-6xl font-serif font-bold mb-10">€{wallet?.balance.toFixed(2)}</h2>
                <div className="flex gap-4">
                  <button className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg shadow-indigo-900/20">
                    Request Payout
                  </button>
                  <button className="bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-400 transition-all">
                    View History
                  </button>
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="card p-8 flex flex-col justify-center items-center text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200 mb-6">
                <QrCode className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold mb-2">Your Referral QR</h3>
              <p className="text-slate-500 text-sm mb-6">New patients scan this to link to your account automatically.</p>
              <button className="btn-secondary w-full flex items-center justify-center gap-2">
                <Download className="w-5 h-5" />
                Download Asset
              </button>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard label="Total Referrals" value="142" icon={<Users className="text-blue-600" />} trend="+12" color="bg-blue-50" />
            <StatCard label="Active Patients" value="86" icon={<CheckCircle2 className="text-emerald-600" />} trend="+5" color="bg-emerald-50" />
            <StatCard label="Pending Commission" value="€420.00" icon={<Clock className="text-amber-600" />} trend="Processing" color="bg-amber-50" />
          </div>

          {/* Recent Referrals Table */}
          <div className="card">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Recent Referrals</h3>
              <button className="text-indigo-600 font-bold hover:underline">View All Patients</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-widest text-slate-400 bg-slate-50/50">
                    <th className="px-8 py-5">Patient</th>
                    <th className="px-8 py-5">Registration Date</th>
                    <th className="px-8 py-5">Last Activity</th>
                    <th className="px-8 py-5">Total Spent</th>
                    <th className="px-8 py-5">Your Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <p className="font-bold">Patient {i}</p>
                        <p className="text-xs text-slate-400">ID: #100{i}</p>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-600">Oct {10+i}, 2024</td>
                      <td className="px-8 py-5 text-sm text-slate-600">2 days ago</td>
                      <td className="px-8 py-5 font-bold">€1,250.00</td>
                      <td className="px-8 py-5 font-bold text-indigo-600">€125.00</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

// --- SUBCOMPONENTS ---

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-slate-900 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <div className={`p-2 rounded-xl ${active ? 'bg-slate-100' : ''}`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}

function SidebarItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, trend, color }: { label: string, value: string | number, icon: React.ReactNode, trend: string, color: string }) {
  return (
    <div className="card p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center`}>
          {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : trend === 'Stable' ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-600'}`}>
          {trend}
        </span>
      </div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
    </div>
  );
}
