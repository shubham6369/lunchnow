"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Store, 
  ShoppingBag, 
  DollarSign, 
  TrendingUp, 
  Search,
  Activity,
  Trash2,
  Star,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  MapPin as MapPinIcon,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { collection, onSnapshot, query, orderBy, limit, collectionGroup } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0,
    activeVendors: 0,
    totalOrders: 0,
    totalRevenue: 0
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [dishesList, setDishesList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasPermissionError, setHasPermissionError] = useState(false);

  // Check for master auth on mount
  useEffect(() => {
    const isAuth = sessionStorage.getItem("master_admin_auth") === "true";
    if (isAuth) setIsMasterAuthenticated(true);
  }, []);

  const handleMasterLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    // Use the password provided by user: admin123
    if (adminPassword === "admin123") {
      sessionStorage.setItem("master_admin_auth", "true");
      setIsMasterAuthenticated(true);
      toast.success("Master Admin Authenticated");
    } else {
      toast.error("Invalid Admin Credentials");
    }
    setIsLoggingIn(false);
  };

  // Role-based protection: Show login if not admin AND not master authenticated
  useEffect(() => {
    if (!authLoading) {
      // If we're neither a real admin nor master auth'd, we stay on this page but show login
      // No automatic redirect to home yet, let them try the password
    }
  }, [user, profile, authLoading, isMasterAuthenticated]);

  useEffect(() => {
    // Only fetch data if authorized
    const isAuthorized = profile?.role === 'admin' || isMasterAuthenticated;
    if (authLoading || !isAuthorized) return;

    // Stats & Orders Listener (Real-time) - Optimized with limit and order
    const ordersQuery = query(
      collection(db, "orders"), 
      orderBy("createdAt", "desc"), 
      limit(100) // Increased limit for better stats
    );
    
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      let revenue = 0;
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      orders.forEach((order: any) => {
        revenue += Number(order.total) || 0;
      });
      
      setStats(prev => ({ 
        ...prev, 
        totalOrders: snapshot.size, 
        totalRevenue: revenue 
      }));
      
      setRecentOrders(orders.slice(0, 5));
      setAllOrders(orders);
    }, (error) => {
      console.error("Orders listener error:", error);
      setHasPermissionError(true);
      toast.error("Failed to sync orders. Check permissions.");
      setLoading(false);
    });

    // Users Listener - Optimized
    const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(list);
      setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
    }, (error) => {
      console.error("Users listener error:", error);
      setLoading(false);
    });

    // Vendors Listener - Optimized
    const vendorsQuery = query(collection(db, "vendors"), orderBy("createdAt", "desc"), limit(50));
    const unsubVendors = onSnapshot(vendorsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVendorsList(list);
      setStats(prev => ({ ...prev, activeVendors: snapshot.size }));
    }, (error) => {
      console.error("Vendors listener error:", error);
      setHasPermissionError(true);
      setLoading(false);
    });

    // Reviews Listener - Optimized
    const reviewsQuery = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(50));
    const unsubReviews = onSnapshot(reviewsQuery, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Reviews listener error:", error);
      setLoading(false);
    });

    // Global Dishes Listener (Collection Group)
    const dishesQuery = query(collectionGroup(db, "dishes"), limit(200));
    const unsubDishes = onSnapshot(dishesQuery, (snapshot) => {
      setDishesList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Dishes listener error:", error);
      if (error.code === 'permission-denied') {
        toast.error("Permission denied for Dishes. Please update Firestore rules.");
      } else if (error.message.includes("index")) {
        console.error("Index required:", error.message);
        toast.error("Firestore Index Required. Check console for link.");
      }
      setLoading(false);
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubVendors();
      unsubReviews();
      unsubDishes();
    };
  }, [authLoading, user, profile, isMasterAuthenticated]);

  // Reset search when changing tabs
  useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const handleSettleDues = async (vendorId: string, amount: number) => {
    try {
      const { settleVendorPayout } = await import("@/lib/firestore");
      await settleVendorPayout(vendorId, amount);
      toast.success("Payout settled successfully!");
    } catch (error) {
      console.error("Payout settlement failed:", error);
      toast.error("Failed to settle payout.");
    }
  };

  const handleApproveVendor = async (vendorId: string) => {
    try {
      const { updateVendorStatus } = await import("@/lib/firestore");
      await updateVendorStatus(vendorId, "active");
      toast.success("Vendor approved successfully!");
    } catch (error) {
      console.error("Failed to approve vendor:", error);
      toast.error("Failed to approve vendor.");
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const { updateUserProfile } = await import("@/lib/firestore");
      await updateUserProfile(userId, { role: newRole });
      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Role update failed.");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { deleteReview } = await import("@/lib/firestore");
      await deleteReview(reviewId);
      toast.success("Review deleted");
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast.error("Delete failed.");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { updateOrderStatus } = await import("@/lib/firestore");
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status: ${newStatus}`);
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error("Update failed.");
    }
  };

  const handleDeleteDish = async (vendorId: string, dishId: string) => {
    if (!confirm("Are you sure you want to delete this dish?")) return;
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "vendors", vendorId, "dishes", dishId));
      toast.success("Dish deleted");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Delete failed");
    }
  };

  const handleToggleDishAvailability = async (vendorId: string, dishId: string, currentStatus: boolean) => {
    try {
      const { updateDoc, doc } = await import("firebase/firestore");
      await updateDoc(doc(db, "vendors", vendorId, "dishes", dishId), {
        isAvailable: !currentStatus
      });
      toast.success(`Dish is now ${!currentStatus ? 'available' : 'unavailable'}`);
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Update failed");
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phoneNumber?.includes(searchTerm) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = allOrders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendors = vendorsList.filter(v => 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReviews = reviews.filter(r => 
    r.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.vendorName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayouts = vendorsList.filter(v => 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (v.pendingBalance && v.pendingBalance > 0)
  );

  const filteredDishes = dishesList.filter(d => {
    const vendor = vendorsList.find(v => v.id === d.vendorId);
    const vendorName = vendor?.name || "Unknown Kitchen";
    return (
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Master Login Screen
  if (profile?.role !== 'admin' && !isMasterAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <m.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-secondary/40 backdrop-blur-xl border border-white/5 p-12 rounded-[40px] shadow-2xl space-y-8"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-white">Master Admin</h1>
            <p className="text-xs text-muted font-bold uppercase tracking-widest">Restricted Access Control</p>
          </div>

          <form onSubmit={handleMasterLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-[0.2em] ml-1">Admin Password</label>
              <input 
                type="password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-background border border-white/10 focus:border-primary/50 rounded-2xl py-4 px-6 outline-none transition-all text-white font-bold tracking-widest text-center"
                autoFocus
              />
            </div>
            <button 
              disabled={isLoggingIn}
              className="w-full py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest shadow-glow hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {isLoggingIn ? "Verifying..." : "Access Dashboard"}
            </button>
          </form>

          <p className="text-[9px] text-center text-muted font-bold uppercase tracking-tighter">
            Unauthorized access is strictly prohibited and logged.
          </p>
        </m.div>
      </div>
    );
  }

  const activeOrdersList = allOrders.filter(
    (o) => o.status !== "delivered" && o.status !== "cancelled" && o.status !== "rejected"
  );

  const cards = [
    { title: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, trend: "+12.5%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Active Orders", value: activeOrdersList.length.toString(), icon: ShoppingBag, trend: "Live", color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Active Vendors", value: stats.activeVendors.toString(), icon: Store, trend: "+3", color: "text-primary", bg: "bg-primary/10" },
    { title: "Total Foodies", value: stats.totalUsers.toString(), icon: Users, trend: "+156", color: "text-purple-500", bg: "bg-purple-500/10" },
  ];


  return (
    <div className="min-h-screen bg-background pb-12 px-4 lg:px-6">
      <div className="relative z-30 max-w-[1600px] mx-auto px-4 lg:px-8 pt-36 lg:pt-24 pb-20">
        {hasPermissionError && (
          <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-red-500">
            <div className="flex items-center gap-4">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Firestore Permission Denied</p>
                <p className="opacity-80">
                  {!user
                    ? "You are logged in via Master Password, but not signed in to any Firebase account. Please sign in first so we can promote your account to Admin."
                    : profile?.role !== 'admin' && isMasterAuthenticated
                    ? "Your database user account does not have the 'admin' role, so Firestore is blocking the orders query."
                    : "Some data could not be loaded. Please update your Firestore Security Rules in the Firebase Console."}
                </p>
              </div>
            </div>
            {!user && isMasterAuthenticated ? (
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2.5 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/80 transition-all cursor-pointer shrink-0"
              >
                Go to Home to Sign In
              </button>
            ) : profile?.role !== 'admin' && isMasterAuthenticated && user ? (
              <button
                onClick={async () => {
                  try {
                    const { doc, updateDoc } = await import("firebase/firestore");
                    await updateDoc(doc(db, "users", user.uid), { role: "admin" });
                    toast.success("Database account updated to Admin! Reloading...");
                    setTimeout(() => window.location.reload(), 1500);
                  } catch (err) {
                    console.error("Failed to upgrade role:", err);
                    toast.error("Failed to update database role.");
                  }
                }}
                className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-red-600 transition-all cursor-pointer shrink-0"
              >
                Promote my Account to Admin
              </button>
            ) : null}
          </div>
        )}
        <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Persistent Sidebar */}
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 space-y-8">
          
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <m.div 
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Dashboard Overview</h1>
                    <p className="text-muted text-sm font-bold uppercase tracking-widest">Real-time system performance metrics</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-secondary/40 border border-white/5 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all"
                    >
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Refresh Stats</span>
                    </button>
                    <div className="px-4 py-2 bg-secondary/40 border border-white/5 rounded-2xl flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Data</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {cards.map((card, idx) => (
                    <m.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-secondary/40 backdrop-blur-md border border-white/5 p-6 rounded-[32px] relative overflow-hidden group hover:border-primary/20 transition-all shadow-xl"
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} rounded-bl-full opacity-50 group-hover:scale-110 transition-transform`} />
                      <card.icon className={`w-8 h-8 ${card.color} mb-4`} />
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted font-black uppercase tracking-[0.2em]">{card.title}</p>
                        <div className="flex items-end gap-2">
                          <h3 className="text-3xl font-bold tracking-tight text-white">{card.value}</h3>
                          <span className="text-[10px] text-emerald-500 font-bold mb-1 flex items-center bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <TrendingUp className="w-3 h-3 mr-1" /> {card.trend}
                          </span>
                        </div>
                      </div>
                    </m.div>
                  ))}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Live Active Orders */}
                  <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                        <Activity className="w-5 h-5 text-primary animate-pulse" />
                        Live Active Orders
                      </h2>
                      <button 
                        onClick={() => setActiveTab("orders")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                      >
                        View All Orders
                      </button>
                    </div>
                    <div className="bg-secondary/20 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                            <th className="px-8 py-6">Order ID</th>
                            <th className="px-8 py-6">Customer</th>
                            <th className="px-8 py-6">Kitchen</th>
                            <th className="px-8 py-6">Amount</th>
                            <th className="px-8 py-6">Status</th>
                            <th className="px-8 py-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {activeOrdersList.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-8 py-16 text-center">
                                <div className="text-sm text-muted font-bold">
                                  <p>No active orders at the moment</p>
                                  <p className="opacity-60 text-xs font-normal mt-1">All orders are delivered, cancelled, or settled.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            activeOrdersList.slice(0, 10).map((order) => (
                              <tr key={order.id} className="group hover:bg-white/5 transition-colors">
                                <td className="px-8 py-6">
                                  <p className="text-xs font-bold font-mono text-white/90">#{order.id.slice(-8).toUpperCase()}</p>
                                  <p className="text-[9px] text-muted font-bold uppercase tracking-tighter mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                                  </p>
                                </td>
                                <td className="px-8 py-6 text-xs font-bold text-white">
                                  {order.userName || "Guest"}
                                </td>
                                <td className="px-8 py-6 text-xs font-bold text-muted">
                                  {order.vendorName || "Unknown"}
                                </td>
                                <td className="px-8 py-6">
                                  <span className="text-sm font-black text-white">₹{order.total}</span>
                                </td>
                                <td className="px-8 py-6">
                                  <span className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border", 
                                    order.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                    order.status === 'accepted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                    order.status === 'preparing' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  )}>
                                    {order.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <button 
                                    onClick={() => router.push(`/orders/${order.id}`)}
                                    className="p-3 bg-white/5 hover:bg-primary hover:text-black rounded-2xl transition-all group/view"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>              </div>

                  <div className="bg-secondary/20 border border-white/5 rounded-[40px] p-8 space-y-6 shadow-2xl">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted px-2">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:border-primary/30 transition-all text-left group">
                        <Activity className="w-6 h-6 text-primary mb-4 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-black text-white uppercase tracking-wider">Broadcast Notice</p>
                        <p className="text-[9px] text-muted font-bold mt-1 uppercase">Send to all users</p>
                      </button>
                      <button className="p-6 bg-white/5 border border-white/5 rounded-3xl hover:border-red-500/30 transition-all text-left group">
                        <ShieldCheck className="w-6 h-6 text-red-500 mb-4 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-black text-white uppercase tracking-wider">Maintenance Mode</p>
                        <p className="text-[9px] text-muted font-bold mt-1 uppercase">Restrict access</p>
                      </button>
                    </div>
                  </div>
                </div>
              </m.div>
            )}

            {activeTab === "live_orders" && (
              <m.div 
                key="live_orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Live Order Monitor</h1>
                    <p className="text-muted text-sm font-bold uppercase tracking-widest">Real-time active order tracking and management</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-secondary/40 border border-white/5 rounded-2xl flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Syncing</span>
                    </div>
                  </div>
                </div>

                {/* Status Counters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["pending", "accepted", "preparing", "out_for_delivery"].map((status) => {
                    const count = activeOrdersList.filter(o => o.status === status).length;
                    const label = status === "out_for_delivery" ? "Out for Delivery" : status.toUpperCase();
                    const color = 
                      status === "pending" ? "text-amber-500" :
                      status === "accepted" ? "text-blue-500" :
                      status === "preparing" ? "text-purple-500" :
                      "text-orange-500";
                    return (
                      <div key={status} className="bg-secondary/20 border border-white/5 p-6 rounded-[24px] text-center shadow-xl">
                        <span className={`text-2xl font-black ${color}`}>{count}</span>
                        <p className="text-[9px] text-muted font-bold mt-1 uppercase tracking-wider">{label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Orders List / Cards Grid */}
                {activeOrdersList.length === 0 ? (
                  <div className="bg-secondary/20 border border-white/5 rounded-[40px] py-20 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag className="w-10 h-10 text-muted" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No active orders right now</h3>
                    <p className="text-muted text-sm mt-2">All placed orders have been successfully delivered or cancelled.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeOrdersList.map((order) => {
                      const statusColor = 
                        order.status === "pending" ? "border-amber-500/30 hover:border-amber-500/50 shadow-amber-500/5" :
                        order.status === "accepted" ? "border-blue-500/30 hover:border-blue-500/50 shadow-blue-500/5" :
                        order.status === "preparing" ? "border-purple-500/30 hover:border-purple-500/50 shadow-purple-500/5" :
                        "border-orange-500/30 hover:border-orange-500/50 shadow-orange-500/5";

                      return (
                        <m.div
                          key={order.id}
                          layout
                          className={cn(
                            "bg-secondary/20 border p-6 rounded-[36px] flex flex-col justify-between shadow-2xl transition-all group",
                            statusColor
                          )}
                        >
                          <div className="space-y-6">
                            {/* Card Header */}
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-mono text-xs font-bold text-white/55">#{order.id.slice(-8).toUpperCase()}</span>
                                <h3 className="font-bold text-lg text-white mt-1">₹{order.total}</h3>
                              </div>
                              <select 
                                value={order.status || 'pending'}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                className={cn(
                                  "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider outline-none bg-[#111] border cursor-pointer",
                                  order.status === 'pending' ? 'text-amber-500 border-amber-500/30' : 
                                  order.status === 'accepted' ? 'text-blue-500 border-blue-500/30' :
                                  order.status === 'preparing' ? 'text-purple-500 border-purple-500/30' :
                                  'text-orange-500 border-orange-500/30'
                                )}
                              >
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="preparing">Preparing</option>
                                <option value="out_for_delivery">Out for Delivery</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>

                            {/* Order Items */}
                            <div className="bg-background/40 border border-white/5 rounded-2xl p-4 space-y-2">
                              <p className="text-[9px] text-muted font-bold uppercase tracking-widest">Ordered Items</p>
                              <div className="divide-y divide-white/5">
                                {order.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="py-2 flex justify-between text-xs">
                                    <span className="text-white font-medium">
                                      {item.name} <span className="text-muted font-bold ml-1">x{item.quantity}</span>
                                    </span>
                                    <span className="text-muted">₹{item.price * item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Customer & Kitchen Details */}
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest">Customer Details</p>
                                <p className="font-bold text-white">{order.userName || "Guest"}</p>
                                <p className="text-muted">{order.phoneNumber || "No phone"}</p>
                                <p className="text-muted text-[10px] line-clamp-2 leading-relaxed">{order.address || "No address"}</p>
                              </div>
                              <div className="space-y-1 border-l border-white/5 pl-4">
                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest">Kitchen Details</p>
                                <p className="font-bold text-white">{order.vendorName || "Unknown Kitchen"}</p>
                                <p className="text-muted text-[10px] line-clamp-2 leading-relaxed">
                                  {vendorsList.find(v => v.id === order.vendorId)?.location || "Location not found"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[9px] text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {order.createdAt?.seconds 
                                ? new Date(order.createdAt.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                                : "Historical"}
                            </span>
                            <button
                              onClick={() => router.push(`/orders/${order.id}`)}
                              className="px-4 py-2 bg-white/5 hover:bg-primary hover:text-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
                            >
                              Open Tracker <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </m.div>
                      );
                    })}
                  </div>
                )}
              </m.div>
            )}

            {activeTab === "users" && (
              <m.div 
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-white">User Management</h2>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search users..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-secondary/40 border border-white/5 rounded-2xl outline-none focus:border-primary/50 transition-all text-xs w-64 text-white"
                    />
                  </div>
                </div>
                <div className="bg-secondary/20 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                        <th className="px-8 py-6">User Details</th>
                        <th className="px-8 py-6">Role</th>
                        <th className="px-8 py-6">Joined Date</th>
                        <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">
                                {u.displayName?.[0] || u.phoneNumber?.slice(-2) || "U"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">{u.displayName || "Unset Name"}</p>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-tighter">{u.phoneNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <select 
                              value={u.role || 'customer'}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              className="bg-secondary/40 border border-white/5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
                            >
                              <option value="customer">Customer</option>
                              <option value="vendor">Vendor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-8 py-6 text-xs text-muted font-bold">
                            {u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : "Historical"}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button className="p-2 hover:bg-white/10 rounded-xl transition-all">
                              <ChevronRight className="w-4 h-4 text-muted" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </m.div>
            )}

            {activeTab === "orders" && (
              <m.div 
                key="orders"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-white">Full Order History</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input 
                        type="text" 
                        placeholder="Search orders..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-6 py-3 bg-secondary/40 border border-white/5 rounded-2xl outline-none focus:border-primary/50 transition-all text-xs w-64 text-white"
                      />
                    </div>
                    <button className="p-3 bg-secondary/40 border border-white/5 rounded-2xl text-muted hover:text-white transition-all">
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-secondary/20 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                        <th className="px-8 py-6">Order Info</th>
                        <th className="px-8 py-6">Customer</th>
                        <th className="px-8 py-6">Kitchen</th>
                        <th className="px-8 py-6">Amount</th>
                        <th className="px-8 py-6">Status</th>
                        <th className="px-8 py-6 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOrders.map((o) => (
                        <tr key={o.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6">
                            <p className="text-[10px] font-black font-mono text-white/60 mb-1">#{o.id.slice(-8).toUpperCase()}</p>
                            <p className="text-[9px] text-muted font-bold uppercase tracking-tighter flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                            </p>
                          </td>
                          <td className="px-8 py-6 text-xs font-bold text-white">{o.userName}</td>
                          <td className="px-8 py-6 text-xs font-bold text-muted">{o.vendorName}</td>
                          <td className="px-8 py-6 font-black text-white text-sm">₹{o.total}</td>
                          <td className="px-8 py-6">
                            <select 
                              value={o.status || 'pending'}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                              className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest outline-none bg-transparent cursor-pointer", 
                                o.status === 'delivered' ? 'text-emerald-500 border border-emerald-500/20' : 'text-amber-500 border border-amber-500/20'
                              )}
                            >
                              <option value="pending" className="bg-black text-white">Pending</option>
                              <option value="processing" className="bg-black text-white">Processing</option>
                              <option value="shipped" className="bg-black text-white">Shipped</option>
                              <option value="delivered" className="bg-black text-white">Delivered</option>
                              <option value="cancelled" className="bg-black text-white">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button onClick={() => router.push(`/orders/${o.id}`)} className="p-2 hover:bg-white/10 rounded-xl">
                              <ExternalLink className="w-4 h-4 text-primary" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </m.div>
            )}

            {activeTab === "vendors" && (
              <m.div 
                key="vendors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-white">Kitchen Partners</h2>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search kitchens..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-secondary/40 border border-white/5 rounded-2xl outline-none focus:border-primary/50 transition-all text-xs w-64 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVendors.map((vendor) => (
                    <div key={vendor.id} className="bg-secondary/20 border border-white/5 p-8 rounded-[40px] flex flex-col justify-between shadow-2xl hover:border-primary/20 transition-all group">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{vendor.name}</h3>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            vendor.status === 'active' ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-amber-500/20 text-amber-500 bg-amber-500/5"
                          )}>
                            {vendor.status || 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed line-clamp-2 font-bold">{vendor.description}</p>
                        <div className="flex items-center gap-4 text-[9px] font-black text-white/30 uppercase tracking-widest">
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="w-3 h-3" /> {vendor.location || "Patna"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-8 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full">
                          <Star className="w-3 h-3 text-primary fill-current" />
                          <span className="font-black text-xs text-white">
                            {vendor.totalReviewCount > 0 
                              ? (vendor.totalRatingSum / vendor.totalReviewCount).toFixed(1)
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {vendor.status !== 'active' && (
                            <button 
                              onClick={() => handleApproveVendor(vendor.id)}
                              className="px-6 py-3 bg-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-glow"
                            >
                              Approve
                            </button>
                          )}
                          <button 
                            onClick={async () => {
                              if (confirm(`Are you sure you want to REJECT ${vendor.name}?`)) {
                                const { updateVendorStatus } = await import("@/lib/firestore");
                                await updateVendorStatus(vendor.id, "rejected");
                                toast.error("Vendor Rejected");
                              }
                            }}
                            className="px-6 py-3 bg-white/5 text-red-500 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </m.div>
            )}

            {activeTab === "payouts" && (
              <m.div 
                key="payouts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-white">Vendor Payouts</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                      <input 
                        type="text" 
                        placeholder="Search payouts..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-6 py-3 bg-secondary/40 border border-white/5 rounded-2xl outline-none focus:border-primary/50 transition-all text-xs w-64 text-white"
                      />
                    </div>
                    <div className="px-6 py-3 bg-secondary/40 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted">
                      Next Cycle: May 1st
                    </div>
                  </div>
                </div>
                <div className="bg-secondary/20 border border-white/5 rounded-[40px] p-8 space-y-4 shadow-2xl">
                  {filteredPayouts.map((vendor) => {
                    const unpaid = vendor.pendingBalance || 0;
                    const isSettled = unpaid === 0;
                    return (
                      <div key={vendor.id} className="flex items-center justify-between p-6 bg-white/5 rounded-[32px] border border-white/5 hover:border-primary/10 transition-all group">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Store className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-black text-white uppercase tracking-wider">{vendor.name}</p>
                            <p className="text-[10px] text-muted font-black font-mono tracking-tighter uppercase">Kitchen ID: {vendor.id.slice(0,12)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-12">
                          <div className="text-right">
                            <p className="text-[9px] text-muted font-black uppercase tracking-widest mb-1">Unpaid Balance</p>
                            <p className={cn("text-2xl font-black", isSettled ? "text-emerald-500" : "text-white")}>
                              {isSettled ? "SETTLED" : `₹${unpaid}`}
                            </p>
                          </div>
                          {!isSettled && (
                            <button 
                              onClick={() => {
                                if (confirm(`Settle ₹${unpaid} for ${vendor.name}?`)) {
                                  handleSettleDues(vendor.id, unpaid);
                                }
                              }}
                              className="px-8 py-4 bg-primary text-black font-black rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-glow"
                            >
                              Settle Dues
                            </button>
                          )}
                          {isSettled && (
                            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </m.div>
            )}

            {activeTab === "dishes" && (
              <m.div 
                key="dishes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-white">Global Dish Inventory</h2>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search dishes or categories..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-secondary/40 border border-white/5 rounded-2xl outline-none focus:border-primary/50 transition-all text-xs w-64 text-white"
                    />
                  </div>
                </div>
                <div className="bg-secondary/20 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                        <th className="px-8 py-6">Dish</th>
                        <th className="px-8 py-6">Category</th>
                        <th className="px-8 py-6">Price</th>
                        <th className="px-8 py-6">Status</th>
                        <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredDishes.map((dish) => (
                        <tr key={dish.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <img src={dish.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
                              <div>
                                <p className="text-sm font-bold text-white">{dish.name}</p>
                                <p className="text-[9px] text-muted font-black uppercase tracking-widest">{vendorsList.find(v => v.id === dish.vendorId)?.name || "Unknown Kitchen"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-muted border border-white/5">
                              {dish.category}
                            </span>
                          </td>
                          <td className="px-8 py-6 font-black text-white">₹{dish.price}</td>
                          <td className="px-8 py-6">
                            <button 
                              onClick={() => handleToggleDishAvailability(dish.vendorId, dish.id, dish.isAvailable)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                                dish.isAvailable 
                                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                  : "bg-red-500/10 text-red-500 border border-red-500/20"
                              )}
                            >
                              {dish.isAvailable ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              {dish.isAvailable ? "Available" : "Sold Out"}
                            </button>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleDeleteDish(dish.vendorId, dish.id)}
                              className="p-3 hover:bg-red-500/10 rounded-2xl transition-all text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </m.div>
            )}

            {activeTab === "reviews" && (
              <m.div 
                key="reviews"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold text-white">Community Feedback</h2>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input 
                      type="text" 
                      placeholder="Search reviews..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-secondary/40 border border-white/5 rounded-2xl outline-none focus:border-primary/50 transition-all text-xs w-64 text-white"
                    />
                  </div>
                </div>
                <div className="bg-secondary/20 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-muted">
                        <th className="px-8 py-6">Customer</th>
                        <th className="px-8 py-6">Rating</th>
                        <th className="px-8 py-6">Review</th>
                        <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredReviews.map((review) => (
                        <tr key={review.id} className="group hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6 font-black text-white uppercase tracking-tight">{review.userName}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-1 text-primary bg-primary/10 px-3 py-1 rounded-full w-fit border border-primary/20">
                              <Star className="w-3 h-3 fill-current" />
                              <span className="font-black text-xs">{review.rating}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-xs text-muted font-bold max-w-md leading-relaxed">{review.comment}</td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleDeleteReview(review.id)}
                              className="p-3 hover:bg-red-500/10 rounded-2xl transition-all group/trash"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 group-hover/trash:scale-110 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
);
}
