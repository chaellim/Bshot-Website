import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import logo from '../../imports/burger-shot-logo.png';
import { LineChart, Line, ScatterChart, Scatter, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface SalesDashboardProps {
  onBack: () => void;
  entries: SalesEntry[];
  onDeleteEntries: (invoiceNumbers: string[]) => void;
  onUpdateEntry: (invoiceNumber: string, updatedEntry: SalesEntry) => void;
  userRole: 'trainee' | 'employee' | 'manager' | 'owner';
  onRefresh?: () => void;
}

type ViewMode = 'list' | 'line' | 'scatter' | 'histogram' | 'pie';

const COLORS = ['#B71C1C', '#1a3a52', '#D4733B', '#8B5A2B', '#FFF8E1'];

const AVAILABLE_PRODUCTS = [
  { name: 'Combo 1: 5 burgers & 5 colas', price: 15000 },
  { name: 'Combo 2: 5 fries & 5 shakes', price: 15000 },
  { name: 'Burger', price: 2000 },
  { name: 'Fries', price: 2000 },
  { name: 'Drink', price: 1000 },
  { name: 'Shake', price: 1000 },
];

export default function SalesDashboard({ onBack, entries, onDeleteEntries, onUpdateEntry, userRole, onRefresh }: SalesDashboardProps) {
  const canEdit = userRole === 'manager' || userRole === 'owner';

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [searchEmployee, setSearchEmployee] = useState('');
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [viewingEntry, setViewingEntry] = useState<SalesEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEntry, setEditedEntry] = useState<SalesEntry | null>(null);

  // Salary computation modal state
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [employees, setEmployees] = useState<{ full_name: string; role: string }[]>([]);
  const [selectedEmployeeForSalary, setSelectedEmployeeForSalary] = useState('');
  const [salaryDateFrom, setSalaryDateFrom] = useState('');
  const [salaryDateTo, setSalaryDateTo] = useState('');
  const [computedSalary, setComputedSalary] = useState<number | null>(null);
  const [selectedEmployeeRole, setSelectedEmployeeRole] = useState('');

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, role')
        .order('full_name');

      if (data) {
        setEmployees(data);
      }
    };

    fetchEmployees();
  }, []);

  const handleComputeSalary = () => {
    if (!selectedEmployeeForSalary || !salaryDateFrom || !salaryDateTo) {
      alert('Please select an employee and date range');
      return;
    }

    // Filter entries by employee and date range
    const employeeEntries = entries.filter(entry => {
      return (
        entry.employeeName === selectedEmployeeForSalary &&
        entry.date >= salaryDateFrom &&
        entry.date <= salaryDateTo
      );
    });

    // Calculate total sales
    const totalSales = employeeEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);

    // Get employee role
    const employee = employees.find(e => e.full_name === selectedEmployeeForSalary);
    const role = employee?.role || '';

    // Calculate salary based on role
    let percentage = 0;
    if (role === 'trainee') percentage = 0.20;
    else if (role === 'employee') percentage = 0.30;
    else if (role === 'manager') percentage = 0.40;
    else if (role === 'owner') percentage = 0;

    const salary = totalSales * percentage;
    setComputedSalary(salary);
    setSelectedEmployeeRole(role);
  };

  const handleOpenSalaryModal = () => {
    setShowSalaryModal(true);
    setSelectedEmployeeForSalary('');
    setSalaryDateFrom('');
    setSalaryDateTo('');
    setComputedSalary(null);
    setSelectedEmployeeRole('');
  };

  const allProducts = useMemo(() => {
    const productSet = new Set<string>();
    entries.forEach(entry => {
      entry.products.forEach(product => {
        productSet.add(product.name);
      });
    });
    return Array.from(productSet);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;
      if (selectedProduct !== 'all' && !entry.products.some(p => p.name === selectedProduct)) return false;
      if (searchEmployee && !entry.employeeName.toLowerCase().includes(searchEmployee.toLowerCase())) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, selectedProduct, searchEmployee]);

  const lineChartData = useMemo(() => {
    const dateMap = new Map<string, number>();
    filteredEntries.forEach(entry => {
      const current = dateMap.get(entry.date) || 0;
      dateMap.set(entry.date, current + entry.totalAmount);
    });
    return Array.from(dateMap.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEntries]);

  const productSalesData = useMemo(() => {
    const productMap = new Map<string, { quantity: number; revenue: number }>();
    filteredEntries.forEach(entry => {
      entry.products.forEach(product => {
        const current = productMap.get(product.name) || { quantity: 0, revenue: 0 };
        productMap.set(product.name, {
          quantity: current.quantity + product.quantity,
          revenue: current.revenue + (product.price * product.quantity)
        });
      });
    });
    return Array.from(productMap.entries()).map(([name, data]) => ({
      name,
      quantity: data.quantity,
      revenue: data.revenue
    }));
  }, [filteredEntries]);

  const scatterData = useMemo(() => {
    return filteredEntries.map(entry => ({
      date: new Date(entry.date).getTime(),
      amount: entry.totalAmount,
      invoice: entry.invoiceNumber
    }));
  }, [filteredEntries]);

  const totalRevenue = useMemo(() => {
    return filteredEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
  }, [filteredEntries]);

  const totalTransactions = filteredEntries.length;

  const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const handleSelectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map(e => e.invoiceNumber)));
    }
  };

  const handleSelectEntry = (invoiceNumber: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(invoiceNumber)) {
      newSelected.delete(invoiceNumber);
    } else {
      newSelected.add(invoiceNumber);
    }
    setSelectedEntries(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedEntries.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedEntries.size} entries?`)) {
      onDeleteEntries(Array.from(selectedEntries));
      setSelectedEntries(new Set());
    }
  };

const handleViewEntry = async (entry: SalesEntry) => {
  // Fetch full data from Supabase
  const { data, error } = await supabase
    .from('sales_entries')
    .select('*')
    .eq('invoice_number', entry.invoiceNumber)
    .single();

  if (error) {
    console.error('Error fetching full entry:', error);
    return;
  }

const fullEntry: SalesEntry = {
  invoiceNumber: data.invoice_number,
  employeeName: data.employee_name,
  date: data.date,
  products: data.products || [],
  screenshot: data.screenshot ?? '', // 👈 IMPORTANT FIX
  totalAmount: Number(data.total_amount),
  discount: Number(data.discount || 0),
  timestamp: new Date(data.created_at).getTime()
};

  setViewingEntry(fullEntry);
  setEditedEntry({ ...fullEntry });
  setIsEditing(false);
};

  const handleCloseModal = () => {
    setViewingEntry(null);
    setEditedEntry(null);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedEntry(viewingEntry ? { ...viewingEntry } : null);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (editedEntry) {
      onUpdateEntry(editedEntry.invoiceNumber, editedEntry);
      setViewingEntry(editedEntry);
      setIsEditing(false);
    }
  };

  const handleDeleteEntry = (invoiceNumber: string) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      onDeleteEntries([invoiceNumber]);
      handleCloseModal();
    }
  };

  const handleEditProductQuantity = (productName: string, quantity: number) => {
    if (!editedEntry) return;

    const existingProductIndex = editedEntry.products.findIndex(p => p.name === productName);
    let newProducts = [...editedEntry.products];

    if (quantity > 0) {
      const productPrice = AVAILABLE_PRODUCTS.find(p => p.name === productName)?.price || 0;
      if (existingProductIndex >= 0) {
        newProducts[existingProductIndex] = { name: productName, price: productPrice, quantity };
      } else {
        newProducts.push({ name: productName, price: productPrice, quantity });
      }
    } else {
      if (existingProductIndex >= 0) {
        newProducts = newProducts.filter((_, i) => i !== existingProductIndex);
      }
    }

    const totalAmount = newProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    setEditedEntry({
      ...editedEntry,
      products: newProducts,
      totalAmount
    });
  };

  const handleDownloadCSV = () => {
    if (filteredEntries.length === 0) {
      alert('No entries to download');
      return;
    }

    const headers = ['Invoice Number', 'Date', 'Employee Name', 'Products', 'Total Amount', 'Screenshot/Notes'];
    const rows = filteredEntries.map(entry => [
      entry.invoiceNumber,
      entry.date,
      entry.employeeName,
      entry.products.map(p => `${p.name} (${p.quantity})`).join('; '),
      entry.totalAmount.toString(),
      entry.screenshot.startsWith('data:image') ? '[Image]' : entry.screenshot.replace(/[\n\r]/g, ' ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `sales-entries-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Burger Shot" className="h-12 w-auto" />
              <h1 className="text-foreground">Sales Tracker Dashboard</h1>
            </div>
            <div className="flex items-center gap-3">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
                  title="Refresh data"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              )}
              <button
                onClick={handleOpenSalaryModal}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Compute Salary
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors"
              >
                Back to Tools
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-3xl text-primary">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground mb-1">Total Transactions</p>
            <p className="text-3xl text-foreground">{totalTransactions}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-muted-foreground mb-1">Average Transaction</p>
            <p className="text-3xl text-accent">${averageTransaction.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h3 className="text-foreground mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Products</option>
                {allProducts.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Employee</label>
              <input
                type="text"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setSelectedProduct('all');
              setSearchEmployee('');
            }}
            className="mt-4 px-4 py-2 text-primary hover:bg-muted rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="bg-card border border-border rounded-lg p-4 mb-8">
          <div className="flex gap-2 flex-wrap items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('line')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'line' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
              >
                Line Graph
              </button>
              <button
                onClick={() => setViewMode('scatter')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'scatter' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
              >
                Scatter Plot
              </button>
              <button
                onClick={() => setViewMode('histogram')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'histogram' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
              >
                Histogram
              </button>
              <button
                onClick={() => setViewMode('pie')}
                className={`px-4 py-2 rounded-lg transition-colors ${viewMode === 'pie' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
              >
                Pie Chart
              </button>
            </div>
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download CSV
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-card border border-border rounded-lg p-6">
          {viewMode === 'list' && (
            <div>
              {/* Bulk Actions */}
              {canEdit && selectedEntries.size > 0 && (
                <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                  <span className="text-foreground">{selectedEntries.size} selected</span>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Delete Selected
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {canEdit && (
                        <th className="text-left py-3 px-4 w-12">
                          <input
                            type="checkbox"
                            checked={filteredEntries.length > 0 && selectedEntries.size === filteredEntries.length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring"
                          />
                        </th>
                      )}
                      <th className="text-left py-3 px-4 text-foreground">Invoice</th>
                      <th className="text-left py-3 px-4 text-foreground">Date</th>
                      <th className="text-left py-3 px-4 text-foreground">Employee</th>
                      <th className="text-left py-3 px-4 text-foreground">Products</th>
                      <th className="text-right py-3 px-4 text-foreground">Total</th>
                      <th className="text-center py-3 px-4 text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 7 : 6} className="text-center py-8 text-muted-foreground">
                          No entries found
                        </td>
                      </tr>
                    ) : (
                      filteredEntries.map((entry) => (
                        <tr key={entry.invoiceNumber} className="border-b border-border hover:bg-muted transition-colors">
                          {canEdit && (
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={selectedEntries.has(entry.invoiceNumber)}
                                onChange={() => handleSelectEntry(entry.invoiceNumber)}
                                className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-ring"
                              />
                            </td>
                          )}
                          <td className="py-3 px-4 text-primary">{entry.invoiceNumber}</td>
                          <td className="py-3 px-4 text-foreground">{entry.date}</td>
                          <td className="py-3 px-4 text-foreground">{entry.employeeName}</td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {entry.products.map(p => `${p.name} (${p.quantity})`).join(', ')}
                          </td>
                          <td className="py-3 px-4 text-right text-foreground">${entry.totalAmount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleViewEntry(entry)}
                              className="px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {viewMode === 'line' && (
            <div>
              <h3 className="text-foreground mb-4">Sales Over Time</h3>
              {lineChartData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data to display</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis dataKey="date" stroke="#757575" />
                    <YAxis stroke="#757575" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#B71C1C" strokeWidth={2} name="Total Sales ($)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {viewMode === 'scatter' && (
            <div>
              <h3 className="text-foreground mb-4">Transaction Distribution</h3>
              {scatterData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data to display</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis dataKey="date" type="number" name="Date" stroke="#757575" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                    <YAxis dataKey="amount" name="Amount" stroke="#757575" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Transactions" data={scatterData} fill="#B71C1C" />
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {viewMode === 'histogram' && (
            <div>
              <h3 className="text-foreground mb-4">Product Sales</h3>
              {productSalesData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data to display</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={productSalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis dataKey="name" stroke="#757575" />
                    <YAxis stroke="#757575" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" fill="#B71C1C" name="Quantity Sold" />
                    <Bar dataKey="revenue" fill="#1a3a52" name="Revenue ($)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {viewMode === 'pie' && (
            <div>
              <h3 className="text-foreground mb-4">Revenue by Product</h3>
              {productSalesData.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No data to display</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={productSalesData}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={(entry) => `${entry.name}: $${entry.revenue.toLocaleString()}`}
                    >
                      {productSalesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Entry Detail Modal */}
      {viewingEntry && editedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <h2 className="text-foreground">{viewingEntry.invoiceNumber}</h2>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Employee Name */}
              <div>
                <label className="block text-muted-foreground mb-2">Employee Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedEntry.employeeName}
                    onChange={(e) => setEditedEntry({ ...editedEntry, employeeName: e.target.value })}
                    className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <p className="text-foreground">{viewingEntry.employeeName}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-muted-foreground mb-2">Date of Transaction</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedEntry.date}
                    onChange={(e) => setEditedEntry({ ...editedEntry, date: e.target.value })}
                    className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <p className="text-foreground">{viewingEntry.date}</p>
                )}
              </div>

              {/* Products */}
              <div>
                <label className="block text-muted-foreground mb-2">Products</label>
                {isEditing ? (
                  <div className="space-y-2">
                    {AVAILABLE_PRODUCTS.map(product => {
                      const quantity = editedEntry.products.find(p => p.name === product.name)?.quantity || 0;
                      return (
                        <div key={product.name} className="flex items-center gap-4 bg-muted p-3 rounded-lg">
                          <div className="flex-1">
                            <span className="text-foreground">{product.name}</span>
                            <span className="text-muted-foreground ml-2">(${product.price})</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={quantity}
                            onChange={(e) => handleEditProductQuantity(product.name, parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-center"
                          />
                          <div className="w-24 text-right">
                            <span className="text-foreground">${(product.price * quantity).toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {viewingEntry.products.map(product => (
                      <div key={product.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-foreground">{product.name} (${product.price})</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">Qty: {product.quantity}</span>
                          <span className="text-foreground">${(product.price * product.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Screenshot / Notes */}
<div>
  <label className="block text-muted-foreground mb-2">Screenshot / Notes</label>

  <div className="bg-muted p-4 rounded-lg">
    {viewingEntry.screenshot && viewingEntry.screenshot.startsWith('data:image') ? (
      <img
        src={viewingEntry.screenshot}
        alt="Bill screenshot"
        className="max-w-full h-auto rounded"
      />
    ) : (
      <p className="text-foreground whitespace-pre-wrap">
        {viewingEntry.screenshot || 'No screenshot provided'}
      </p>
    )}
  </div>
</div>
              
{/* Amount Breakdown */}
<div className="border-t border-border pt-4 space-y-2">

  {/* Original Amount */}
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">Original Amount:</span>
    <span className="text-foreground">
      ${(
        (isEditing ? editedEntry.totalAmount : viewingEntry.totalAmount) +
        (viewingEntry.discount || 0)
      ).toLocaleString()}
    </span>
  </div>

  {/* Discount */}
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">Discount:</span>
    <span className="text-red-500">
      - ${ (viewingEntry.discount || 0).toLocaleString() }
    </span>
  </div>

  {/* Final Total */}
  <div className="flex items-center justify-between pt-2 border-t border-border">
    <span className="text-foreground font-medium">Total Amount:</span>
    <span className="text-primary text-2xl">
      ${(isEditing ? editedEntry.totalAmount : viewingEntry.totalAmount).toLocaleString()}
    </span>
  </div>

</div>

</div> {/* ✅ CLOSE Modal Content HERE */}
            
            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border p-6 flex items-center justify-between">
              {canEdit ? (
                isEditing ? (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Save Changes
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleDeleteEntry(viewingEntry.invoiceNumber)}
                      className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleStartEdit}
                      className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Edit
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={handleCloseModal}
                  className="w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Salary Computation Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Compute Salary</h2>
              <button
                onClick={() => setShowSalaryModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Employee Dropdown */}
              <div>
                <label className="block text-foreground font-medium mb-2">
                  Employee Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedEmployeeForSalary}
                  onChange={(e) => setSelectedEmployeeForSalary(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.full_name} value={emp.full_name}>
                      {emp.full_name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-foreground font-medium mb-2">
                  Date From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={salaryDateFrom}
                  onChange={(e) => setSalaryDateFrom(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-foreground font-medium mb-2">
                  Date To <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={salaryDateTo}
                  onChange={(e) => setSalaryDateTo(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Compute Button */}
              <button
                onClick={handleComputeSalary}
                disabled={!selectedEmployeeForSalary || !salaryDateFrom || !salaryDateTo}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Calculate Salary
              </button>

              {/* Result */}
              {computedSalary !== null && (
                <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground mb-1">Role Commission Rate:</div>
                  <div className="text-lg font-medium text-foreground mb-3">
                    {selectedEmployeeRole === 'trainee' && '20% of total sales'}
                    {selectedEmployeeRole === 'employee' && '30% of total sales'}
                    {selectedEmployeeRole === 'manager' && '40% of total sales'}
                    {selectedEmployeeRole === 'owner' && 'N/A (Owner does not receive commission)'}
                  </div>

                  <div className="text-sm text-muted-foreground mb-1">Computed Salary:</div>
                  <div className="text-3xl font-bold text-primary">
                    ${computedSalary.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
