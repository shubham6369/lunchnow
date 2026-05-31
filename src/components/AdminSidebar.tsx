"use client";

import React from "react";
import { 
  LayoutDashboard, 
  Users, 
  Store, 
  ShoppingBag, 
  CreditCard, 
  Star,
  Settings,
  ShieldCheck,
  ChevronRight,
  UtensilsCrossed,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { m } from "framer-motion";

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "live_orders", label: "Live Orders", icon: Activity },
    { id: "users", label: "User Management", icon: Users },
    { id: "vendors", label: "Kitchen Partners", icon: Store },
    { id: "dishes", label: "Global Dishes", icon: UtensilsCrossed },
    { id: "orders", label: "Order History", icon: ShoppingBag },
    { id: "payouts", label: "Vendor Payouts", icon: CreditCard },
    { id: "reviews", label: "Reviews & Ratings", icon: Star },
  ];

  return (
    <>
      {/* Mobile Navigation - Horizontal Scrollable */}
      <div className="lg:hidden fixed top-20 left-0 right-0 z-60 px-4 py-3 bg-background/80 backdrop-blur-2xl border-b border-white/5">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all text-[10px] font-black uppercase tracking-widest border",
                activeTab === item.id 
                  ? "bg-primary text-black border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" 
                  : "bg-white/5 text-muted border-white/5"
              )}
            >
              <item.icon className={cn("w-3.5 h-3.5", activeTab === item.id ? "text-black" : "text-muted")} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="w-72 h-[calc(100vh-120px)] sticky top-24 bg-secondary/20 backdrop-blur-xl border border-white/5 rounded-[40px] p-6 hidden lg:flex flex-col gap-2 shadow-2xl">
        <div className="px-4 py-6 mb-4">
          <div className="flex items-center gap-3 text-primary mb-2">
            <ShieldCheck className="w-6 h-6" />
            <span className="text-sm font-black uppercase tracking-[0.2em]">Master Admin</span>
          </div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider">System Control Center</p>
        </div>

        <div className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-primary text-black" 
                  : "text-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3 relative z-10">
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-black" : "text-muted group-hover:text-primary transition-colors")} />
                <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
              </div>
              {activeTab === item.id ? (
                <ChevronRight className="w-4 h-4 relative z-10" />
              ) : (
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all text-primary" />
              )}
              
              {activeTab === item.id && (
                <m.div 
                  layoutId="active-pill"
                  className="absolute inset-0 bg-primary pointer-events-none"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-4">
          <button 
            onClick={() => {
              sessionStorage.removeItem("master_admin_auth");
              window.location.href = "/";
            }}
            className="w-full flex items-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="text-xs font-black uppercase tracking-wider">Logout Admin</span>
          </button>

          <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">System Online</span>
            </div>
            <p className="text-[9px] text-muted font-mono">v1.0.4-production</p>
          </div>
        </div>

      </div>
    </>
  );
}
