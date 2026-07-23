import React, { useState } from 'react';
import { UserContextMemory } from '../../types/chat';

interface AppointmentBookingCardProps {
  initialMemory?: UserContextMemory;
  onSubmit: (data: {
    name: string;
    phone: string;
    business: string;
    date: string;
    time: string;
    service: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export const AppointmentBookingCard: React.FC<AppointmentBookingCardProps> = ({ initialMemory, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialMemory?.name || '');
  const [phone, setPhone] = useState(initialMemory?.phone || '');
  const [business, setBusiness] = useState(initialMemory?.businessType || '');
  const [service, setService] = useState(initialMemory?.preferredService || 'Website Development');
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState('11:00 AM');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; business?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Valid 10-digit phone number is required';
    }
    if (!business.trim()) errs.business = 'Business name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ name, phone, business, date, time, service, notes });
    }
  };

  return (
    <div className="my-3 p-4 bg-slate-900/95 border border-indigo-500/30 rounded-2xl shadow-xl backdrop-blur-md text-slate-100 animate-fadeIn">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping" />
          <h4 className="font-semibold text-sm text-indigo-400">Book 1-on-1 Growth Consultation</h4>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-200 text-xs">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block text-slate-300 mb-1 font-medium">Your Name *</label>
          <input
            type="text"
            placeholder="e.g. Vikram Verma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          {errors.name && <p className="text-rose-400 text-[10px] mt-0.5">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-300 mb-1 font-medium">Phone Number *</label>
            <input
              type="tel"
              placeholder="e.g. 9125876789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {errors.phone && <p className="text-rose-400 text-[10px] mt-0.5">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">Business / Company *</label>
            <input
              type="text"
              placeholder="e.g. Acme Solar Solutions"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            {errors.business && <p className="text-rose-400 text-[10px] mt-0.5">{errors.business}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-300 mb-1 font-medium">Preferred Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-medium">Time Slot</label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="10:00 AM">10:00 AM - 10:30 AM</option>
              <option value="11:30 AM">11:30 AM - 12:00 PM</option>
              <option value="02:00 PM">02:00 PM - 02:30 PM</option>
              <option value="04:00 PM">04:00 PM - 04:30 PM</option>
              <option value="06:00 PM">06:00 PM - 06:30 PM</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-slate-300 mb-1 font-medium">Primary Focus</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
          >
            <option value="Website & App Development">Website & App Development</option>
            <option value="SEO & Organic Growth">SEO & Organic Growth</option>
            <option value="Google & Meta Lead Ads">Google & Meta Lead Ads</option>
            <option value="WhatsApp Business API">WhatsApp Business API</option>
            <option value="Custom CRM & Lead Ingestion">Custom CRM System</option>
            <option value="AI Business Automation">AI Business Automation</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-300 mb-1 font-medium">Notes / Goals (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Want to increase qualified leads by 3x"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
          />
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
            className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-bold transition shadow-lg shadow-indigo-500/20"
          >
            Confirm Booking
          </button>
        </div>
      </form>
    </div>
  );
};
