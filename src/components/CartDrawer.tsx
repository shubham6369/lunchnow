"use client";

import React from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, MapPin, MessageCircle, DollarSign, Phone, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { createOrder } from "@/lib/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Script from "next/script";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeFromCart, cartTotal, cartCount, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  
  const [isCheckingOut, setIsCheckingOut] = React.useState(false);
  const [address, setAddress] = React.useState("");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<"online" | "cod">("cod");
  const [isPlacing, setIsPlacing] = React.useState(false);

  React.useEffect(() => {
    if (user?.phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
    if (user?.displayName) {
      setCustomerName(user.displayName);
    }
  }, [user]);

  const handleCheckout = async () => {
    if (!user) return;

    if (!isCheckingOut) {
      setIsCheckingOut(true);
      return;
    }

    if (!customerName.trim() || !address.trim() || !phoneNumber.trim()) {
      alert("Please provide name, delivery address and mobile number.");
      return;
    }

    setIsPlacing(true);
    try {
      if (paymentMethod === "online") {
        // Razorpay Flow
        const ordRes = await fetch("/api/razorpay/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: cartTotal }),
        });
        
        if (!ordRes.ok) throw new Error("Failed to create Razorpay order");
        const razorpayOrder = await ordRes.json();

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          name: "LunchNow",
          description: `Order from ${items[0].vendorName}`,
          order_id: razorpayOrder.id,
          handler: async function (response: any) {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.status === "ok") {
              const orderId = await createOrder({
                userId: user.uid,
                userName: customerName,
                vendorId: items[0].vendorId,
                items: items,
                total: cartTotal,
                address: address,
                phoneNumber: phoneNumber,
                status: "pending",
                paymentMethod: "online",
                paymentId: response.razorpay_payment_id
              });
              clearCart();
              onClose();
              router.push(`/orders/${orderId}`);
            } else {
              alert("Payment verification failed!");
            }
          },
          prefill: { contact: phoneNumber || user.phoneNumber || "", email: user.email || "", name: customerName || user.displayName || "" },
          theme: { color: "#E2B171" },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Cash on Delivery / Direct Order Flow
        const orderId = await createOrder({
          userId: user.uid,
          userName: customerName,
          vendorId: items[0].vendorId,
          items: items,
          total: cartTotal,
          address: address,
          phoneNumber: phoneNumber,
          status: "pending",
          paymentMethod: "cod"
        });
        clearCart();
        onClose();
        router.push(`/orders/${orderId}`);
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("Something went wrong with the checkout. Please try again.");
    } finally {
      setIsPlacing(false);
    }
  };

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) return;
    
    const vendorPhone = "919876543210"; // Placeholder for vendor's WhatsApp
    const itemList = items.map(item => `• ${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}`).join('\n');
    const message = `*New Order from LunchNow!*%0A%0A*Items:*%0A${itemList}%0A%0A*Total:* ₹${cartTotal}%0A%0A*Address:* ${address || 'Address not provided'}%0A%0A*Customer Name:* ${customerName || user?.displayName || 'Not provided'}%0A%0A*Customer Phone:* ${phoneNumber || user?.phoneNumber || 'Not provided'}`;
    
    window.open(`https://wa.me/${vendorPhone}?text=${message}`, "_blank");
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
          />

          {/* Drawer */}
          <m.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-secondary z-70 shadow-2xl border-l border-white/5 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Your Plate</h2>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-md">
                  {cartCount} Items
                </span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Cart is empty</h3>
                  <p className="text-xs">Add some delicious meals from kitchens nearby!</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-background/50 p-4 rounded-2xl border border-white/5">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="text-sm font-bold truncate">{item.name}</h4>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted mb-3 truncate">by {item.vendorName}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 bg-secondary p-1 rounded-lg border border-white/5">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:bg-white/5 rounded-md transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:bg-white/5 rounded-md transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-sm">₹{item.price * item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="p-6 bg-background/50 border-t border-white/5 space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Select Payment</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setPaymentMethod("online")}
                          className={`p-4 rounded-2xl border transition-all text-left ${paymentMethod === 'online' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-white/5 text-muted'}`}
                        >
                          <div className="text-[10px] font-bold uppercase mb-1">Online</div>
                          <div className="text-sm font-bold">Razorpay</div>
                        </button>
                        <button 
                          onClick={() => setPaymentMethod("cod")}
                          className={`p-4 rounded-2xl border transition-all text-left ${paymentMethod === 'cod' ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-white/5 text-muted'}`}
                        >
                          <div className="text-[10px] font-bold uppercase mb-1">Direct</div>
                          <div className="text-sm font-bold">Cash on Delivery</div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <User className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Full Name</span>
                      </div>
                      <input 
                        type="text"
                        placeholder="Enter your full name"
                        className="w-full bg-secondary border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Phone className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Mobile Number</span>
                      </div>
                      <input 
                        type="tel"
                        placeholder="Enter your 10-digit mobile number"
                        className="w-full bg-secondary border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-4 mb-4">
                      <div className="flex items-center gap-2 text-primary">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Delivery Address</span>
                      </div>
                      <textarea 
                        placeholder="Enter your full address (flat no, building, landmark...)"
                        className="w-full h-24 bg-secondary border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Subtotal</span>
                    <span className="font-medium">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Delivery Fee</span>
                    <span className="text-primary font-bold">FREE</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/5">
                    <span>Total Amount</span>
                    <span className="text-primary tracking-tight">₹{cartTotal}</span>
                  </div>
                </div>

                {!user ? (
                  <button 
                    disabled
                    className="w-full py-4 bg-white/5 text-muted cursor-not-allowed rounded-2xl font-bold"
                  >
                    Please login to checkout
                  </button>
                ) : (
                  <button 
                    onClick={handleCheckout}
                    disabled={isPlacing || (isCheckingOut && (!customerName.trim() || !address.trim() || !phoneNumber.trim()))}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 group shadow-glow hover:bg-primary-dark transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {isPlacing ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : isCheckingOut ? (
                      "Confirm Order"
                    ) : (
                      "Proceed to Checkout"
                    )}
                    {!isPlacing && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>
                )}

                {items.length > 0 && user && (
                  <button 
                    onClick={handleWhatsAppCheckout}
                    className="w-full py-4 border border-emerald-500/20 text-emerald-500 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/5 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Order on WhatsApp
                  </button>
                )}
                
                {isCheckingOut && (
                  <button 
                    onClick={() => setIsCheckingOut(false)}
                    className="w-full text-center text-xs text-muted hover:text-white transition-colors"
                  >
                    Modify items in cart
                  </button>
                )}
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
