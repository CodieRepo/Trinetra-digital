// Production Lightweight Schema Validators (No external Zod dependency required)

export const createLeadSchema = {
  parse: (data: any) => {
    if (!data.phone || typeof data.phone !== "string" || data.phone.length < 8) {
      throw new Error("Phone number is required and must be at least 8 digits");
    }
    return {
      phone: String(data.phone),
      name: data.name ? String(data.name) : undefined,
      email: data.email ? String(data.email) : undefined,
      company: data.company ? String(data.company) : undefined,
      service_interest: data.service_interest ? String(data.service_interest) : undefined,
      source: data.source ? String(data.source) : "WhatsApp",
      assigned_to: data.assigned_to ? String(data.assigned_to) : undefined,
    };
  },
};

export const createTaskSchema = {
  parse: (data: any) => {
    if (!data.lead_id) throw new Error("lead_id is required");
    if (!data.title) throw new Error("Task title is required");
    return {
      lead_id: String(data.lead_id),
      title: String(data.title),
      description: data.description ? String(data.description) : undefined,
      task_type: data.task_type || "call",
      priority: data.priority || "medium",
      due_date: data.due_date || new Date().toISOString(),
      assigned_to: data.assigned_to || "Sales Manager",
    };
  },
};

export const createNoteSchema = {
  parse: (data: any) => {
    if (!data.lead_id) throw new Error("lead_id is required");
    if (!data.note) throw new Error("Note content is required");
    return {
      lead_id: String(data.lead_id),
      note: String(data.note),
      author: data.author ? String(data.author) : "Agent",
    };
  },
};

export const sendMessageSchema = {
  parse: (data: any) => {
    if (!data.lead_id) throw new Error("lead_id is required");
    if (!data.text) throw new Error("Message text cannot be empty");
    return {
      lead_id: String(data.lead_id),
      phone: String(data.phone || ""),
      text: String(data.text),
      provider: data.provider || "bhash",
    };
  },
};
