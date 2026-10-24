/**
 * RADHA RANI SHRINGHAR KENDRA — HOMEPAGE INTERACTIVE ENGINE
 * Handcrafted Client Presentation Logic & State Management
 */

const AppState = {
  cart: [],
  wishlist: new Set(),
  activeCurrency: "INR",
  currencyRates: {
    INR: { symbol: "₹", rate: 1.0 },
    USD: { symbol: "$", rate: 0.012 },
    GBP: { symbol: "£", rate: 0.0094 }
  },
  appliedCoupon: null,
  coupons: {
    VRINDAVAN10: { type: "percent", value: 10, label: "10% Devotee Blessing Discount" },
    RADHEYRADHEY: { type: "flat", value: 200, label: "₹200 Welcome Gift" }
  },
  freeGiftThreshold: 2000
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  loadSavedState();
  updateCartUI();
  updateWishlistBadge();
  setupEventListeners();
});

function loadSavedState() {
  try {
    const savedCart = localStorage.getItem("rr_cart");
    if (savedCart) AppState.cart = JSON.parse(savedCart);
    const savedWish = localStorage.getItem("rr_wishlist");
    if (savedWish) AppState.wishlist = new Set(JSON.parse(savedWish));
  } catch (e) {}
}

function saveCartState() {
  try {
    localStorage.setItem("rr_cart", JSON.stringify(AppState.cart));
  } catch (e) {}
}

function saveWishlistState() {
  try {
    localStorage.setItem("rr_wishlist", JSON.stringify(Array.from(AppState.wishlist)));
  } catch (e) {}
}

// =============================================================================
// CURRENCY & FORMATTING
// =============================================================================

function formatPrice(inrAmount) {
  const curr = AppState.currencyRates[AppState.activeCurrency] || AppState.currencyRates.INR;
  const converted = Math.round(inrAmount * curr.rate);
  if (AppState.activeCurrency === "INR") {
    return `₹${inrAmount.toLocaleString("en-IN")}`;
  }
  return `${curr.symbol}${converted.toLocaleString()}`;
}

function toggleCurrency(curr) {
  AppState.activeCurrency = curr;
  updateCartUI();
  const select = document.getElementById("currency-select");
  if (select) select.value = curr;
  showToast(`Currency converted to ${curr}`);
}

// =============================================================================
// CART MANAGEMENT & SIDE DRAWER
// =============================================================================

function addItemToCart(title, price, image, size = "Standard Deity Fitting") {
  const existing = AppState.cart.find(item => item.title === title && item.size === size);
  if (existing) {
    existing.quantity += 1;
  } else {
    AppState.cart.push({
      id: `item-${Date.now()}`,
      title: title,
      price: price,
      image: image,
      size: size,
      quantity: 1
    });
  }

  saveCartState();
  updateCartUI();
  showToast(`Added ${title} (${size}) to Cart`);
  openCartDrawer();
}

