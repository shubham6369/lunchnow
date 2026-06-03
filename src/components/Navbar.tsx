"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingBag, 
  Utensils, 
  ChevronLeft,
  User,
  LogOut,
  Settings,
  History,
  ChefHat,
  Heart
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import NotificationCenter from "./NotificationCenter";
import CartDrawer from "./CartDrawer";
import LoginDialog from "./LoginDialog";

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { user, profile, logout } = useAuth();
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isHome = pathname === "/";

  return (
    <>
      <nav className="fixed top-0 w-full z-50 glass-morphism border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isHome && (
              <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors hidden md:flex">
                <ChevronLeft className="w-5 h-5 text-muted" />
              </Link>
            )}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
                <Utensils className="text-white w-5 h-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Lunch<span className="text-primary">Now</span>
              </span>
            </Link>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-muted">
            <Link href="/vendors" className="hover:text-primary transition-colors">Explorer</Link>
            <Link href="/subscriptions" className="hover:text-white transition-colors">Plans</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
          </div>

          <div className="flex items-center gap-1 md:gap-4">
            {/* Notification Center */}
            {user && <NotificationCenter />}

            {/* Cart Button */}
            <button 
              id="cart-btn"
              onClick={() => setIsCartOpen(true)}
              className="p-2.5 hover:bg-white/5 rounded-full transition-colors relative"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background">
                  {cartCount}
                </span>
              )}
            </button>
            
            {!user && (
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="hidden xl:flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-muted hover:text-white transition-all"
              >
                Vendor Login
              </button>
            )}

            {/* User Profile / Login */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1 pl-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all"
                >
                  <div className="hidden md:block text-right">
                    <div className="text-[10px] font-black text-white leading-none">
                      {profile?.displayName || user.displayName || "Verified"}
                    </div>
                    <div className="text-[9px] text-muted font-bold">
                      {user.email || user.phoneNumber || "Member"}
                    </div>
                  </div>
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="avatar" 
                      className="w-9 h-9 rounded-full object-cover border border-primary/40"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm">
                      {(profile?.displayName || user.displayName || user.phoneNumber || "U")[0].toUpperCase()}
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                      <m.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-56 bg-secondary border border-white/5 rounded-3xl shadow-2xl z-50 overflow-hidden p-2"
                      >
                        <Link href="/orders" className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-2xl text-[10px] font-bold transition-all">
                          <History className="w-4 h-4 text-muted" /> My Orders
                        </Link>
                         <Link href="/profile" className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-2xl text-[10px] font-bold transition-all">
                          <User className="w-4 h-4 text-muted" /> Shared Profile
                        </Link>
                        
                        <Link href="/favorites" className="flex items-center gap-3 w-full p-3 hover:bg-white/5 rounded-2xl text-[10px] font-bold transition-all">
                          <Heart className="w-4 h-4 text-muted" /> Favorites
                        </Link>

                        {profile?.role === 'vendor' ? (
                          <Link href="/vendor" className="flex items-center gap-3 w-full p-3 hover:bg-primary/10 rounded-2xl text-[10px] font-bold text-primary transition-all">
                            <Utensils className="w-4 h-4" /> Vendor Dashboard
                          </Link>
                        ) : profile?.role === 'admin' ? (
                          <Link href="/admin" className="flex items-center gap-3 w-full p-3 hover:bg-red-400/10 rounded-2xl text-[10px] font-bold text-red-400 transition-all">
                            <Settings className="w-4 h-4" /> Admin Panel
                          </Link>
                        ) : (
                          <Link href="/vendor/onboarding" className="flex items-center gap-3 w-full p-3 hover:bg-orange-400/10 rounded-2xl text-[10px] font-bold text-orange-400 transition-all">
                            <ChefHat className="w-4 h-4" /> Become a Partner
                          </Link>
                        )}

                        <div className="h-px bg-white/5 my-1" />
                        <button 
                          onClick={() => logout()}
                          className="flex items-center gap-3 w-full p-3 hover:bg-red-400/10 rounded-2xl text-[10px] font-bold text-red-400 transition-all"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </m.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="px-6 py-3 bg-primary hover:bg-primary-dark rounded-full text-xs font-bold transition-all shadow-glow text-white"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </nav>
      
      {/* Global Modals managed by Navbar for convenience, or they can be in layout */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </>
  );
}
