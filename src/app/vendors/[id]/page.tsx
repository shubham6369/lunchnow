"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Star, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  ShoppingBag,
  Info,
  ChevronDown,
  Plus,
  Minus,
  MessageCircle,
  Utensils,
  XCircle,
  ArrowRight,
  ChefHat
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import CartDrawer from "@/components/CartDrawer";
import LoginDialog from "@/components/LoginDialog";
import { cn } from "@/lib/utils";

import { getVendor } from "@/lib/firestore";

export default function VendorDetailPage({ params }: { params: { id: string } }) {
  const [vendor, setVendor] = useState<any>(null);
  const [dishes, setDishes] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"menu" | "reviews">("menu");
  const [loading, setLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const { addToCart, items, cartCount, cartTotal, updateQuantity } = useCart();
  const { user, logout } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    const fetchVendorData = async () => {
      setLoading(true);
      const id = params.id; // params is sync in Next.js App Router
      const { getVendorDishes, getVendorReviews } = await import("@/lib/firestore");
      const [vendorData, dishesData, reviewsData] = await Promise.all([
        getVendor(id),
        getVendorDishes(id),
        getVendorReviews(id)
      ]);
      setVendor(vendorData);
      setDishes(dishesData);
      setReviews(reviewsData);
      setLoading(false);
    };
    fetchVendorData();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-bold">Loading Kitchen...</h2>
        <p className="text-muted text-sm mt-2">Getting the best local flavors for you.</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-secondary/30 rounded-full flex items-center justify-center mb-6">
          <Utensils className="text-muted w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Kitchen Not Found</h2>
        <p className="text-muted text-sm mb-8">The kitchen you're looking for might have moved or closed.</p>
        <Link href="/vendors" className="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-glow">
          Explore Other Kitchens
        </Link>
      </div>
    );
  }

  const menuSections = vendor.menuSections || [];

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
       {/* Hero Section */}
       <header className="relative h-[45vh] w-full overflow-hidden">
        <Image 
          src={vendor.image} 
          alt={vendor.name} 
          fill 
          className="object-cover brightness-50"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent" />
        
        <nav className="absolute top-0 w-full z-10 px-6 h-20 flex items-center justify-between">
          <Link href="/vendors" className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 transition-all">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 transition-all relative"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-[10px] font-bold rounded-full flex items-center justify-center shadow-glow">
                  {cartCount}
                </span>
              )}
            </button>
            
            {user ? (
              <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5">
                <div className="hidden md:block text-right">
                  <div className="text-[10px] font-bold text-white">Verified</div>
                  <button onClick={() => logout()} className="text-[9px] text-primary font-bold hover:underline">Logout</button>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs">
                  {user.phoneNumber?.slice(-2) || "U"}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="px-6 py-3 bg-primary hover:bg-primary-dark rounded-full text-sm font-bold shadow-glow transition-all"
              >
                Login
              </button>
            )}
          </div>
        </nav>

        <div className="absolute bottom-0 w-full px-6 pb-12">
          <div className="max-w-7xl mx-auto">
            <m.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                {vendor.isPopular && (
                  <span className="px-3 py-1 bg-primary text-[10px] font-bold uppercase rounded-lg shadow-glow">Popular</span>
                )}
                <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 backdrop-blur-sm">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="text-xs font-bold">{vendor.rating || 4.5} ({vendor.totalReviewCount || 10}+)</span>
                </div>
                {!vendor.isOpen && (
                  <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-glow-red animate-pulse">
                    <Clock className="w-3 h-3" /> Kitchen Closed
                  </div>
                )}
              </div>
              <h1 className="text-5xl font-bold tracking-tight">{vendor.name}</h1>
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {vendor.location}</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {vendor.deliveryTime || "30-45 min"}</div>
                <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Verified Kitchen</div>
              </div>
            </m.div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex items-center gap-6 border-b border-white/10 pb-4">
          <button 
            onClick={() => setActiveTab("menu")}
            className={cn("text-lg font-bold transition-colors pb-4 -mb-[17px] border-b-2", activeTab === "menu" ? "text-primary border-primary" : "text-muted border-transparent hover:text-white")}
          >
            Menu
          </button>
          <button 
            onClick={() => setActiveTab("reviews")}
            className={cn("text-lg font-bold transition-colors pb-4 -mb-[17px] border-b-2", activeTab === "reviews" ? "text-primary border-primary" : "text-muted border-transparent hover:text-white")}
          >
            Reviews
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === "menu" ? (
            dishes.length === 0 ? (
              <div className="text-center py-20 bg-dark-card border border-dark-border rounded-2xl">
                <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No dishes available yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Featured Dishes</h2>
                <div className="grid gap-4">
                {dishes.map((dish, index) => (
                  <m.div
                    key={dish.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "bg-dark-card p-4 rounded-xl border border-dark-border flex gap-4 group transition-all",
                      !vendor.isOpen && "opacity-60 grayscale-[0.5]"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {dish.veg ? (
                          <span className="w-4 h-4 border-2 border-green-600 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 border-2 border-red-600 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                          </span>
                        )}
                        {dish.bestSeller && (
                          <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <Star className="w-3 h-3 fill-current" /> Bestseller
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg">{dish.name}</h3>
                      <p className="text-orange-500 font-bold mb-2">₹{dish.price}</p>
                      <p className="text-gray-400 text-sm line-clamp-2">{dish.description}</p>
                    </div>
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden shrink-0">
                      {dish.image && (
                        <img 
                          src={dish.image} 
                          alt={dish.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                        />
                      )}
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
                      <button 
                        disabled={!vendor.isOpen}
                        onClick={() => {
                          if (!vendor.isOpen) {
                            toast.error("Kitchen is currently offline and not accepting orders.");
                            return;
                          }
                          addToCart({
                            id: dish.id,
                            vendorId: params.id,
                            vendorName: vendor?.name || 'Vendor',
                            name: dish.name,
                            price: dish.price,
                            image: dish.image
                          });
                        }}
                        className={cn(
                          "absolute bottom-2 left-1/2 -translate-x-1/2 w-24 py-1 rounded shadow-lg transition-all font-bold flex items-center justify-center gap-2",
                          vendor.isOpen 
                            ? "bg-dark-surface border border-dark-border text-orange-500 hover:bg-orange-500 hover:text-white hover:border-orange-500" 
                            : "bg-white/5 border-white/5 text-muted cursor-not-allowed grayscale"
                        )}
                      >
                        {vendor.isOpen ? <Plus className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        {vendor.isOpen ? "ADD" : "OFFLINE"}
                      </button>
                    </div>
                  </m.div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Customer Reviews</h2>
            {reviews.length === 0 ? (
              <div className="text-center py-20 bg-dark-card border border-dark-border rounded-2xl">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No reviews yet. Be the first to review!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {reviews.map((review, idx) => (
                  <m.div
                    key={review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-dark-card p-6 rounded-xl border border-dark-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                          {review.userName ? review.userName.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-bold">{review.userName || "LunchNow User"}</p>
                          <p className="text-xs text-muted">
                            {review.createdAt ? new Date(review.createdAt.seconds * 1000).toLocaleDateString() : "Just now"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        <span className="font-bold">{review.rating}</span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-gray-300 text-sm leading-relaxed mt-2">{review.comment}</p>
                    )}
                  </m.div>
                ))}
              </div>
            )}
          </div>
        )}
        </div>

        {/* Sidebar Sticky Cart / Summary */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-8">
            <div className="bg-secondary/30 border border-white/10 rounded-[40px] p-8">
              <h3 className="text-xl font-bold mb-6">Your Lunch Plate</h3>
              {items.length === 0 ? (
                <div className="text-center py-12">
                   <ShoppingBag className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                   <p className="text-muted text-sm italic">Nothing yet! Add some Ghar-Jaisa items to start.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{item.name}</div>
                          <div className="text-[10px] text-muted">₹{item.price} × {item.quantity}</div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white/10 rounded"><Minus className="w-3 h-3"/></button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white/10 rounded"><Plus className="w-3 h-3"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-xs font-bold text-muted uppercase">Subtotal</span>
                    <span className="text-xl font-bold">₹{cartTotal}</span>
                  </div>
                  <button 
                    onClick={() => router.push('/checkout')}
                    className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-8 rounded-[40px] glass border border-[#25D366]/20 bg-[#25D366]/5">
              <h4 className="text-sm font-bold text-[#25D366] mb-4 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Need Help?
              </h4>
              <p className="text-xs text-muted leading-relaxed">
                Chat directly with {vendor.name} kitchen for custom requests or bulk orders.
              </p>
              <a 
                href={`https://wa.me/${vendor.whatsapp || '919999999999'}?text=Hi ${vendor.name}, I have a query about your menu.`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-full py-3 bg-[#25D366] text-white rounded-xl font-bold text-xs shadow-glow-green flex items-center justify-center gap-2"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </aside>
      </main>

      {/* Floating Mobile Cart */}
      <AnimatePresence>
        {cartCount > 0 && (
          <m.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 inset-x-6 z-50 lg:hidden"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full h-16 bg-primary text-white rounded-3xl shadow-glow px-8 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                 <div>
                   <div className="text-sm font-bold">{cartCount} Items Added</div>
                   <div className="text-[10px] text-white/70">From {vendor.name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 font-black text-lg">
                View Plate <ChevronDown className="w-4 h-4 -rotate-90" />
              </div>
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* Offline Banner */}
      {!vendor.isOpen && (
        <m.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-red-500 text-white py-4 px-6 z-50 flex items-center justify-center gap-4 shadow-[0_-10px_40px_rgba(239,68,68,0.3)]"
        >
          <div className="bg-white/20 p-2 rounded-full animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
          <p className="font-black uppercase tracking-widest text-sm text-center">
            This kitchen is currently offline. You can browse the menu but cannot place orders.
          </p>
        </m.div>
      )}
    </div>
  );
}
