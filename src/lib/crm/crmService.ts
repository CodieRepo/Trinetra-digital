import { AppointmentLead } from '../../types/chat';

const CRM_STORAGE_KEY = 'trinetra_crm_appointments_v1';

export class CRMService {
  public getAppointments(): AppointmentLead[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CRM_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse appointments from localStorage', e);
    }
    return [];
  }

  public saveAppointments(appointments: AppointmentLead[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(appointments));
    } catch (e) {
      console.error('Failed to save appointments to localStorage', e);
    }
  }

  public addAppointment(lead: Omit<AppointmentLead, 'id' | 'createdAt' | 'status'>): AppointmentLead {
    const newAppointment: AppointmentLead = {
      ...lead,
      id: 'apt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      status: 'Upcoming',
      createdAt: Date.now()
    };

    const appointments = this.getAppointments();
    appointments.unshift(newAppointment);
    this.saveAppointments(appointments);

    return newAppointment;
  }

  public updateStatus(id: string, status: 'Upcoming' | 'Completed' | 'Cancelled'): void {
    const appointments = this.getAppointments();
    const updated = appointments.map((apt) => (apt.id === id ? { ...apt, status } : apt));
    this.saveAppointments(updated);
  }

  public deleteAppointment(id: string): void {
    const appointments = this.getAppointments();
    const updated = appointments.filter((apt) => apt.id !== id);
    this.saveAppointments(updated);
  }

  public exportToCSV(): void {
    if (typeof window === 'undefined') return;

    const appointments = this.getAppointments();
    if (appointments.length === 0) {
      alert('No appointments found to export.');
      return;
    }

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Business', 'Service', 'Budget', 'City', 'Date', 'Time', 'Status', 'Notes', 'Created At'];
    const rows = appointments.map((apt) => [
      apt.id,
      `"${apt.name.replace(/"/g, '""')}"`,
      `"${apt.phone}"`,
      `"${apt.email || ''}"`,
      `"${apt.business.replace(/"/g, '""')}"`,
      `"${apt.service}"`,
      `"${apt.budget || ''}"`,
      `"${apt.city || ''}"`,
      `"${apt.date}"`,
      `"${apt.time}"`,
      `"${apt.status}"`,
      `"${(apt.notes || '').replace(/"/g, '""')}"`,
      `"${new Date(apt.createdAt).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trinetra_crm_appointments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const crmService = new CRMService();
