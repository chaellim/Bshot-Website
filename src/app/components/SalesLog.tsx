import { useState, useEffect } from 'react';
import { getUserProfile } from '../../../lib/supabase';
import logo from '../../imports/burger-shot-logo.png';
import { Plus, Minus } from 'lucide-react';

interface Product {
  name: string;
  price: number;
  quantity: number;
}

interface SalesEntry {
  employeeName: string;
  date: string;
  products: Product[];
  screenshot: string;
  totalAmount: number;
  discount?: number; // 👈 ADD THIS
  timestamp: number;
}

interface SalesLogProps {
  onBack: () => void;
  onSubmit: (entry: SalesEntry) => void;
}

const AVAILABLE_PRODUCTS = [
  { name: 'Combo 1: 5 burgers & 5 colas', price: 15000 },
  { name: 'Combo 2: 5 fries & 5 shakes', price: 15000 },
  { name: 'Burger', price: 2000 },
  { name: 'Fries', price: 2000 },
  { name: 'Drink', price: 1000 },
  { name: 'Shake', price: 1000 },
];

const createInitialQuantities = () =>
  AVAILABLE_PRODUCTS.reduce((acc, product) => {
    acc[product.name] = 0;
    return acc;
  }, {} as { [key: string]: number });

export default function SalesLog({ onBack, onSubmit }: SalesLogProps) {
  const [employeeName, setEmployeeName] = useState('');

const [date, setDate] = useState(
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
);
  
  const [screenshot, setScreenshot] = useState('');
  const [fileName, setFileName] = useState('');
  const [screenshotType, setScreenshotType] = useState<'image' | 'text'>('text');
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [quantities, setQuantities] = useState(createInitialQuantities());

  const [discount, setDiscount] = useState(0);

useEffect(() => {
  const loadProfile = async () => {
    const profile = await getUserProfile();
    if (profile) {
      setEmployeeName(profile.full_name);
    }
  };

  loadProfile();
}, [showSuccessModal]);
  
  const handleQuantityChange = (productName: string, value: string) => {
    const quantity = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [productName]: quantity >= 0 ? quantity : 0
    }));
  };

  const handleImageFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setScreenshot(result);
      setScreenshotType('image');
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.includes('image')) {
        e.preventDefault();
        handleImageFile(items[i].getAsFile());
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageFile(e.target.files?.[0] || null);
  };

  const calculateProductTotal = (price: number, quantity: number) => price * quantity;

  const calculateGrandTotal = () =>
    AVAILABLE_PRODUCTS.reduce((total, product) => {
      return total + calculateProductTotal(product.price, quantities[product.name] || 0);
    }, 0);

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
if (!employeeName) return setError('Loading profile, please wait...');
  if (!date) return setError('Please select date');

  const totalQty = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  if (totalQty === 0) return setError('Please add at least one product');

  if (!screenshot.trim()) return setError('Please provide screenshot or notes');

  const products = AVAILABLE_PRODUCTS
    .filter(p => (quantities[p.name] || 0) > 0)
    .map(p => ({
      name: p.name,
      price: p.price,
      quantity: quantities[p.name] || 0
    }));

  // ✅ CORRECT LOGIC LOCATION
  const grandTotal = calculateGrandTotal();
  const finalTotal = grandTotal - discount;

  const entry: SalesEntry = {
    employeeName: employeeName.trim(),
    date,
    products,
    screenshot,
    totalAmount: finalTotal,
    discount,
    timestamp: Date.now()
  };

  onSubmit(entry);
  setShowSuccessModal(true);
};

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logo} className="h-12" />
            <h1 className="text-foreground">Sales Log</h1>
          </div>
          <button onClick={onBack} className="text-primary hover:bg-muted px-4 py-2 rounded-lg">
            Back to Tools
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <h2 className="text-foreground mb-6">New Sales Entry</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

<div>
  <label className="block text-foreground mb-2">Employee Name</label>
  <div className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground">
    {employeeName ? (
  employeeName
) : (
  <div className="flex items-center gap-2 text-muted-foreground">
    <div className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin"></div>
    <span>Loading profile...</span>
  </div>
)}
  </div>
</div>

<div>
  <label className="block text-foreground mb-2">Date of Transaction</label>
  <input
    type="date"
    value={date}
    onChange={e => setDate(e.target.value)}
    className="w-full px-4 py-3 bg-input-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
  />
