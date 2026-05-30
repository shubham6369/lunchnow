"use client";

import React, { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { 
  X, 
  Phone, 
  ChevronRight, 
  ArrowLeft, 
  ShieldCheck, 
  Utensils,
  Loader2,
  Mail,
  Lock
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "choose" | "phone" | "otp" | "email" | "signup" | "forgot_password" | "success";

// Google "G" SVG icon
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const { 
    signInWithGoogle, 
    profile, 
    signInWithEmail, 
    signUpWithEmail, 
    sendPasswordReset, 
    signInWithCustomSMS 
  } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [intendedRole, setIntendedRole] = useState<"customer" | "vendor">("customer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("choose");
        setPhoneNumber("");
        setOtp("");
        setEmail("");
        setPassword("");
        setError(null);
        setLoading(false);
        setGoogleLoading(false);
      }, 300);
    }
  }, [isOpen]);

  // Centralized redirect on successful sign-in once profile is loaded
  useEffect(() => {
    if (step === "success" && profile) {
      const timer = setTimeout(() => {
        onClose();
        if (profile.role === "vendor") {
          router.push("/vendor");
        } else if (profile.role === "admin") {
          router.push("/admin");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, profile, onClose, router]);

  // ── Google Sign-in ──────────────────────────────────────
  const handleGoogleSignIn = async (role: "customer" | "vendor" = "customer") => {
    setGoogleLoading(true);
    setError(null);
    try {
      await signInWithGoogle(role);
      setStep("success");
    } catch (err: any) {
      console.error(err);
      setError(err.code === "auth/popup-closed-by-user" 
        ? "Sign-in cancelled. Please try again."
        : err.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Phone OTP ───────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setLoading(true);
    setError(null);
    try {
      const formatted = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
      const response = await fetch("/api/auth/send-sms-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: formatted }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP. Please try again.");
      }

      // Dev-mode fallback
      if (data.devMode && data.otpCode) {
        console.log(`[DEV MODE] OTP Code received on client: ${data.otpCode}`);
        setOtp(data.otpCode);
      }

      setStep("otp");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setError(null);
    try {
      const formatted = phoneNumber.startsWith("+") ? phoneNumber : `+91${phoneNumber}`;
      const response = await fetch("/api/auth/verify-sms-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: formatted, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid OTP code. Please check and try again.");
      }

      await signInWithCustomSMS(data.customToken, intendedRole);
      setStep("success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid OTP code. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Email Auth ──────────────────────────────────────────
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (step === "signup") {
        await signUpWithEmail(email, password, intendedRole);
      } else {
        await signInWithEmail(email, password);
      }
      setStep("success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email);
      setLatestActivity("Reset link sent! Please check your inbox.");
      setStep("email");
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  // Activity Toast Simulation (Internal helper)
  const setLatestActivity = (msg: string) => {
    // This could trigger a global toast, but for now we'll just log or use local error state
    console.log("Activity:", msg);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-100"
          />

          {/* Dialog */}
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#111] z-110 rounded-[40px] border border-white/8 shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Utensils className="text-white w-4 h-4" />
                  </div>
                  <span className="font-bold text-white">LunchNow</span>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <AnimatePresence mode="wait">

                {/* ─── Step: choose method ─── */}
                {step === "choose" && (
                  <m.div
                    key="choose"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <h2 className="text-3xl font-bold mb-1 text-white">Welcome Back</h2>
                    <p className="text-muted text-sm mb-8">Sign in to order your favourite meals.</p>

                    {/* Google button - Customer */}
                    <button
                      onClick={() => handleGoogleSignIn('customer')}
                      disabled={googleLoading}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all mb-4 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_10px_25px_-5px_rgba(249,115,22,0.3)] group"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-white/50" />
                      ) : (
                        <div className="bg-white p-1 rounded-full group-hover:scale-110 transition-transform">
                          <GoogleIcon />
                        </div>
                      )}
                      {googleLoading ? "Signing in…" : "Login as Customer (Google)"}
                    </button>

                    {/* Google button - Vendor */}
                    <button
                      onClick={() => handleGoogleSignIn('vendor')}
                      disabled={googleLoading}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all mb-4 disabled:opacity-60 disabled:cursor-not-allowed group"
                    >
                      {googleLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      ) : (
                        <div className="bg-white/10 p-1 rounded-full group-hover:scale-110 transition-transform">
                          <GoogleIcon />
                        </div>
                      )}
                      {googleLoading ? "Signing in…" : "Login as Partner (Google)"}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-muted text-xs font-bold uppercase tracking-wider">or</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Email Login button */}
                    <button
                      onClick={() => setStep("email")}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all mb-4"
                    >
                      <Mail className="w-5 h-5 text-primary" />
                      Login with Email
                    </button>

                    {/* Phone button */}
                    <button
                      onClick={() => setStep("phone")}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all mb-6"
                    >
                      <Phone className="w-5 h-5 text-primary" />
                      Continue with Phone (OTP)
                    </button>

                    <div className="text-center">
                      <p className="text-muted text-xs">
                        Don't have an account?{" "}
                        <button 
                          onClick={() => setStep("signup")}
                          className="text-primary font-bold hover:underline"
                        >
                          Sign Up
                        </button>
                      </p>
                    </div>

                    {error && (
                      <p className="mt-4 text-xs text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                        {error}
                      </p>
                    )}
                  </m.div>
                )}

                {/* ─── Step: phone ─── */}
                {step === "phone" && (
                  <m.div
                    key="phone"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <button
                      onClick={() => setStep("choose")}
                      className="flex items-center gap-2 text-primary text-xs font-bold mb-6 hover:underline"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                    <h2 className="text-3xl font-bold mb-2 text-white">Enter Phone</h2>
                    <p className="text-muted text-sm mb-8">We'll send you a 6-digit OTP.</p>

                    <form onSubmit={handleSendOtp} className="space-y-6">
                      <div className="space-y-2 mb-4">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">I am a</label>
                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setIntendedRole("customer")}
                            className={cn(
                              "flex-1 py-3 rounded-xl border font-bold text-xs transition-all",
                              intendedRole === "customer" 
                                ? "bg-primary/10 border-primary text-primary" 
                                : "bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-white"
                            )}
                          >
                            Customer
                          </button>
                          <button
                            type="button"
                            onClick={() => setIntendedRole("vendor")}
                            className={cn(
                              "flex-1 py-3 rounded-xl border font-bold text-xs transition-all",
                              intendedRole === "vendor" 
                                ? "bg-primary/10 border-primary text-primary" 
                                : "bg-white/5 border-white/10 text-muted hover:bg-white/10 hover:text-white"
                            )}
                          >
                            Vendor
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Phone Number</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 border-r border-white/10 pr-3">
                            <span className="text-sm font-bold text-muted">+91</span>
                          </div>
                          <input
                            type="tel"
                            placeholder="9876543210"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full bg-background border border-white/10 focus:border-primary/50 rounded-2xl py-4 pl-16 pr-4 outline-none transition-all text-white placeholder:opacity-30"
                            autoFocus
                          />
                        </div>
                      </div>

                      {error && (
                        <p className="text-xs text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</p>
                      )}

                      <button
                        disabled={loading || phoneNumber.length < 10}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ChevronRight className="w-5 h-5" /></>}
                      </button>
                    </form>
                  </m.div>
                )}

                {/* ─── Step: OTP ─── */}
                {step === "otp" && (
                  <m.div
                    key="otp"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <button
                      onClick={() => setStep("phone")}
                      className="flex items-center gap-2 text-primary text-xs font-bold mb-6 hover:underline"
                    >
                      <ArrowLeft className="w-3 h-3" /> Change Number
                    </button>
                    <h2 className="text-3xl font-bold mb-2 text-white">Verify OTP</h2>
                    <p className="text-muted text-sm mb-8">
                      Code sent to <span className="text-white font-bold">+91 {phoneNumber}</span>
                    </p>

                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                      <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full bg-background border border-white/10 focus:border-primary/50 tracking-[1em] text-center font-bold text-2xl rounded-2xl py-4 outline-none transition-all text-white placeholder:opacity-30"
                        autoFocus
                      />

                      {error && (
                        <p className="text-xs text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</p>
                      )}

                      <button
                        disabled={loading || otp.length < 6}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}
                      </button>

                      <p className="text-center text-xs text-muted">
                        Didn&apos;t receive code?{" "}
                        <button type="button" onClick={handleSendOtp} className="text-primary font-bold hover:underline">
                          Resend
                        </button>
                      </p>
                    </form>
                  </m.div>
                )}

                {/* ─── Step: success ─── */}
                {step === "success" && (
                  <m.div
                    key="success"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-12 text-center"
                  >
                    <m.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                      className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                      <ShieldCheck className="w-10 h-10 text-emerald-400" />
                    </m.div>
                    <h2 className="text-3xl font-bold mb-2 text-white">Welcome!</h2>
                    <p className="text-muted text-sm">You&apos;re signed in. Enjoy your meals 🍱</p>
                  </m.div>
                )}

                {/* ─── Step: Email Login/Signup ─── */}
                {(step === "email" || step === "signup") && (
                  <m.div
                    key={step}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <button
                      onClick={() => setStep("choose")}
                      className="flex items-center gap-2 text-primary text-xs font-bold mb-6 hover:underline"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                    <h2 className="text-3xl font-bold mb-2 text-white">
                      {step === "signup" ? "Create Account" : "Welcome Back"}
                    </h2>
                    <p className="text-muted text-sm mb-8">
                      {step === "signup" 
                        ? "Join LunchNow to start ordering." 
                        : "Sign in with your email and password."}
                    </p>

                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      {step === "signup" && (
                        <div className="space-y-2 mb-4">
                          <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">I am a</label>
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => setIntendedRole("customer")}
                              className={cn(
                                "flex-1 py-3 rounded-xl border font-bold transition-all",
                                intendedRole === "customer" 
                                  ? "bg-primary/10 border-primary text-primary" 
                                  : "bg-white/5 border-white/10 text-muted"
                              )}
                            >
                              Customer
                            </button>
                            <button
                              type="button"
                              onClick={() => setIntendedRole("vendor")}
                              className={cn(
                                "flex-1 py-3 rounded-xl border font-bold transition-all",
                                intendedRole === "vendor" 
                                  ? "bg-primary/10 border-primary text-primary" 
                                  : "bg-white/5 border-white/10 text-muted"
                              )}
                            >
                              Vendor
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-white/10 focus:border-primary/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-white placeholder:opacity-30"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-background border border-white/10 focus:border-primary/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-white placeholder:opacity-30"
                            required
                          />
                        </div>
                      </div>

                      {step === "email" && (
                        <div className="flex justify-end">
                          <button 
                            type="button"
                            onClick={() => setStep("forgot_password")}
                            className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      )}

                      {error && (
                        <p className="text-xs text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</p>
                      )}

                      <button
                        disabled={loading}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                          step === "signup" ? "Create Account" : "Sign In"
                        )}
                      </button>

                      <p className="text-center text-xs text-muted">
                        {step === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button 
                          type="button"
                          onClick={() => setStep(step === "signup" ? "email" : "signup")} 
                          className="text-primary font-bold hover:underline"
                        >
                          {step === "signup" ? "Sign In" : "Sign Up"}
                        </button>
                      </p>
                    </form>
                  </m.div>
                )}

                {/* ─── Step: Forgot Password ─── */}
                {step === "forgot_password" && (
                  <m.div
                    key="forgot"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <button
                      onClick={() => setStep("email")}
                      className="flex items-center gap-2 text-primary text-xs font-bold mb-6 hover:underline"
                    >
                      <ArrowLeft className="w-3 h-3" /> Back
                    </button>
                    <h2 className="text-3xl font-bold mb-2 text-white">Reset Password</h2>
                    <p className="text-muted text-sm mb-8">Enter your email to receive a reset link.</p>

                    <form onSubmit={handleForgotPassword} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                          <input
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-background border border-white/10 focus:border-primary/50 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all text-white placeholder:opacity-30"
                            required
                          />
                        </div>
                      </div>

                      {error && (
                        <p className="text-xs text-red-400 bg-red-400/10 p-3 rounded-xl border border-red-400/20">{error}</p>
                      )}

                      <button
                        disabled={loading || !email}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                      </button>
                    </form>
                  </m.div>
                )}

              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-white/3 p-6 text-center border-t border-white/5">
              <p className="text-[10px] text-muted leading-relaxed">
                By continuing, you agree to our{" "}
                <span className="text-white underline cursor-pointer">Terms of Service</span> and{" "}
                <span className="text-white underline cursor-pointer">Privacy Policy</span>.
              </p>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
