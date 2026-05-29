"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { 
  ShoppingBag, 
  MapPin, 
  CreditCard, 
  ChevronRight, 
  CheckCircle2, 
  Clock,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Smartphone,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createOrder } from "@/lib/firestore";
import Link from "next/link";

export default function CheckoutPage() {
  const { items, cartTotal, clearCart } = useCart();
  const { user, profile, updateProfile } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1); // 1: Cart, 2: Address, 3: Payment
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "COD">("UPI");

  // Form Details States
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Prefill details from profile/auth
  React.useEffect(() => {
    if (profile) {
      setCustomerName(prev => prev || profile.displayName || user?.displayName || "");
      setCustomerPhone(prev => prev || profile.phoneNumber || user?.phoneNumber || "");
      setDeliveryAddress(prev => prev || profile.address || "");
    } else if (user) {
      setCustomerName(prev => prev || user.displayName || "");
      setCustomerPhone(prev => prev || user.phoneNumber || "");
    }
  }, [user, profile]);

  const deliveryFee = 25;
  const platformFee = 5;
  const gst = Math.round(cartTotal * 0.05);
  const totalAmount = cartTotal + deliveryFee + platformFee + gst;

  const handlePlaceOrder = async () => {
    if (!user) {
      alert("Please login to place an order");
      return;
    }

    setIsProcessing(true);
    
    // Sync details back to profile if changed or missing
    if (updateProfile) {
      updateProfile({
        displayName: customerName,
        phoneNumber: customerPhone,
        address: deliveryAddress
      }).catch(err => console.error("Failed to sync checkout profile:", err));
    }
    
    try {
      if (paymentMethod === "COD") {
        const newOrder = {
          userId: user.uid,
          userName: customerName || user.displayName || "Customer",
          phoneNumber: customerPhone || user.phoneNumber || "",
          vendorId: items[0].vendorId,
          vendorName: items[0].vendorName,
          items: items,
          total: totalAmount,
          subtotal: cartTotal,
          tax: gst,
          deliveryFee,
          platformFee,
          status: "pending",
          paymentStatus: "pending",
          address: deliveryAddress,
          paymentMethod: "COD",
        };

        const id = await createOrder(newOrder);
        setOrderId(id);
        clearCart();
        router.push(`/checkout/success?orderId=${id}`);
        return;
      }

      // 1. Create Razorpay Order via API
      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount }),
      });
      
      const razorpayOrder = await res.json();
      
      if (!razorpayOrder.id) {
        throw new Error("Failed to create Razorpay order");
      }

      // 2. Configure Razorpay Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder", 
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "LunchNow",
        description: "Premium Meal Order",
        order_id: razorpayOrder.id,
        handler: async function (response: any) {
          try {
            // 3. Verify payment on server
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: razorpayOrder.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            
            const verifyData = await verifyRes.json();
            
            if (verifyData.status !== "ok") {
              throw new Error("Payment verification failed");
            }

            // 4. Finalize order in Firestore
            const newOrder = {
              userId: user.uid,
              userName: customerName || user.displayName || "Customer",
              phoneNumber: customerPhone || user.phoneNumber || "",
              vendorId: items[0].vendorId,
              vendorName: items[0].vendorName,
              items: items,
              total: totalAmount,
              subtotal: cartTotal,
              tax: gst,
              deliveryFee,
              platformFee,
              status: "pending",
              paymentStatus: "paid",
              razorpayOrderId: razorpayOrder.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              address: deliveryAddress,
              paymentMethod: "UPI",
            };

            const id = await createOrder(newOrder);
            setOrderId(id);
            clearCart();
            router.push(`/checkout/success?orderId=${id}`);
          } catch (err) {
            console.error("Verification/Creation failed:", err);
            alert("Payment verified but order creation failed. Please contact support.");
          }
        },
        prefill: {
          name: customerName || user.displayName || "",
          email: user.email || "",
          contact: customerPhone || user.phoneNumber || "",
        },
        theme: {
          color: "#EAB308",
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Order failed:", error);
      alert("Something went wrong while placing your order.");
      setIsProcessing(false);
    }
  };

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-10 h-10 text-muted" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-muted mb-8 text-center max-w-xs">Looks like you haven&apos;t added any delicious home-cooked meals yet.</p>
        <Link href="/" className="px-8 py-3 bg-primary text-black font-bold rounded-xl hover:scale-105 transition-all">
          Browse Kitchens
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        
        <AnimatePresence mode="wait">
          {!orderComplete ? (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column: Checkout Steps */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-3xl font-bold">Secure Checkout</h1>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-white/5">
                  {[1, 2, 3].map((i) => (
                    <React.Fragment key={i}>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                        step >= i ? "bg-primary text-black" : "bg-white/10 text-muted"
                      )}>
                        {i}
                      </div>
                      {i < 3 && <div className={cn("h-px flex-1", step > i ? "bg-primary" : "bg-white/10")} />}
                    </React.Fragment>
                  ))}
                </div>

                {/* Step Content */}
                <m.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {step === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        Order Summary
                      </h3>
                      <div className="bg-secondary/40 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                        {items.map((item) => (
                          <div key={item.id} className="p-4 flex items-center justify-between">
                            <div className="flex gap-4">
                              <div className="w-16 h-16 bg-white/5 rounded-xl overflow-hidden">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h4 className="font-bold text-sm">{item.name}</h4>
                                <p className="text-xs text-muted">qty: {item.quantity}</p>
                              </div>
                            </div>
                            <p className="font-bold">₹{item.price * item.quantity}</p>
                          </div>
                        ))}
                      </div>
                      <button 
                        onClick={() => setStep(2)}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all mt-4"
                      >
                        Add Delivery Address
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-primary" />
                        Delivery Details
                      </h3>
                      
                      <div className="space-y-4 bg-secondary/20 border border-white/5 p-6 rounded-[28px]">
                        {/* Name Field */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted tracking-widest uppercase ml-1">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                              type="text"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Enter your full name"
                              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-all text-white placeholder:text-white/20"
                              required
                            />
                          </div>
                        </div>

                        {/* Phone Field */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted tracking-widest uppercase ml-1">Phone Number</label>
                          <div className="relative">
                            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                            <input
                              type="tel"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="10-digit mobile number"
                              className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-all text-white placeholder:text-white/20"
                              required
                            />
                          </div>
                        </div>

                        {/* Address Field */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted tracking-widest uppercase ml-1">Delivery Address</label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-4 w-4 h-4 text-muted" />
                            <textarea
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              placeholder="House/Flat No., Street, Landmark..."
                              className="w-full pl-12 pr-4 py-4 h-24 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-all text-white placeholder:text-white/20 resize-none"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <button 
                        disabled={!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()}
                        onClick={() => setStep(3)}
                        className={cn(
                          "w-full py-4 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-glow",
                          (customerName.trim() && customerPhone.trim() && deliveryAddress.trim())
                            ? "bg-primary text-black hover:scale-[1.02]" 
                            : "bg-white/5 border border-white/10 text-muted cursor-not-allowed"
                        )}
                      >
                        Proceed to Payment
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        Payment Method
                      </h3>
                      <div className="space-y-3">
                        <div 
                          onClick={() => setPaymentMethod("UPI")}
                          className={cn(
                            "p-4 rounded-2xl flex items-center justify-between cursor-pointer group transition-all",
                            paymentMethod === "UPI" ? "bg-primary/10 border-2 border-primary" : "bg-secondary/40 border border-white/10 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <Smartphone className="w-6 h-6 text-primary" />
                            <div>
                              <p className="font-bold">Google Pay / PhonePe</p>
                              <p className="text-[10px] text-muted">Pay securely with UPI</p>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            paymentMethod === "UPI" ? "border-primary" : "border-white/20"
                          )}>
                            {paymentMethod === "UPI" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                        </div>

                        <div 
                          onClick={() => setPaymentMethod("COD")}
                          className={cn(
                            "p-4 rounded-2xl flex items-center justify-between cursor-pointer group transition-all",
                            paymentMethod === "COD" ? "bg-primary/10 border-2 border-primary" : "bg-secondary/40 border border-white/10 hover:border-white/20"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <Truck className="w-6 h-6 text-primary" />
                            <div>
                              <p className="font-bold">Cash on Delivery</p>
                              <p className="text-[10px] text-muted">Pay when you receive</p>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            paymentMethod === "COD" ? "border-primary" : "border-white/20"
                          )}>
                            {paymentMethod === "COD" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </div>
                        </div>
                        <div className="bg-secondary/20 border border-white/5 opacity-50 p-4 rounded-2xl flex items-center justify-between grayscale">
                          <div className="flex items-center gap-4">
                            <CreditCard className="w-6 h-6" />
                            <p className="font-bold">Credit / Debit Card</p>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        disabled={isProcessing}
                        onClick={handlePlaceOrder}
                        className={cn(
                          "w-full py-5 bg-primary text-black font-black rounded-3xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest relative overflow-hidden",
                          isProcessing && "opacity-80 scale-95"
                        )}
                      >
                        {isProcessing ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <>
                            {paymentMethod === "UPI" ? <ShieldCheck className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                            {paymentMethod === "UPI" ? `Pay ₹${totalAmount}` : `Order COD ₹${totalAmount}`}
                          </>
                        )}
                      </button>
                      <p className="text-center text-[10px] text-muted tracking-wide uppercase">
                        Encrypted by 256-bit SSL Security
                      </p>
                    </div>
                  )}
                </m.div>
              </div>

              {/* Right Column: Billing Stats */}
              <div className="space-y-6">
                <div className="bg-secondary/40 border border-white/5 p-6 rounded-[32px] space-y-6">
                  <h3 className="text-xl font-bold">Bill Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm text-muted">
                      <span>Item Total</span>
                      <span>₹{cartTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>Delivery Partner Fee</span>
                      <span>₹{deliveryFee}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>Platform Fee</span>
                      <span>₹{platformFee}</span>
                    </div>
                    <div className="flex justify-between text-sm text-muted">
                      <span>GST & Restaurant Charges</span>
                      <span>₹{gst}</span>
                    </div>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>To Pay</span>
                    <span className="text-primary">₹{totalAmount}</span>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 p-6 rounded-[32px] flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Delivering to</p>
                    <p className="text-sm font-bold truncate">{deliveryAddress || "No address entered"}</p>
                    <p className="text-[10px] text-muted mt-0.5">ESTIMATED DELIVERY: 25 MINS</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Order Success State */
            <m.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-glow-emerald">
                <CheckCircle2 className="w-12 h-12 text-black" />
              </div>
              <h2 className="text-5xl font-bold mb-4">Order Placed!</h2>
              <p className="text-xl text-muted mb-8 max-w-sm">
                Your meal from <span className="text-white font-bold">{items[0]?.vendorName}</span> is being prepared.
              </p>
              
              <div className="bg-secondary/40 border border-white/5 p-8 rounded-[40px] mb-12 flex gap-12 text-left">
                <div>
                  <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Order ID</div>
                  <div className="font-mono font-bold">#{orderId.slice(-8).toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Estimate</div>
                  <div className="flex items-center gap-2 font-bold">
                    <Clock className="w-4 h-4 text-primary" />
                    25 Mins
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => router.push(`/orders/${orderId}`)}
                  className="px-8 py-4 bg-primary text-black font-bold rounded-2xl shadow-glow"
                >
                  Track Live Order
                </button>
                <Link href="/" className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold">
                  Go Back Home
                </Link>
              </div>
            </m.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