</div>
            
<div className="bg-muted rounded-lg p-4 space-y-3">

  {AVAILABLE_PRODUCTS.map(product => (
  <div
    key={product.name}
    className="flex items-center gap-4 bg-card p-3 rounded-lg border border-border"
  >
    {/* LEFT */}
    <div className="flex-1">
      <span className="text-foreground">{product.name}</span>
      <span className="text-muted-foreground ml-2">(${product.price})</span>
    </div>

    {/* MIDDLE */}
    <div className="w-32 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() =>
          handleQuantityChange(
            product.name,
            String((quantities[product.name] || 0) + 1)
          )
        }
        className="w-8 h-8 flex items-center justify-center rounded bg-green-100 text-green-600 hover:bg-green-200"
      >
        <Plus size={16} />
      </button>

      <div className="w-12 text-center px-2 py-1 bg-input-background border border-border rounded">
        {quantities[product.name] || 0}
      </div>

      <button
        type="button"
        onClick={() =>
          handleQuantityChange(
            product.name,
            String(Math.max((quantities[product.name] || 0) - 1, 0))
          )
        }
        className="w-8 h-8 flex items-center justify-center rounded bg-red-100 text-red-600 hover:bg-red-200"
      >
        <Minus size={16} />
      </button>
    </div>

    {/* RIGHT */}
    <div className="w-32 text-right">
      ${calculateProductTotal(product.price, quantities[product.name] || 0).toLocaleString()}
    </div>
  </div>
))}  {/* 👈 THIS LINE IS CRITICAL */}

  {/* Discount */}
<div className="flex items-center justify-between">
  <div>
    <span className="text-foreground">Discount</span>
    <p className="text-xs text-muted-foreground">
      Leave $0 if no discount
    </p>
  </div>

  <div className="flex items-center gap-2">
    <span className="text-muted-foreground">$</span>
    <input
      type="number"
      min="0"
      value={discount}
      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
      className="w-24 px-3 py-2 bg-input-background border border-border rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-ring"
    />
  </div>
</div>

{/* Total */}
<div className="border-t border-border pt-3 mt-4 flex justify-between">
  <span>Total Amount:</span>
  <span className="text-primary text-xl">
    ${(calculateGrandTotal() - discount).toLocaleString()}
  </span>
</div>
  </div>
<div
  className={`w-full px-4 py-3 bg-input-background border-2 border-dashed rounded-lg min-h-48 ${
    isDragging ? 'border-primary' : 'border-border'
  }`}
  onPaste={handlePaste}
  onDrop={handleDrop}
  onDragOver={(e) => {
    e.preventDefault();
    setIsDragging(true);
  }}
  onDragLeave={() => setIsDragging(false)}
>
              <p className="text-sm text-muted-foreground mb-2">
                Paste (Ctrl+V), drag & drop, or upload an image
              </p>

              {screenshotType === 'image' && screenshot ? (
                <img src={screenshot} className="max-w-full rounded" />
              ) : (
                <>
                  <textarea
                    value={screenshot}
                    onChange={(e) => {
                      setScreenshot(e.target.value);
                      setScreenshotType('text');
                    }}
                    className="w-full min-h-32 bg-transparent border-none focus:outline-none resize-none"
                    placeholder="Paste screenshot or type notes..."
                  />
                  <div>
  <label className="cursor-pointer inline-block">
    <span className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition">
      Upload Image
    </span>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
  handleFileChange(e);
  setFileName(e.target.files?.[0]?.name || '');
}}
      className="hidden"
    />
  </label>

                    {fileName && (
  <p className="text-sm text-muted-foreground mt-2">
    {fileName}
  </p>
)}

</div>
                </>
              )}
            </div>

            <button className="w-full bg-primary text-white py-3 rounded-lg">
              Submit Entry
            </button>
          </form>
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded text-center">
            <p className="mb-4">You have successfully submitted an entry.</p>
            <button
onClick={() => {
  setShowSuccessModal(false);

  // ❌ DON'T reset employeeName
  // setEmployeeName('');

  // ✅ Reset date to PH time again
  setDate(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  );

  setScreenshot('');
  setScreenshotType('text');
  setQuantities(createInitialQuantities());
  setDiscount(0);
}}
              className="bg-primary text-white px-4 py-2 rounded"
            >
              Submit another one
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
