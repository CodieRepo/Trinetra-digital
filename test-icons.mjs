import * as Icons from 'lucide-react';

const required = ["QrCode", "LogOut", "Sparkles", "ArrowRight", "Loader2", "Lock", "Search", "Plus", "Settings", "ShieldAlert", "Zap", "Database", "Play", "Menu", "X", "Activity", "Clock", "Compass", "CheckSquare", "Calendar", "Award", "FileText", "Trash2", "Link", "DollarSign", "Percent", "Copy", "ChevronRight", "ChevronLeft"];

const missing = required.filter(name => !Icons[name]);
console.log("Missing icons:", missing);
