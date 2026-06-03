// State management
let cart = [];

// DOM Elements
const navbar = document.querySelector('.navbar');
const cartBtn = document.getElementById('cart-btn');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const closeCart = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartCountSpan = document.querySelector('.cart-count');
const cartTotalSpan = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const addToCartButtons = document.querySelectorAll('.add-to-cart');

// 1. Scroll Effect for Navbar
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// 2. Open/Close Cart Drawer
const toggleCart = () => {
    cartDrawer.classList.toggle('active');
    cartOverlay.classList.toggle('active');
    document.body.style.overflow = cartDrawer.classList.contains('active') ? 'hidden' : '';
};

cartBtn.addEventListener('click', toggleCart);
closeCart.addEventListener('click', toggleCart);
cartOverlay.addEventListener('click', toggleCart);

// 3. Cart Functionality
const updateCartUI = () => {
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountSpan.textContent = totalItems;

    // Badge pop visual feedback
    if (totalItems > 0) {
        cartCountSpan.classList.remove('pop');
        void cartCountSpan.offsetWidth; // Force CSS reflow to restart animation
        cartCountSpan.classList.add('pop');
    }

    // Clear and re-render items
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i data-lucide="utensils"></i>
                <p>Your cart is empty.</p>
                <button class="cta-btn primary" onclick="toggleCart()">Browse Menu</button>
            </div>
        `;
        checkoutBtn.disabled = true;
        cartTotalSpan.textContent = "$0.00";
    } else {
        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
                <div class="item-qty">
                    <span>Qty: ${item.quantity}</span>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `).join('');
        
        checkoutBtn.disabled = false;
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotalSpan.textContent = `$${total.toFixed(2)}`;
    }
    
    // Refresh icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
};

const animateFlyToCart = (img, cartBtn, callback) => {
    const imgRect = img.getBoundingClientRect();
    const cartBtnRect = cartBtn.getBoundingClientRect();
    
    // Create flying clone element
    const flyEl = document.createElement('div');
    flyEl.className = 'fly-to-cart-item';
    
    // Setup initial position & dimensions match card image
    flyEl.style.top = `${imgRect.top + window.scrollY}px`;
    flyEl.style.left = `${imgRect.left + window.scrollX}px`;
    flyEl.style.width = `${imgRect.width}px`;
    flyEl.style.height = `${imgRect.height}px`;
    flyEl.style.backgroundImage = `url(${img.src})`;
    
    // Convert current fixed coordinates to page-relative coordinates for absolute positioning
    flyEl.style.top = `${imgRect.top}px`;
    flyEl.style.left = `${imgRect.left}px`;
    
    document.body.appendChild(flyEl);
    
    // Calculate target coordinates (centered inside target cart button)
    const targetLeft = cartBtnRect.left + cartBtnRect.width / 2 - 15;
    const targetTop = cartBtnRect.top + cartBtnRect.height / 2 - 15;
    
    // Start animation in the next layout frame
    requestAnimationFrame(() => {
        flyEl.style.top = `${targetTop}px`;
        flyEl.style.left = `${targetLeft}px`;
        flyEl.style.width = '30px';
        flyEl.style.height = '30px';
        flyEl.style.opacity = '0.05';
        flyEl.style.transform = 'scale(0.1) rotate(540deg)';
    });
    
    // Clean up elements and execute cart sync callback when animation completes
    setTimeout(() => {
        flyEl.remove();
        callback();
    }, 800);
};

const addToCart = (e) => {
    const btn = e.target;
    const id = parseInt(btn.dataset.id);
    const name = btn.dataset.name;
    const price = parseFloat(btn.dataset.price);

    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }

    // Visual feedback on button
    const originalText = btn.textContent;
    btn.textContent = "Added!";
    btn.classList.add('success');
    setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('success');
    }, 1500);

    // Trigger fly-to-cart animation if assets exist
    const card = btn.closest('.menu-card');
    const img = card ? card.querySelector('.card-img img') : null;
    const cartBtnEl = document.getElementById('cart-btn');

    if (img && cartBtnEl) {
        animateFlyToCart(img, cartBtnEl, () => {
            updateCartUI();
        });
    } else {
        updateCartUI();
    }
};

window.removeFromCart = (id) => {
    const cartItemEl = cartItemsContainer.querySelector(`.cart-item[data-id="${id}"]`);
    if (cartItemEl) {
        cartItemEl.classList.add('removing');
        // Wait for the slideOutRight animation to complete (400ms)
        setTimeout(() => {
            cart = cart.filter(item => item.id !== id);
            updateCartUI();
        }, 380);
    } else {
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
    }
};

addToCartButtons.forEach(btn => btn.addEventListener('click', addToCart));

// 4. Initial Lucide Icons & Scroll Reveal Observer
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    // Setup Scroll Reveal Intersection Observer
    const reveals = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, {
        root: null,
        threshold: 0.12, // Trigger when 12% of the element is visible
        rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach(el => revealObserver.observe(el));
});

// 5. Minimalist Checkout Action
checkoutBtn.addEventListener('click', () => {
    alert("Thank you for your interest! This is a demo. Real checkout would happen here.");
});
