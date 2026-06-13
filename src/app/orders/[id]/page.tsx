"use client";

import React, { useEffect, useState } from "react";
import { m } from "framer-motion";
import { 
  CheckCircle2, 
  ChefHat, 
  Truck, 
  Package, 
  ArrowLeft,
  Phone,
  MapPin,
  Clock,
  Star,
  MessageCircle,
  Navigation,
  Compass
} from "lucide-react";
import Link from "next/link";
import { getOrder } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ReviewModal from "@/components/ReviewModal";

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const { user } = useAuth();
  const resolvedParams = React.use(params);

  useEffect(() => {
    // Real-time listener for the specific order
    const orderRef = doc(db, "orders", resolvedParams.id);
    const unsubscribe = onSnapshot(orderRef, (docSnap) => {
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        setOrder(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <Link href="/" className="text-primary font-bold">Back to Home</Link>
      </div>
    );
  }

  const steps = [
    { status: "pending", label: "Confirmed", icon: CheckCircle2, description: "Your order is confirmed" },
    { status: "preparing", label: "Cooking", icon: ChefHat, description: "Chef is preparing your meal" },
    { status: "out_for_delivery", label: "Delivery", icon: Truck, description: "Delivery partner is on the way" },
    { status: "delivered", label: "Delivered", icon: Package, description: "Enjoy your fresh meal!" },
  ];

  const currentStepIndex = steps.findIndex(s => s.status === order.status);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Header */}
      <div className="p-6 flex items-center gap-4 bg-secondary/50 backdrop-blur-md sticky top-0 z-10 border-b border-white/5">
        <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Track Order</h1>
          <p className="text-xs text-muted">ID: #{order.id.slice(-6).toUpperCase()}</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-6 space-y-8">
        {/* Live Tracking Map (Simulated Premium Map) */}
        <div className="bg-secondary rounded-[40px] overflow-hidden border border-white/5 shadow-2xl relative">
          <div className="h-64 relative bg-[#151515] overflow-hidden">
            {/* Map Grid Pattern */}
            <div className="absolute inset-0 opacity-20" style={{ 
              backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} />
            
            {/* Simulated Roads */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -rotate-12" />
            <div className="absolute top-0 left-1/3 w-1 h-full bg-white/5 rotate-6" />
            <div className="absolute bottom-1/4 left-0 w-full h-1 bg-white/5 rotate-3" />

            {/* Pulsing Destination Pin */}
            <div className="absolute top-1/3 right-1/4 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/40 rounded-full animate-ping scale-150" />
                <div className="bg-primary p-2 rounded-full shadow-glow">
                  <MapPin className="w-5 h-5 text-black" />
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                  <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Your Home</span>
                </div>
              </div>
            </div>

            {/* Delivery Partner - Animated if Out for Delivery */}
            <m.div 
              initial={{ left: "10%", top: "60%" }}
              animate={order.status === 'out_for_delivery' ? { 
                left: ["10%", "40%", "45%", "60%"],
                top: ["60%", "50%", "55%", "40%"]
              } : {}}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute z-20"
            >
              <div className="relative">
                <div className="bg-white p-2 rounded-full shadow-premium border-2 border-primary">
                  <Truck className="w-4 h-4 text-black" />
                </div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary px-2 py-1 rounded-md shadow-glow">
                  <span className="text-[10px] font-bold text-black uppercase tracking-tighter">Delivery Partner</span>
                </div>
                {/* Direction Pointer */}
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 rotate-90 text-primary">
                  <Navigation className="w-3 h-3 fill-current" />
                </div>
              </div>
            </m.div>

            {/* Vendor Pin */}
            <div className="absolute bottom-1/4 left-1/4 z-10">
              <div className="bg-secondary p-2 rounded-full border border-white/20 shadow-xl">
                <ChefHat className="w-4 h-4 text-primary" />
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[9px] font-bold text-muted uppercase tracking-tighter">Kitchen</span>
              </div>
            </div>

            {/* Map Overlay Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button className="p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 hover:bg-black/80 transition-all">
                <Compass className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Order Status Badge on Map */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                  {order.status === 'pending' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  {order.status === 'preparing' && <ChefHat className="w-4 h-4 text-primary" />}
                  {order.status === 'out_for_delivery' && <Truck className="w-4 h-4 text-primary" />}
                  {order.status === 'delivered' && <Package className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Current Status</p>
                  <p className="text-sm font-bold text-white capitalize">{order.status.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest">ETA</p>
                <p className="text-sm font-bold text-primary">12-15 Mins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Stepper */}
        <div className="bg-secondary p-8 rounded-3xl border border-white/5 shadow-xl">
          <div className="relative space-y-8">
            {steps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const StepIcon = step.icon;

              return (
                <div key={step.status} className="flex gap-6 relative">
                  {/* Line */}
                  {index < steps.length - 1 && (
                    <div className={`absolute left-5 top-10 w-0.5 h-10 ${index < currentStepIndex ? "bg-primary" : "bg-white/10"}`} />
                  )}
                  
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 
                    ${isActive ? "bg-primary shadow-glow" : "bg-white/5 border border-white/10 text-muted"}`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={`font-bold ${isActive ? "text-white" : "text-muted"}`}>{step.label}</h3>
                    <p className="text-xs text-muted">{step.description}</p>
                    {isCurrent && (
                      <m.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 text-[10px] py-1 px-2 bg-primary/20 text-primary rounded-md inline-block font-bold uppercase tracking-wider"
                      >
                        In Progress
                      </m.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-secondary p-6 rounded-3xl border border-white/5 space-y-6">
          <h3 className="font-bold border-b border-white/5 pb-4">Order Summary</h3>
          <div className="space-y-4">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <span className="text-xs font-bold text-primary">x{item.quantity}</span>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-bold">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="font-bold">Total Paid</span>
            <span className="text-xl font-bold text-primary">₹{order.total}</span>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-secondary p-6 rounded-3xl border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Delivery Address</span>
            </div>
            <p className="text-sm font-medium leading-relaxed">{order.address}</p>
          </div>
          <div className="bg-secondary p-6 rounded-3xl border border-white/5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Estimated Time</span>
            </div>
            <p className="text-sm font-medium">Delivering in 25-30 mins</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 pt-4">
          {order.status === 'delivered' && !order.isReviewed && (
            <button 
              onClick={() => setIsReviewModalOpen(true)}
              className="w-full py-4 bg-primary text-black rounded-2xl font-bold flex items-center justify-center gap-2 shadow-glow hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              <Star className="w-5 h-5 fill-current" />
              Rate Your Meal
            </button>
          )}
          
          <div className="flex gap-4">
            <a 
              href={`https://wa.me/919999999999?text=Support needed for Order ${order.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
            >
              <MessageCircle className="w-4 h-4" />
              Support
            </a>
            <button className="flex-1 py-4 bg-secondary text-white border border-white/5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/5 transition-all">
              Share Status
            </button>
          </div>
        </div>
      </div>

      <ReviewModal 
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        orderId={order.id}
        vendorId={order.vendorId}
        vendorName={order.vendorName || "the Kitchen"}
        onSuccess={() => setOrder({ ...order, isReviewed: true })}
      />
    </div>
  );
}