function selectDarshanSize(btn, size) {
  const bar = btn.parentElement;
  if (bar) {
    bar.querySelectorAll('.size-pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
}

function addDarshanItemToCart(title, price, image, btn) {
  const card = btn.closest('.darshan-card');
  let selectedSize = '6 no';
  if (card) {
    const activePill = card.querySelector('.size-pill-btn.active');
    if (activePill) selectedSize = activePill.textContent.trim();
  }
  addItemToCart(title, price, image, selectedSize);
}


function updateCartQty(index, delta) {
  if (!AppState.cart[index]) return;
  AppState.cart[index].quantity += delta;
  if (AppState.cart[index].quantity <= 0) {
    AppState.cart.splice(index, 1);
  }
  saveCartState();
  updateCartUI();
}

function removeCartItem(index) {
  if (!AppState.cart[index]) return;
  AppState.cart.splice(index, 1);
  saveCartState();
  updateCartUI();
  showToast("Item removed from cart");
}

function updateCartUI() {
  const totalCount = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Badges
  document.querySelectorAll(".cart-count-badge").forEach(el => {
    el.textContent = totalCount;
  });

  const cartList = document.getElementById("cart-items-list");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartTotalEl = document.getElementById("cart-total");
  const giftFill = document.getElementById("gift-bar-fill");
  const giftText = document.getElementById("gift-bar-text");

  if (!cartList) return;

  if (AppState.cart.length === 0) {
    cartList.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--color-text-secondary);">
        <p style="font-size: 1.1rem; font-family: var(--font-serif); margin-bottom: 8px;">Your Sacred Seva Cart is Empty</p>
        <p style="font-size: 0.82rem;">Select from our bestsellers to adorn Thakurji.</p>
      </div>
    `;
    if (cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(0);
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(0);
    if (giftFill) giftFill.style.width = "0%";
    if (giftText) giftText.innerHTML = `Add <strong>${formatPrice(AppState.freeGiftThreshold)}</strong> for Complimentary Vrindavan Chandan & Tulsi Mala!`;
    return;
  }

  // Calculate Discounts
  let discountAmount = 0;
  if (AppState.appliedCoupon) {
    if (AppState.appliedCoupon.type === "percent") {
      discountAmount = Math.round((subtotal * AppState.appliedCoupon.value) / 100);
    } else {
      discountAmount = Math.min(AppState.appliedCoupon.value, subtotal);
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Gift progress
  const remainingForGift = Math.max(0, AppState.freeGiftThreshold - subtotal);
  const giftPct = Math.min(100, Math.round((subtotal / AppState.freeGiftThreshold) * 100));
  if (giftFill) giftFill.style.width = `${giftPct}%`;
  if (giftText) {
    if (remainingForGift === 0) {
      giftText.innerHTML = `🎉 <strong>Gift Unlocked!</strong> Complimentary Vrindavan Chandan & Tulsi Mala added!`;
    } else {
      giftText.innerHTML = `Add <strong>${formatPrice(remainingForGift)}</strong> more for Complimentary Vrindavan Chandan & Tulsi Mala!`;
    }
  }

  cartList.innerHTML = AppState.cart.map((item, idx) => `
    <div style="display: grid; grid-template-columns: 60px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--color-divider); position: relative;">
      <img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-divider);" />
      <div>
        <h4 style="font-size: 0.88rem; font-weight: 600; color: var(--color-maroon-dark); line-height: 1.25; margin-bottom: 2px;">${item.title}</h4>
        <div style="font-size: 0.72rem; color: var(--color-text-secondary); margin-bottom: 6px;">Size: ${item.size}</div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; border: 1px solid var(--color-divider); border-radius: 3px; background: white;">
            <button onclick="updateCartQty(${idx}, -1)" style="padding: 2px 8px; font-size: 0.85rem;">−</button>
            <span style="padding: 0 6px; font-size: 0.8rem; font-weight: 600;">${item.quantity}</span>
            <button onclick="updateCartQty(${idx}, 1)" style="padding: 2px 8px; font-size: 0.85rem;">+</button>
          </div>
          <span style="font-weight: 700; color: var(--color-maroon); font-size: 0.9rem;">${formatPrice(item.price * item.quantity)}</span>
        </div>
      </div>
      <button onclick="removeCartItem(${idx})" style="position: absolute; top: 8px; right: 0; color: #9A8D86; font-size: 0.75rem;">✕</button>
    </div>
  `).join("");

  if (cartSubtotalEl) cartSubtotalEl.textContent = formatPrice(subtotal);
  if (cartTotalEl) cartTotalEl.textContent = formatPrice(finalTotal);

  const discountRow = document.getElementById("cart-discount-row");
  const discountVal = document.getElementById("cart-discount-val");
  if (discountRow && discountVal) {
    if (discountAmount > 0) {
      discountRow.style.display = "flex";
      discountVal.textContent = `- ${formatPrice(discountAmount)}`;
    } else {
      discountRow.style.display = "none";
    }
  }
}

function applyCouponCode() {
  const input = document.getElementById("coupon-input");
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (AppState.coupons[code]) {
    AppState.appliedCoupon = AppState.coupons[code];
    updateCartUI();
    showToast(`Coupon applied: ${AppState.appliedCoupon.label}`);
  } else {
    showToast("Invalid code. Try 'VRINDAVAN10'");
  }
}

function openCartDrawer() {
  const overlay = document.getElementById("cart-overlay");
  const panel = document.getElementById("cart-panel");
  if (overlay && panel) {
    overlay.classList.add("active");
    panel.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeCartDrawer() {
  const overlay = document.getElementById("cart-overlay");
  const panel = document.getElementById("cart-panel");
  if (overlay && panel) {
    overlay.classList.remove("active");
    panel.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// =============================================================================
// WISHLIST MANAGEMENT
// =============================================================================

function toggleItemWishlist(btn, title, price) {
  if (AppState.wishlist.has(title)) {
    AppState.wishlist.delete(title);
    btn.classList.remove("active");
    showToast(`Removed from Wishlist: ${title}`);
  } else {
    AppState.wishlist.add(title);
    btn.classList.add("active");
    showToast(`Saved to Wishlist: ${title}`);
  }
  saveWishlistState();
  updateWishlistBadge();
}

function updateWishlistBadge() {
  const count = AppState.wishlist.size;
  document.querySelectorAll(".wishlist-count-badge").forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? "flex" : "none";
  });
}

function openWishlistModal() {
  const container = document.getElementById("wishlist-items-container");
  if (!container) return;

  const items = Array.from(AppState.wishlist);
  if (items.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--color-text-secondary);">
        <p>No items in your wishlist yet. Tap the heart icon on any product to save it.</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${items.map(title => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: white; border: 1px solid var(--color-divider); border-radius: 4px;">
            <span style="font-size: 0.88rem; font-weight: 600; color: var(--color-maroon-dark);">${title}</span>
            <button class="btn-card-add-cart" style="padding: 6px 14px; font-size: 0.76rem;" onclick="addItemToCart('${title}', 699, 'assets/images/prod-yellow-poshak.png');">Add to Cart</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  const modal = document.getElementById("wishlist-modal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeWishlistModal() {
  const modal = document.getElementById("wishlist-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// =============================================================================
// QUICK VIEW MODAL
// =============================================================================

const BESTSELLER_DATA = {
  "prod-1": {
    title: "Yellow Floral Designer Laddu Gopal Poshak",
    price: 599,
    originalPrice: 799,
    image: "assets/images/prod-yellow-poshak.png",
    category: "Laddu Gopal Poshak",
    desc: "Artisanal sunshine-yellow poshak tailored for Thakurji with fine floral silk thread work, gold gota trim, and matching pagdi.",
    sizes: ["Size 0", "Size 1", "Size 2", "Size 3", "Size 4", "Size 5"]
  },
  "prod-2": {
    title: "Pink Pearl Work Radha Rani Lehenga Set",
    price: 1299,
    originalPrice: 1599,
    image: "assets/images/prod-pink-lehenga.png",
    category: "Radha Rani Shringar",
    desc: "Delicate bridal rose-pink lehenga with pearl tassels, matching choli, and sheer veil with gold zari borders.",
    sizes: ["6 Inch", "9 Inch", "12 Inch", "15 Inch"]
  },
  "prod-3": {
    title: "Traditional Golden Mukut with Pearls",
    price: 899,
    originalPrice: 1099,
    image: "assets/images/prod-golden-mukut.png",
    category: "Mukut & Jewellery",
    desc: "Royal kundan-style deity crown with natural peacock quill crest and seed pearl tassels.",
    sizes: ["Size 2-4", "Size 5-7"]
  },
  "prod-4": {
    title: "Multi-colour Stone Mala Set",
    price: 749,
    originalPrice: 949,
    image: "assets/images/prod-stone-mala.png",
    category: "Mala & Accessories",
    desc: "Auspicious Navratna-inspired stone garland with 22K gold-plated links and adjustable back cord.",
    sizes: ["Universal Deity Fitting"]
  }
};

let activeQvItem = null;
let activeSelectedSize = "Size 4";

function openProductQuickView(prodId) {
  const data = BESTSELLER_DATA[prodId] || BESTSELLER_DATA["prod-1"];
  activeQvItem = data;
  activeSelectedSize = data.sizes[0];

  document.getElementById("qv-img").src = data.image;
  document.getElementById("qv-category").textContent = data.category;
  document.getElementById("qv-title").textContent = data.title;
  document.getElementById("qv-price").textContent = formatPrice(data.price);
  document.getElementById("qv-original-price").textContent = formatPrice(data.originalPrice);
  document.getElementById("qv-desc").textContent = data.desc;

  const sizeChips = document.getElementById("qv-size-chips");
  if (sizeChips) {
    sizeChips.innerHTML = data.sizes.map((sz, i) => `
      <button class="size-chip ${i === 0 ? 'active' : ''}" onclick="selectQvSize(this, '${sz}')">${sz}</button>
    `).join("");
  }

  const modal = document.getElementById("quickview-modal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function selectQvSize(btn, sz) {
  activeSelectedSize = sz;
  document.querySelectorAll(".size-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");
}

function handleQuickViewAddToCart() {
  if (!activeQvItem) return;
  addItemToCart(activeQvItem.title, activeQvItem.price, activeQvItem.image, activeSelectedSize);
  closeQuickView();
}

function handleQuickViewBuyNow() {
  if (!activeQvItem) return;
  addItemToCart(activeQvItem.title, activeQvItem.price, activeQvItem.image, activeSelectedSize);
  closeQuickView();
  openCheckoutModal();
}

function closeQuickView() {
  const modal = document.getElementById("quickview-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

// =============================================================================
// SIZE GUIDE & SEARCH & CHECKOUT MODALS
// =============================================================================

function openSizeGuideModal(tab = "gopal") {
  const modal = document.getElementById("size-guide-modal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeSizeGuideModal() {
  const modal = document.getElementById("size-guide-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function openCategory(name) {
  showToast(`Showing collections for: ${name}`);
  const sec = document.getElementById("bestsellers");
  if (sec) sec.scrollIntoView({ behavior: "smooth" });
}

function filterByCategory(cat) {
  showToast(`Browsing category: ${cat}`);
  const sec = document.getElementById("bestsellers");
  if (sec) sec.scrollIntoView({ behavior: "smooth" });
}

function openSearchModal() {
  const modal = document.getElementById("search-modal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      const input = document.getElementById("search-input");
      if (input) input.focus();
    }, 100);
  }
}

function closeSearchModal() {
  const modal = document.getElementById("search-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function openCheckoutModal() {
  if (AppState.cart.length === 0) {
    addItemToCart("Yellow Floral Designer Laddu Gopal Poshak", 599, "assets/images/prod-yellow-poshak.png");
  }
  closeCartDrawer();
  const modal = document.getElementById("checkout-modal");
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    setCheckoutStep(1);
  }
}

function closeCheckoutModal() {
  const modal = document.getElementById("checkout-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function setCheckoutStep(step) {
  document.querySelectorAll(".checkout-step-view").forEach(view => {
    view.style.display = view.dataset.step == step ? "block" : "none";
  });
  document.querySelectorAll(".checkout-step-item").forEach(item => {
    item.classList.toggle("active", item.dataset.step == step);
  });
}

function completeOrderPlacement(e) {
  if (e) e.preventDefault();
  const orderId = `RR-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  document.getElementById("confirmed-order-id").textContent = orderId;
  AppState.cart = [];
  AppState.appliedCoupon = null;
  saveCartState();
  updateCartUI();
  setCheckoutStep(3);
}

// =============================================================================
// TOAST & DEMO CONTROLS
// =============================================================================

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function demoPopulateSampleCart() {
  AppState.cart = [
    {
      id: "demo-1",
      title: "Yellow Floral Designer Laddu Gopal Poshak",
      price: 599,
      image: "assets/images/prod-yellow-poshak.png",
      size: "Size 4",
      quantity: 1
    },
    {
      id: "demo-2",
      title: "Traditional Golden Mukut with Pearls",
      price: 899,
      image: "assets/images/prod-golden-mukut.png",
      size: "Size 4 Mukut",
      quantity: 1
    }
  ];
  AppState.appliedCoupon = AppState.coupons["VRINDAVAN10"];
  saveCartState();
  updateCartUI();
  showToast("Demo sample cart loaded (with 10% coupon)");
  openCartDrawer();
}

function demoResetAll() {
  AppState.cart = [];
  AppState.wishlist.clear();
  AppState.appliedCoupon = null;
  saveCartState();
  saveWishlistState();
  updateCartUI();
  updateWishlistBadge();
  showToast("Demo reset to default state.");
}

function setupEventListeners() {
  const currSelect = document.getElementById("currency-select");
  if (currSelect) {
    currSelect.addEventListener("change", (e) => toggleCurrency(e.target.value));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCartDrawer();
      closeQuickView();
      closeWishlistModal();
      closeSizeGuideModal();
      closeSearchModal();
      closeCheckoutModal();
    }
  });
}
