import { Activity, Home, GraduationCap, Sun, ShoppingBag } from "lucide-react";

const INDUSTRIES = [
  { label: "Healthcare & OPD", icon: <Activity size={16} /> },
  { label: "Real Estate & Builders", icon: <Home size={16} /> },
  { label: "Coaching & Institutes", icon: <GraduationCap size={16} /> },
  { label: "Solar & EPC Contractors", icon: <Sun size={16} /> },
  { label: "Local Retail & Business", icon: <ShoppingBag size={16} /> },
];

export default function TrustBar() {
  return (
    <section className="relative border-y border-[#E2DDD5] bg-[#F4F2ED] py-6 z-10 overflow-hidden">
      <div className="main-container flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Section Label */}
        <span className="text-[11px] font-semibold tracking-[0.2em] text-[#8C8A82] uppercase shrink-0 font-interface pt-0.5">
          Businesses We Serve
        </span>

        {/* Industry Row - Desktop clean grid, Mobile sliding marquee wrapper */}
        <div className="w-full overflow-hidden">
          {/* Marquee Wrapper on Mobile, normal flex on Desktop */}
          <div className="flex md:justify-around items-center gap-8 md:gap-4 overflow-x-auto no-scrollbar md:overflow-visible">
            {INDUSTRIES.map((ind, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 text-[#5C5A52] hover:text-[#18170F] shrink-0 transition-colors duration-200"
              >
                <span className="text-[#BF7340]">
                  {ind.icon}
                </span>
                <span className="text-xs font-semibold tracking-wider font-interface">
                  {ind.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
