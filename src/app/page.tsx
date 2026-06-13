"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { m } from "framer-motion";
import { 
  ShoppingBag, 
  ArrowRight, 
  Star, 
  Clock, 
  ShieldCheck, 
  MessageCircle,
  Search,
  Utensils,
  ChefHat,
  MapPin,
  Rocket,
  Pizza,
  Triangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import CartDrawer from "@/components/CartDrawer";
import LoginDialog from "@/components/LoginDialog";
import { useState, useEffect } from "react";
import { getVendors, getAllDishes } from "@/lib/firestore";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentChange
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import DishCard from "@/components/DishCard";

const DISH_FILTERS = ["All", "Veg", "Non-Veg"];
const PRICE_FILTERS = ["All", "Under ₹100", "₹100 - ₹200", "₹200+"];

export default function HomePage() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Vendors
  const [vendors, setVendors] = useState<any[]>([]);

  // Dishes
  const [dishes, setDishes] = useState<any[]>([]);
  const [filteredDishes, setFilteredDishes] = useState<any[]>([]);
  const [dishSearch, setDishSearch] = useState("");
  const [dishFilter, setDishFilter] = useState("All");
  const [priceFilter, setPriceFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [loadingDishes, setLoadingDishes] = useState(true);

  // Live Stats
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [latestActivity, setLatestActivity] = useState<string | null>(null);

  const { cartCount } = useCart();
  const { user } = useAuth();

  // Fetch vendors, dishes, and live stats in real-time
  useEffect(() => {
    // 1. Listen to all vendors — filter client-side to avoid missing index errors
    const vendorsQuery = query(collection(db, "vendors"));

    const unsubVendors = onSnapshot(vendorsQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs
        .map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() }))
        .filter((v: any) => !v.status || v.status === "active"); // show all if no status field
      setVendors(data);
    }, (error: Error) => {
      console.error("Vendors listener error:", error);
    });

    // 2. Listen to all dishes (using collectionGroup) — filter client-side to avoid missing index errors
    let unsubDishes = () => {};
    import("firebase/firestore").then(({ collectionGroup }) => {
      const dishesQuery = query(collectionGroup(db, 'dishes'));

      unsubDishes = onSnapshot(dishesQuery, (snapshot: QuerySnapshot<DocumentData>) => {
        const data = snapshot.docs
          .map((doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            vendorId: doc.ref.parent.parent?.id || "",
            ...doc.data()
          }))
          .filter((d: any) => d.isAvailable !== false); // client-side filter
          
        setDishes(data);
        setFilteredDishes(data);
        setLoadingDishes(false);
      }, (error: Error) => {
        console.error("Dishes listener error:", error);
        setLoadingDishes(false);
      });
    });

    // 3. Listen to Live User Count (Users collection is typically smaller)
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot: QuerySnapshot<DocumentData>) => {
      setTotalUsers(snapshot.size);
    });

    // 4. Live Orders and Recent Activity (Optimized)
    let isInitialLoad = true;
    
    // Get initial total count once
    import("firebase/firestore").then(({ getCountFromServer }) => {
      getCountFromServer(collection(db, "orders")).then((snap) => {
        setTotalOrders(Number(snap.data().count));
      });
    });

    // Listen for NEW orders only for activity notification and count increments
    const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(1));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      if (isInitialLoad) {
        isInitialLoad = false;
        return;
      }

      // Handle new activity notification and increment total
      snapshot.docChanges().forEach((change: DocumentChange<DocumentData>) => {
        if (change.type === "added") {
          const order = change.doc.data();
          setTotalOrders((prev: number) => prev + 1); // Increment count locally
          
          if (order.vendorName) {
            setLatestActivity(`Someone just ordered from ${order.vendorName}!`);
            setTimeout(() => setLatestActivity(null), 5000);
          }
        }
      });
    });

    return () => {
      unsubVendors();
      unsubDishes();
      unsubUsers();
      unsubOrders();
    };
  }, []);

  // Enrich dishes with vendor names once both are loaded
  useEffect(() => {
    if (!vendors.length || !dishes.length) return;
    const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v.name]));
    // Instead of directly mutating the array inside setDishes with the same data,
    // we only update if there's a missing vendorName to avoid infinite loops
    let updated = false;
    const enrichedDishes = dishes.map(d => {
      if (d.vendorName !== vendorMap[d.vendorId] && vendorMap[d.vendorId]) {
        updated = true;
        return { ...d, vendorName: vendorMap[d.vendorId] };
      }
      return d;
    });

    if (updated) {
      setDishes(enrichedDishes);
      // Re-apply current filters
      let result = enrichedDishes;
      if (dishFilter === "Veg") result = result.filter((d: any) => d.isVeg === true);
      if (dishFilter === "Non-Veg") result = result.filter((d: any) => d.isVeg === false);
      if (dishSearch) {
        const q = dishSearch.toLowerCase();
        result = result.filter((d: any) =>
          d.name?.toLowerCase().includes(q) ||
          d.category?.toLowerCase().includes(q) ||
          d.vendorName?.toLowerCase().includes(q)
        );
      }
      
      // Apply Price Filter
      if (priceFilter === "Under ₹100") result = result.filter((d: any) => d.price < 100);
      else if (priceFilter === "₹100 - ₹200") result = result.filter((d: any) => d.price >= 100 && d.price <= 200);
      else if (priceFilter === "₹200+") result = result.filter((d: any) => d.price > 200);

      setFilteredDishes(result);
    }
  }, [vendors, dishes, dishFilter, dishSearch, priceFilter]);


  // Filter dishes
  useEffect(() => {
    let result = dishes;
    if (dishFilter === "Veg") result = result.filter(d => d.isVeg === true);
    if (dishFilter === "Non-Veg") result = result.filter(d => d.isVeg === false);
    if (dishSearch) {
      const q = dishSearch.toLowerCase();
      result = result.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.vendorName?.toLowerCase().includes(q)
      );
    }

    // Apply Price Filter
    if (priceFilter === "Under ₹100") result = result.filter(d => d.price < 100);
    else if (priceFilter === "₹100 - ₹200") result = result.filter(d => d.price >= 100 && d.price <= 200);
    else if (priceFilter === "₹200+") result = result.filter(d => d.price > 200);

    setFilteredDishes(result);
  }, [dishSearch, dishFilter, dishes, priceFilter]);

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">

      {/* ─── Hero Section ────────────────────────────────── */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_center,rgba(255,87,34,0.08)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <m.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-white mb-6">
              <span className="text-primary font-black">PROUDLY</span> MARIYAHU KA APNA RESTAURANT
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight uppercase mb-6 text-white">
              MARIYAHU <br />
              <span className="text-primary block">KA APNA TASTE</span>
            </h1>
            <div className="inline-block bg-primary text-white text-xs md:text-sm font-extrabold px-5 py-2.5 rounded-md uppercase tracking-wider mb-8">
              ALL TYPE FAST FOOD, DELIVERED FAST
            </div>
            
            {/* Food items bar */}
            <div className="flex flex-wrap gap-2.5 mb-10">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/90 uppercase">
                <Triangle className="w-3 h-3 text-primary fill-primary" /> SAMOSA
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/90 uppercase">
                <Pizza className="w-3 h-3 text-primary" /> PIZZA
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/90 uppercase">
                <Utensils className="w-3 h-3 text-primary" /> BURGER
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/90 uppercase">
                <Utensils className="w-3 h-3 text-primary" /> MOMOS
              </span>
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-orange-400 uppercase">
                & MANY MORE!
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-b border-white/10 py-6 mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-white uppercase tracking-wider">Fast Delivery</div>
                  <div className="text-[10px] text-muted">AT YOUR DOORSTEP</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-white uppercase tracking-wider">Hygienic Food</div>
                  <div className="text-[10px] text-muted">SAFE & FRESH</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ChefHat className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-white uppercase tracking-wider">Verified Kitchens</div>
                  <div className="text-[10px] text-muted">TRUSTED BY LOCALS</div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <Link href="/vendors" className="px-8 py-3 bg-primary hover:bg-primary-dark rounded-full font-black flex flex-col items-center justify-center leading-tight transition-all shadow-[0_8px_25px_rgba(255,87,34,0.3)] hover:shadow-[0_12px_30px_rgba(255,87,34,0.5)] group">
                <span className="text-white text-base">ORDER NOW</span>
                <span className="text-[9px] text-white/80 font-bold uppercase">ON LUNCHNOW</span>
              </Link>
              <a href="https://wa.me/919278106948" target="_blank" className="px-8 py-3.5 bg-transparent border-2 border-[#25D366] hover:bg-[#25D366]/5 rounded-full font-black flex items-center justify-center gap-2.5 text-white transition-all">
                <MessageCircle className="w-5 h-5 text-[#25D366] fill-[#25D366]/10" />
                <div className="text-left leading-tight">
                  <div className="text-sm font-black">ORDER ON WHATSAPP</div>
                  <div className="text-[9px] text-[#25D366] font-bold">QUICK & EASY</div>
                </div>
              </a>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-xl max-w-md">
              <MapPin className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <div className="font-extrabold text-xs text-white uppercase tracking-wider">DELIVERING ALL OVER MARIYAHU</div>
                <div className="text-[10px] text-muted">YOUR CITY, YOUR FOOD</div>
              </div>
            </div>
          </m.div>

          <m.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative z-10 rounded-[40px] overflow-hidden border border-white/10 shadow-premium aspect-square bg-secondary/50">
              <Image 
                src="/images/hero.png" 
                alt="Mariyahu Ka Apna Taste Food Showcase" 
                width={800} 
                height={800}
                className="w-full h-full object-cover"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" />
            </div>
            
            <m.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-[#0c0c0c] border-[3px] border-double border-primary flex flex-col items-center justify-center text-center p-2 shadow-2xl z-20"
            >
              <span className="text-[8px] font-bold text-white/70 tracking-wider">LOCAL CHEFS</span>
              <span className="text-xs font-black text-primary my-0.5">BEST TASTE</span>
              <span className="text-[7px] font-bold text-white/50">HYGIENIC & SAFE</span>
              <div className="text-[7px] text-[#ffbc00] mt-0.5 font-bold">★★★★★</div>
            </m.div>
          </m.div>
        </div>
      </section>

      {/* ─── Top Rated Kitchens ────────────────────────────── */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Verified <span className="text-primary">Kitchens</span></h2>
              <p className="text-muted text-sm uppercase tracking-widest font-bold">Handpicked local chefs around you</p>
            </div>
            <Link href="/vendors" className="text-primary hover:text-primary-dark font-bold text-sm flex items-center gap-1 group transition-all">
              View All Kitchens <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vendors.slice(0, 3).map((vendor) => (
              <Link 
                key={vendor.id} 
                href={`/vendors/${vendor.id}`}
                className="group relative h-64 rounded-[40px] overflow-hidden border border-white/5 bg-secondary shadow-xl hover:scale-[1.02] transition-all duration-500"
              >
                <img 
                  src={vendor.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80"} 
                  alt={vendor.name} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded-full">
                      {vendor.rating || "5.0"} <Star className="w-2.5 h-2.5 inline-block ml-1 fill-current" />
                    </span>
                    <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-bold uppercase rounded-full backdrop-blur-md">
                      {vendor.openingTime} - {vendor.closingTime}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-primary transition-colors">{vendor.name}</h3>
                  <p className="text-gray-400 text-sm line-clamp-1">{vendor.description || vendor.cuisines?.join(", ")}</p>
                </div>
              </Link>
            ))}
            {vendors.length === 0 && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-64 rounded-[40px] bg-secondary/30 border border-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </section>


      {/* ─── All Dishes Section ──────────────────────────── */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                <ChefHat className="w-3 h-3" />
                Fresh From Our Kitchens
              </div>
              <h2 className="text-4xl font-bold text-white">
                All <span className="text-primary">Dishes</span>
              </h2>
              <p className="text-muted mt-2 text-sm">
                {loadingDishes ? "Loading..." : `${filteredDishes.length} dishes available right now`}
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Veg filter pills */}
              <div className="flex gap-2">
                {DISH_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setDishFilter(f)}
                    className={cn(
                      "px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border whitespace-nowrap active:scale-95",
                      dishFilter === f
                        ? "bg-linear-to-r from-primary to-orange-600 text-white border-transparent shadow-[0_8px_20px_-5px_rgba(249,115,22,0.4)]"
                        : "bg-white/5 text-muted border-white/5 hover:bg-white/10 hover:border-white/10"
                    )}
                  >
                    {f === "Veg" && <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
                    {f === "Non-Veg" && <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />}
                    {f}
                  </button>
                ))}
              </div>

              {/* Price filter pills */}
              <div className="flex gap-2">
                {PRICE_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setPriceFilter(f)}
                    className={cn(
                      "px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border whitespace-nowrap active:scale-95",
                      priceFilter === f
                        ? "bg-linear-to-r from-emerald-500 to-teal-600 text-white border-transparent shadow-[0_8px_20px_-5px_rgba(16,185,129,0.4)]"
                        : "bg-white/5 text-muted border-white/5 hover:bg-white/10 hover:border-white/10"
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  value={dishSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDishSearch(e.target.value)}
                  placeholder="Search dishes..."
                  className="pl-11 pr-5 py-2.5 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-primary/50 transition-all text-sm w-52 text-white"
                />
              </div>
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {loadingDishes ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="bg-secondary/30 border border-white/5 rounded-[28px] overflow-hidden animate-pulse">
                  <div className="h-44 bg-white/5" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : filteredDishes.length > 0 ? (
              filteredDishes.map((dish: any) => (
                <DishCard
                  key={`${dish.vendorId}-${dish.id}`}
                  id={dish.id}
                  vendorId={dish.vendorId}
                  name={dish.name}
                  price={dish.price}
                  image={dish.image}
                  category={dish.category}
                  isVeg={dish.isVeg}
                  vendorName={dish.vendorName}
                  isAvailable={dish.isAvailable !== false}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <Utensils className="w-12 h-12 text-muted mx-auto mb-4 opacity-30" />
                <h3 className="text-xl font-bold mb-2 text-white">No dishes found</h3>
                <p className="text-muted text-sm">
                  {dishSearch ? "Try a different search term." : "No dishes available right now. Check back soon!"}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>



      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <LoginDialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* Live Activity Notification */}
      {latestActivity && (
        <div className="fixed bottom-24 left-6 z-50 animate-slide-up">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm group hover:scale-105 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">
              🔥
            </div>
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest text-orange-400 font-bold mb-0.5">Live Activity</p>
              <p className="text-xs text-white font-medium leading-tight">
                {latestActivity}
              </p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          </div>
        </div>
      )}
    </main>
  );
}
