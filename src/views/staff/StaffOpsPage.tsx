import { useSearchParams, useParams, useLocation, useNavigate } from "react-router-dom";
import { UtensilsCrossed, Smartphone, LogOut, KeyRound, Lock, AlertCircle, Loader2, Delete, RotateCcw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import NotificationCenter from "@/components/common/NotificationCenter";
import { useDynamicManifest } from "@/hooks/useDynamicManifest";
import { createClient } from "@/lib/supabase/client";
import StaffOrdersPanel from "../../../trinetra-business-os/packages/verticals/restaurant-os/components/staff/StaffOrdersPanel";

export default function StaffOpsPage() {
  const { canInstall, isInstalled, installApp } = useDynamicManifest();
  const [searchParams] = useSearchParams();
  const params = useParams<{ restaurantId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const restaurantId = params.restaurantId || searchParams.get("restaurant_id") || "";
  
  // Resolve role from URL path (e.g. /kitchen/xyz or /waiter/xyz) or query param
  const isKitchenPath = location.pathname.startsWith("/kitchen");
  const isWaiterPath = location.pathname.startsWith("/waiter");
  const roleParam = searchParams.get("role");
  
  let role: "kitchen" | "waiter" = "kitchen";
  if (isWaiterPath || roleParam === "waiter") {
    role = "waiter";
  } else if (isKitchenPath || roleParam === "kitchen") {
    role = "kitchen";
  }

  // Manage token with session persistence to survive page refreshes
  const [token, setToken] = useState<string>(() => {
    const urlToken = searchParams.get("token");
    if (urlToken) return urlToken;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("trinetra_staff_token") || "";
    }
    return "";
  });

  const [restaurantName, setRestaurantName] = useState<string>("");
  const [staffInfo, setStaffInfo] = useState<{ staff_id?: string; name?: string; role?: string } | null>(null);

  // PIN Keypad state for terminal lockscreen
  const [pinInput, setPinInput] = useState<string>("");
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Centralized 401 Unauthorized Eviction Callback
  const handleUnauthorized = useCallback((message?: string) => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("trinetra_staff_token");
    }
    setToken("");
    setStaffInfo(null);
    setPinInput("");
    setAuthError(message || "Session expired. Please enter your PIN.");
  }, []);

  // 1. Session Detection: Check URL token -> SessionStorage -> Supabase Auth Session
  useEffect(() => {
    async function initAuth() {
      const urlToken = searchParams.get("token");
      if (urlToken) {
        sessionStorage.setItem("trinetra_staff_token", urlToken);
        setToken(urlToken);
        return;
      }

      const savedToken = typeof window !== "undefined" ? sessionStorage.getItem("trinetra_staff_token") : null;
      if (savedToken) {
        // Validate client-side if it's an expired JWT before rendering
        try {
          const parts = savedToken.split(".");
          if (parts.length === 3) {
            const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const decoded = JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
            if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
              handleUnauthorized("Session expired. Please enter your PIN.");
              return;
            }
            if (decoded.staff_name && decoded.role) {
              setStaffInfo({ staff_id: decoded.staff_id, name: decoded.staff_name, role: decoded.role });
            }
          }
        } catch {}

        setToken(savedToken);
        return;
      }

      // Check active Supabase admin/owner session ONLY if explicitly requested via ?preview=admin
      const isExplicitPreview = searchParams.get("preview") === "admin";
      if (isExplicitPreview) {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            sessionStorage.setItem("trinetra_staff_token", session.access_token);
            setToken(session.access_token);
          }
        } catch {
          // No active Supabase session; staff will use PIN lockscreen
        }
      }
    }

    void initAuth();
  }, [searchParams, handleUnauthorized]);

  // 2. Fetch Restaurant Settings & Name once token is present
  useEffect(() => {
    async function fetchRestaurantInfo() {
      if (!token) return;
      try {
        const res = await fetch("/api/client/restaurant/settings", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (res.status === 401) {
          handleUnauthorized("Session expired. Please enter your PIN.");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data?.settings?.name) {
            setRestaurantName(data.settings.name);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    void fetchRestaurantInfo();
  }, [token, handleUnauthorized]);

  // 3. Handle PIN Digit Press
  const handleDigitPress = (digit: string) => {
    if (pinInput.length >= 6 || isAuthenticating) return;
    setAuthError(null);
    setPinInput((prev) => prev + digit);
  };

  const handleBackspace = () => {
    if (isAuthenticating) return;
    setAuthError(null);
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (isAuthenticating) return;
    setAuthError(null);
    setPinInput("");
  };

  // 4. Handle PIN Submission
  const submitPin = useCallback(async (pinToVerify: string) => {
    if (!restaurantId) {
      setAuthError("Missing restaurant ID. Please access using a valid restaurant link.");
      return;
    }
    if (pinToVerify.length < 4) {
      setAuthError("Please enter a valid 4 to 6 digit PIN.");
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/staff/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          pin: pinToVerify,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.token) {
        throw new Error(data.error || "Incorrect PIN. Please try again.");
      }

      // Success: Save token & staff info, unlock operations board
      sessionStorage.setItem("trinetra_staff_token", data.token);
      setToken(data.token);
      if (data.staff) {
        setStaffInfo(data.staff);
      }
      setPinInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setAuthError(msg);
      setPinInput("");
    } finally {
      setIsAuthenticating(false);
    }
  }, [restaurantId]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (pinInput.length === 6 && !token) {
      void submitPin(pinInput);
    }
  }, [pinInput, token, submitPin]);

  // Keyboard shortcut listener for numeric PIN entry
  useEffect(() => {
    if (token) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigitPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter" && pinInput.length >= 4) {
        void submitPin(pinInput);
      } else if (e.key === "Escape") {
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [token, pinInput, submitPin]);

  const handleSignOut = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("trinetra_staff_token");
    }
    setToken("");
    setStaffInfo(null);
    setPinInput("");
    setAuthError(null);
  }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900 flex flex-col">
      {/* Top Navigation Bar — Restaurant-First Identity */}
      <header className="border-b border-stone-200/90 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          
          {/* Restaurant Identity & Operational Mode */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-stone-950 text-base shadow-sm shrink-0">
              <UtensilsCrossed size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black text-stone-900 tracking-tight truncate uppercase">
                  {restaurantName || (role === "kitchen" ? "Kitchen Display" : "Waiter Service")}
                </h1>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                  {role === "kitchen" ? "Kitchen Display Station" : "Waiter Board"}
                </span>
                {staffInfo?.name && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 shrink-0">
                    👤 {staffInfo.name} ({staffInfo.role || role})
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
                {role === "kitchen" ? "Kitchen Dispatch & Prep Queue" : "Dining Floor & Tableside Ordering"}
                <span className="mx-1.5 text-stone-300">•</span>
                <span className="text-[11px] text-stone-400 font-semibold">Powered by Trinetra</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Connection Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canInstall && !isInstalled && (
              <button
                type="button"
                onClick={installApp}
                className="hidden md:inline-flex text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3.5 py-2 rounded-xl items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Smartphone size={14} className="text-amber-600" />
                <span>Install App</span>
              </button>
            )}

            <NotificationCenter restaurantId={restaurantId} role={role} />

            <span className="hidden sm:inline-flex text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>

            {token ? (
              <button
                type="button"
                onClick={handleSignOut}
                title="Lock terminal and sign out"
                className="min-h-[40px] text-xs font-bold text-stone-600 hover:text-rose-700 bg-stone-100 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Lock / Switch Staff</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/restaurant")}
                title="Return to Restaurant Portal"
                className="min-h-[40px] text-xs font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                <span>Admin Portal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: Lockscreen vs Active Operations Board */}
      {!token ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-stone-200/90 shadow-xl p-6 sm:p-8 text-center space-y-6">
            
            {/* Terminal Lock Icon & Branding */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner">
                <Lock size={32} />
              </div>
              <h2 className="text-xl font-black text-stone-900 tracking-tight mt-1">
                {role === "kitchen" ? "Kitchen Terminal Lock" : "Waiter Terminal Lock"}
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                Enter your 4 to 6 digit Staff PIN to unlock operations.
              </p>
            </div>

            {/* PIN Dots Display */}
            <div className="flex justify-center items-center gap-3 py-2">
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = idx < pinInput.length;
                return (
                  <div
                    key={idx}
                    className={`h-4 w-4 rounded-full transition-all duration-200 ${
                      isFilled
                        ? "bg-amber-500 scale-110 shadow-sm shadow-amber-500/50 ring-2 ring-amber-200"
                        : "bg-stone-200 border border-stone-300"
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message Pill */}
            {authError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 text-left animate-in fade-in zoom-in-95 duration-150">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span className="flex-1 leading-tight">{authError}</span>
              </div>
            )}

            {/* Numeric Touch Keypad */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDigitPress(num)}
                  disabled={isAuthenticating}
                  className="h-14 rounded-2xl bg-stone-50 hover:bg-amber-50 active:bg-amber-100 border border-stone-200/80 hover:border-amber-300 text-xl font-bold text-stone-800 transition active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50 select-none shadow-sm"
                >
                  {num}
                </button>
              ))}

              {/* Clear Button */}
              <button
                type="button"
                onClick={handleClear}
                disabled={isAuthenticating || pinInput.length === 0}
                className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-xs font-bold text-stone-600 transition active:scale-95 flex flex-col items-center justify-center cursor-pointer disabled:opacity-40 select-none"
              >
                <RotateCcw size={16} />
                <span className="text-[10px] mt-0.5">Clear</span>
              </button>

              {/* 0 Button */}
              <button
                type="button"
                onClick={() => handleDigitPress("0")}
                disabled={isAuthenticating}
                className="h-14 rounded-2xl bg-stone-50 hover:bg-amber-50 active:bg-amber-100 border border-stone-200/80 hover:border-amber-300 text-xl font-bold text-stone-800 transition active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50 select-none shadow-sm"
              >
                0
              </button>

              {/* Backspace Button */}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={isAuthenticating || pinInput.length === 0}
                className="h-14 rounded-2xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-xs font-bold text-stone-600 transition active:scale-95 flex flex-col items-center justify-center cursor-pointer disabled:opacity-40 select-none"
              >
                <Delete size={18} />
                <span className="text-[10px] mt-0.5">Delete</span>
              </button>
            </div>

            {/* Manual Unlock Submit (for 4 or 5 digit PINs) */}
            {pinInput.length >= 4 && pinInput.length < 6 && (
              <button
                type="button"
                onClick={() => submitPin(pinInput)}
                disabled={isAuthenticating}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-stone-950 font-bold rounded-2xl text-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying PIN...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Unlock Terminal</span>
                  </>
                )}
              </button>
            )}

            {isAuthenticating && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-700">
                <Loader2 size={14} className="animate-spin" />
                <span>Authenticating staff PIN...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex-1 w-full">
          <StaffOrdersPanel
            restaurantId={restaurantId}
            role={role}
            token={token}
            restaurantName={restaurantName}
            onUnauthorized={handleUnauthorized}
          />
        </main>
      )}
    </div>
  );
}
