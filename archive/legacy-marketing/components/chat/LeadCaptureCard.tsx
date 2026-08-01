import React, { useState } from 'react';
import { UserContextMemory } from '../../types/chat';

interface LeadCaptureCardProps {
  initialMemory?: UserContextMemory;
  onSubmit: (data: {
    name: string;
    phone: string;
    email?: string;
    business: string;
    budget?: string;
    city?: string;
    service?: string;
  }) => void;
  onCancel: () => void;
}

export const LeadCaptureCard: React.FC<LeadCaptureCardProps> = ({ initialMemory, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialMemory?.name || '');
  const [phone, setPhone] = useState(initialMemory?.phone || '');
  const [email, setEmail] = useState(initialMemory?.email || '');
  const [business, setBusiness] = useState(initialMemory?.businessType || '');
  const [budget, setBudget] = useState(initialMemory?.budget || '');
  const [city, setCity] = useState(initialMemory?.city || '');
  const [service, setService] = useState(initialMemory?.preferredService || 'Website Development');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; business?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Valid 10-digit phone number is required';
    }
    if (!business.trim()) errs.business = 'Business type / name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ name, phone, email, business, budget, city, service });
    }
  };

  return (
    <div className="my-3 p-4 bg-slate-900/90 border border-emerald-500/30 rounded-2xl shadow-xl backdrop-blur-md text-slate-100 animate-fadeIn">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          <h4 className="font-semibold text-sm text-emerald-400">Request Custom Growth Quote</h4>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block text-slate-300 mb-1 font-medium">Your Full Name *</label>
          <input
            type="text"
            placeholder="e.g. Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          {errors.name && <p className="text-rose-400 text-[10px] mt-0.5">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-300 mb-1 font-medium">Phone Number *</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            {errors.phone && <p className="text-rose-400 text-[10px] mt-0.5">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">Email Address</label>
            <input
              type="email"
              placeholder="e.g. rahul@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-300 mb-1 font-medium">Business / Industry *</label>
            <input
              type="text"
              placeholder="e.g. Healthcare Clinic"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            {errors.business && <p className="text-rose-400 text-[10px] mt-0.5">{errors.business}</p>}
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">City</label>
            <input
              type="text"
              placeholder="e.g. Gorakhpur"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-300 mb-1 font-medium">Service Needed</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="Website Development">Website Development</option>
              <option value="SEO Packages">SEO Packages</option>
              <option value="Google & Meta Ads">Google & Meta Ads</option>
              <option value="WhatsApp Automation">WhatsApp Automation</option>
              <option value="Custom CRM System">Custom CRM System</option>
              <option value="AI Business Automation">AI Automation</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">Estimated Budget</label>
            <input
              type="text"
              placeholder="e.g. ₹25,000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
};
