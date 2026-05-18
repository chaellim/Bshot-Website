import { useState, useEffect } from 'react';
import { supabase, getUserProfile } from '../../lib/supabase';
import logo from '../imports/burger-shot-logo.png';
import ToolsLibrary from './components/ToolsLibrary';
import SalesLog from './components/SalesLog';
import SalesDashboard from './components/SalesDashboard';
import StaffScheduler from './components/StaffScheduler';
import ScheduleRequest from './components/ScheduleRequest';

import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

interface Product {
  name: string;
  price: number;
  quantity: number;
}

interface SalesEntry {
  invoiceNumber: string;
  employeeName: string;
  date: string;
  products: Product[];
  screenshot: string;
  totalAmount: number;
  discount?: number;
  timestamp: number;
}

////////////////////////////////////////////////////////////////////////////////
// ✅ MOVE LOGIN PAGE OUTSIDE (FIXES INPUT BUG)
////////////////////////////////////////////////////////////////////////////////

function LoginPage({
  email,
  setEmail,
  password,
  setPassword,
  handleSubmit,
  error,
  loading
}: any) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">

          <div className="flex justify-center mb-2">
            <img src={logo} alt="Burger Shot" className="h-32 w-auto" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-foreground mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-input-background border border-border rounded-lg"
              />
            </div>

            <button className="w-full bg-primary text-white py-3 rounded-lg">
              {loading ? 'Signing in...' : 'Login'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// MAIN APP
////////////////////////////////////////////////////////////////////////////////

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'trainee' | 'employee' | 'manager' | 'owner' | null>(null);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  // Fetch sales entries when navigating to sales dashboard
  useEffect(() => {
    if (isLoggedIn && location.pathname === '/sales-dashboard') {
      fetchSalesEntries();
    }
  }, [location.pathname, isLoggedIn]);

  
const checkUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    setAuthChecked(true); // ✅ add this
    return;
  }

  const profile = await getUserProfile();

  if (profile) {
    setUserRole(profile.role);
    setIsLoggedIn(true);
    await fetchSalesEntries();
  }

  setAuthChecked(true); // ✅ add this
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData?.user) {
      setError('Invalid email or password');
      setLoading(false);
      return;
    }

    const profile = await getUserProfile();

    if (!profile) {
      setError('User profile not found');
      setLoading(false);
      return;
    }

    setUserRole(profile.role);
    setIsLoggedIn(true);
    setLoading(false);

    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    navigate('/');
  };

const fetchSalesEntries = async () => {
  if (isFetching) return; // 🚫 prevent duplicate calls

  setIsFetching(true);

  // ✅ Check session first
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.warn('No session, skipping fetch');
    setIsFetching(false);
    return;
  }

  const { data, error } = await supabase
    .from('sales_entries')
    .select('invoice_number, employee_name, date, products, total_amount, discount, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Supabase error:', error);
    setIsFetching(false);
    return;
  }

  if (data) {
    setSalesEntries(data.map(entry => ({
      invoiceNumber: entry.invoice_number,
      employeeName: entry.employee_name,
      date: entry.date,
      products: entry.products || [],
      screenshot: entry.screenshot || '',
      totalAmount: Number(entry.total_amount),
      discount: Number(entry.discount || 0),
      timestamp: new Date(entry.created_at).getTime()
    })));
  }

  setIsFetching(false);
};

const handleSalesSubmit = async (entry: SalesEntry) => {
  const { data: { user } } = await supabase.auth.getUser();

  const newId = crypto.randomUUID();

  const { error } = await supabase.from('sales_entries').insert({
    discount: entry.discount || 0,
    invoice_number: newId,
    employee_name: entry.employeeName,
    date: entry.date,
    products: entry.products,
    screenshot: entry.screenshot,
    total_amount: entry.totalAmount,
    created_by: user?.id
  });

  if (error) {
    console.error('Insert error:', error);
    return;
  }

  console.log('Insert successful');

  // ✅ ADD THIS (instant UI update)
  setSalesEntries(prev => [
    {
      invoiceNumber: newId,
      employeeName: entry.employeeName,
      date: entry.date,
      products: entry.products,
      screenshot: entry.screenshot,
      totalAmount: entry.totalAmount,
      timestamp: Date.now()
    },
    ...prev
  ]);
};
  const handleDeleteEntries = async (ids: string[]) => {
  await supabase.from('sales_entries').delete().in('invoice_number', ids);

  // ✅ update UI instantly
  setSalesEntries(prev =>
    prev.filter(entry => !ids.includes(entry.invoiceNumber))
  );
};

const handleUpdateEntry = async (id: string, updated: SalesEntry) => {
  await supabase.from('sales_entries').update({
    employee_name: updated.employeeName,
    date: updated.date,
    products: updated.products,
    screenshot: updated.screenshot,
    total_amount: updated.totalAmount
  }).eq('invoice_number', id);

  // ✅ update UI instantly
  setSalesEntries(prev =>
    prev.map(entry =>
      entry.invoiceNumber === id ? updated : entry
    )
  );
};
  
if (!authChecked) {
  return <div className="min-h-screen flex items-center justify-center">
  <img src={logo} className="h-52" />
</div>;
}
  
  return (
    <Routes>

      <Route
        path="/"
        element={
          <LoginPage
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            handleSubmit={handleSubmit}
            error={error}
            loading={loading}
          />
        }
      />

      <Route
        path="/dashboard"
        element={
          isLoggedIn ? (
            <ToolsLibrary
              onLogout={handleLogout}
              userRole={userRole!}
            />
          ) : <LoginPage
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleSubmit={handleSubmit}
                error={error}
                loading={loading}
              />
        }
      />

      <Route
        path="/sales-log"
        element={
          isLoggedIn ? (
            <SalesLog
              onBack={() => navigate('/dashboard')}
              onSubmit={handleSalesSubmit}
            />
          ) : <LoginPage
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleSubmit={handleSubmit}
                error={error}
                loading={loading}
              />
        }
      />

      <Route
        path="/sales-dashboard"
        element={
          isLoggedIn ? (
            <SalesDashboard
              onBack={() => navigate('/dashboard')}
              entries={salesEntries}
              onDeleteEntries={handleDeleteEntries}
              onUpdateEntry={handleUpdateEntry}
              userRole={userRole!}
              onRefresh={fetchSalesEntries}
            />
          ) : <LoginPage
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                handleSubmit={handleSubmit}
                error={error}
                loading={loading}
              />
        }
      />
<Route
  path="/staff-scheduler"
  element={
    isLoggedIn && userRole === 'owner' ? (
      <StaffScheduler onBack={() => navigate('/dashboard')} />
    ) : (
      <div className="p-10 text-center text-red-500">
        Access Denied
      </div>
    )
  }
/>

<Route
  path="/schedule-request"
  element={
    isLoggedIn ? (
      <ScheduleRequest onBack={() => navigate('/dashboard')} />
    ) : (
      <LoginPage
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleSubmit={handleSubmit}
        error={error}
        loading={loading}
      />
    )
  }
/>

    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </BrowserRouter>
  );
}
