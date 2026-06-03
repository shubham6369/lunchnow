"use client";

import React, { useState, useRef } from "react";
import { m } from "framer-motion";
import { Plus, Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface DishCardProps {
  id: string;
  vendorId: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  isVeg?: boolean;
  vendorName?: string;
  isAvailable?: boolean;
}

export default function DishCard({
  id,
  vendorId,
  name,
  price,
  image,
  category,
  isVeg = true,
  vendorName,
  isAvailable = true,
}: DishCardProps) {
  const { addToCart, items } = useCart();
  const [added, setAdded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const inCart = items.some((i) => i.id === id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAvailable) return;

    // Trigger flight animation
    const img = cardRef.current?.querySelector("img");
    const cartBtn = document.getElementById("cart-btn");
    
    if (img && cartBtn) {
      const imgRect = img.getBoundingClientRect();
      const cartBtnRect = cartBtn.getBoundingClientRect();
      
      const flyEl = document.createElement("div");
      flyEl.className = "fly-to-cart-item";
      
      // Set initial positions
      flyEl.style.top = `${imgRect.top}px`;
      flyEl.style.left = `${imgRect.left}px`;
      flyEl.style.width = `${imgRect.width}px`;
      flyEl.style.height = `${imgRect.height}px`;
      flyEl.style.backgroundImage = `url(${img.src || img.getAttribute('src')})`;
      
      document.body.appendChild(flyEl);
      
      // Targets
      const targetLeft = cartBtnRect.left + cartBtnRect.width / 2 - 15;
      const targetTop = cartBtnRect.top + cartBtnRect.height / 2 - 15;
      
      requestAnimationFrame(() => {
        flyEl.style.top = `${targetTop}px`;
        flyEl.style.left = `${targetLeft}px`;
        flyEl.style.width = "50px";
        flyEl.style.height = "50px";
        flyEl.style.opacity = "0.15";
        flyEl.style.transform = "scale(0.65) rotate(540deg)";
      });
      
      setTimeout(() => {
        flyEl.remove();
        addToCart({
          id,
          vendorId,
          vendorName: vendorName || "Kitchen",
          name,
          price,
          image: image || "/images/hero.png",
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }, 1300);
    } else {
      addToCart({
        id,
        vendorId,
        vendorName: vendorName || "Kitchen",
        name,
        price,
        image: image || "/images/hero.png",
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  return (
    <m.div
      ref={cardRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative bg-secondary/40 border border-white/5 rounded-[28px] overflow-hidden hover:border-primary/30 transition-all shadow-lg"
    >
      {/* Image */}
      <Link href={`/vendors/${vendorId}`} className="block">
        <div className="relative h-44 overflow-hidden bg-black/30">
          <img
            src={image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />

          {/* Veg/Non-Veg badge */}
          <div className={cn(
            "absolute top-3 left-3 w-5 h-5 rounded-sm border-2 flex items-center justify-center",
            isVeg ? "border-green-500 bg-green-500/20" : "border-red-500 bg-red-500/20"
          )}>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full",
              isVeg ? "bg-green-500" : "bg-red-500"
            )} />
          </div>

          {/* Category pill */}
          {category && (
            <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[9px] font-bold uppercase tracking-widest text-white/70 border border-white/10">
              {category}
            </div>
          )}

          {/* Unavailable overlay */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-xs font-bold uppercase tracking-widest text-white/60 border border-white/20 px-3 py-1 rounded-full">
                Unavailable
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
          {vendorName && (
            <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5 truncate flex items-center gap-1">
              <ShoppingBag className="w-3 h-3 shrink-0" />
              {vendorName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-lg font-black text-white">₹{price}</span>
          <button
            onClick={handleAdd}
            disabled={!isAvailable}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all",
              added || inCart
                ? "bg-emerald-500 text-white scale-110"
                : isAvailable
                ? "bg-primary text-black hover:scale-110 hover:shadow-glow"
                : "bg-white/5 text-muted cursor-not-allowed"
            )}
          >
            {added || inCart ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </m.div>
  );
}
