// State
let cart = [];

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const cartIcon = document.getElementById('cart-icon');
const cartCount = document.getElementById('cart-count');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPrice = document.getElementById('cart-total-price');
const checkoutBtn = document.getElementById('checkout-btn');

const checkoutOverlay = document.getElementById('checkout-overlay');
const closeCheckoutBtn = document.getElementById('close-checkout');
const checkoutForm = document.getElementById('checkout-form');
const orderSuccess = document.getElementById('order-success');
const closeSuccessBtn = document.getElementById('close-success-btn');

// Initialize
function init() {
    setupEventListeners();
    updateCartUI();
}

// Render products
function renderProducts(dynamicProducts = []) {
    window.currentDynamicProducts = dynamicProducts;
    productsGrid.innerHTML = '';
    
    dynamicProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const cartItem = cart.find(item => item.id === product.id);
        const currentQty = cartItem ? cartItem.quantity : 0;
        
        const isSoldOut = product.stock <= 0;
        const bannerHtml = isSoldOut ? '<div class="sold-out-banner">Uitverkoop</div>' : '';
        
        let footerHtml = '';
        if (isSoldOut) {
            footerHtml = `<button class="add-to-cart" disabled>Uitverkoop</button>`;
        } else if (currentQty > 0) {
            footerHtml = `
                <div class="inline-qty-controls">
                    <button class="inline-qty-btn inline-minus" data-id="${product.id}">-</button>
                    <span class="inline-qty-val">${currentQty}</span>
                    <button class="inline-qty-btn inline-plus" data-id="${product.id}">+</button>
                </div>
            `;
        } else {
            footerHtml = `<button class="add-to-cart" data-id="${product.id}">Kies</button>`;
        }
        
        card.innerHTML = `
            <div class="product-img-container">
                ${bannerHtml}
                <img src="${product.image}" alt="${product.name}" class="product-img" ${isSoldOut ? 'style="opacity: 0.6; filter: grayscale(80%);"' : ''}>
            </div>
            <div class="product-content">
                <span class="product-date">${product.date}</span>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-desc">${product.description}</p>
                <div class="product-footer">
                    <span class="product-price">R${product.price.toFixed(2)}</span>
                    ${footerHtml}
                </div>
            </div>
        `;
        productsGrid.appendChild(card);
    });

    // Add event listeners to buttons
    document.querySelectorAll('.add-to-cart:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            addToCart(id);
        });
    });
    
    document.querySelectorAll('.inline-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            updateQuantity(id, -1);
        });
    });
    
    document.querySelectorAll('.inline-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            updateQuantity(id, 1);
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Open cart
    cartIcon.addEventListener('click', () => {
        cartOverlay.classList.add('active');
    });

    // Close cart
    closeCartBtn.addEventListener('click', () => {
        cartOverlay.classList.remove('active');
    });

    // Close cart when clicking outside
    cartOverlay.addEventListener('click', (e) => {
        if (e.target === cartOverlay) {
            cartOverlay.classList.remove('active');
        }
    });

    // Open Checkout
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert("U mandjie is tans leeg. Voeg asseblief etes by om voort te gaan.");
            return;
        }
        
        // Verander knoppie teks om te wys ons laai
        const originalText = checkoutBtn.textContent;
        checkoutBtn.textContent = "Kontroleer voorraad...";
        checkoutBtn.style.opacity = "0.7";
        checkoutBtn.disabled = true;
        
        // Stel flag sodat updateStockUI weet ons wil checkout doen
        window.isCheckingOut = true;
        
        // Gaan haal die nuutste voorraad vanaf Google Sheets
        fetchStock();
    });

    // Close Checkout
    closeCheckoutBtn.addEventListener('click', () => {
        checkoutOverlay.classList.remove('active');
    });

    checkoutOverlay.addEventListener('click', (e) => {
        if (e.target === checkoutOverlay) {
            checkoutOverlay.classList.remove('active');
        }
    });

    // Vul asseblief hierdie skakel in na die Apps Script Web App ontplooi is:
    const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzllFxYZmZ0Br0pmxnm3kLe8fey-imEJ9yZMmRKaE2bLxrkBQaqDj6fsYD174jCVEW1/exec";

    // Haal voorraad op met JSONP
    window.updateStockUI = function(sheetData) {
        let dynamicProducts = [];
        let index = 1;
        
        // As daar 'n fout is
        if (sheetData.error) {
            document.getElementById('loading-message').textContent = "Kon nie spyskaart laai nie.";
            return;
        }
        
        for (const [name, info] of Object.entries(sheetData)) {
            // Soek of die produk reeds in products.js bestaan vir prentjies
            const existingProduct = products.find(p => p.name === name);
            
            dynamicProducts.push({
                id: existingProduct ? existingProduct.id : index++,
                name: name,
                description: existingProduct ? existingProduct.description : "Heerlike bederf van Bergsig DV.",
                date: existingProduct ? existingProduct.date : "",
                price: info.price,
                image: existingProduct ? existingProduct.image : "https://via.placeholder.com/400x300?text=Heerlike+Ete",
                stock: info.stock // Stoor voorraad
            });
        }
        
        // Teken slegs die beskikbare produkte met hul nuwe pryse in die volgorde van die Google Sheet
        renderProducts(dynamicProducts);
        
        // Versteek die laai boodskap en wys die grid
        const loadingMsg = document.getElementById('loading-message');
        if (loadingMsg) loadingMsg.style.display = 'none';
        
        const grid = document.getElementById('products-grid');
        if (grid) grid.style.display = 'grid';
        
        // As ons besig is om te checkout, doen die validasie NOU met die vars data
        if (window.isCheckingOut) {
            window.isCheckingOut = false; // Reset flag
            
            // Herstel die knoppie
            checkoutBtn.textContent = "Gaan na Betaalpunt";
            checkoutBtn.style.opacity = "1";
            checkoutBtn.disabled = false;
            
            let hasError = false;
            let errorMsg = "Die volgende items se voorraad het intussen verander:\n\n";
            
            cart.forEach(item => {
                const productInfo = dynamicProducts.find(p => p.id === item.id);
                if (productInfo && item.quantity > productInfo.stock) {
                    hasError = true;
                    if (productInfo.stock > 0) {
                        errorMsg += `- ${item.name}: Jammer, daar is net ${productInfo.stock} beskikbaar en jy het ${item.quantity} bestel.\n`;
                        item.quantity = productInfo.stock;
                    } else {
                        errorMsg += `- ${item.name}: Jammer, hierdie item het intussen heeltemal uitverkoop.\n`;
                        item.quantity = 0;
                    }
                }
            });
            
            if (hasError) {
                alert(errorMsg + "\nOns het u mandjie outomaties aangepas na wat wel beskikbaar is.");
                cart = cart.filter(item => item.quantity > 0);
                updateCartUI();
                return; // Stop die checkout proses
            }
            
            // Alles is veilig! Maak die vorm oop.
            cartOverlay.classList.remove('active');
            checkoutOverlay.classList.add('active');
        }
    };

    function fetchStock() {
        if (!GOOGLE_WEB_APP_URL || GOOGLE_WEB_APP_URL.includes("HIER_KOPPEL_ONS_DIE_SKAKEL")) return;
        const script = document.createElement('script');
        script.src = GOOGLE_WEB_APP_URL + "?callback=updateStockUI";
        document.body.appendChild(script);
    }
    
    // Roep fetchStock wanneer app laai
    setTimeout(fetchStock, 500);

    // Hanteer die antwoord van Google nadat bestelling geplaas is
    window.onOrderSuccess = function(response) {
        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        
        if (response.type === "stock_insufficient") {
            let errorMsg = "Ongelukkig het die voorraad verander terwyl u die vorm ingevul het:\n\n";
            // Dateer die mandjie aan met die regte syfers vanaf die server
            if (response.items) {
                response.items.forEach(issue => {
                    const cartItem = cart.find(item => item.name === issue.name);
                    if (cartItem) {
                        if (issue.available > 0) {
                            errorMsg += `- ${issue.name}: Jammer, daar is net ${issue.available} beskikbaar en jy het ${issue.requested} bestel.\n`;
                            cartItem.quantity = issue.available;
                        } else {
                            errorMsg += `- ${issue.name}: Jammer, hierdie item is heeltemal uitverkoop.\n`;
                            cartItem.quantity = 0;
                        }
                    }
                });
                cart = cart.filter(item => item.quantity > 0);
            }
            
            alert(errorMsg + "\nOns het u mandjie outomaties aangepas. Gaan asseblief u mandjie na en probeer weer.");
            updateCartUI();
            
            // Bring kliënt terug na die mandjie om aan te pas
            checkoutForm.classList.remove('hidden');
            checkoutOverlay.classList.remove('active');
            if (cart.length > 0) {
                cartOverlay.classList.add('active');
            }
            
            submitBtn.textContent = "Plaas Bestelling";
            submitBtn.disabled = false;
            
            // Haal weer die voorraad om die 'Uitverkoop' banners te wys
            fetchStock();
            return;
        }
        
        if (response.error) {
            alert("Fout met bestelling: " + response.error);
            submitBtn.textContent = "Plaas Bestelling";
            submitBtn.disabled = false;
            return;
        } 
        
        if (response.result === "success") {
            const orderNum = response.orderNumber;
            const orderNumberDisplay = document.getElementById('order-number-display');
            if (orderNumberDisplay) {
                orderNumberDisplay.textContent = "Bestelnommer: " + orderNum;
            }
            
            // Update SnapScan link en QR Kode met ALS0527 en die bestelnommer
            const snapscanUrl = `https://pos.snapscan.io/qr/ALS0527?id=Oppihoek${orderNum}&amount=${window.currentTotalCents}`;
            
            const snapscanLink = document.getElementById('snapscan-link');
            if (snapscanLink) {
                snapscanLink.href = snapscanUrl;
            }
            
            const snapscanQr = document.getElementById('snapscan-qr');
            if (snapscanQr) {
                // Gebruik die amptelike API (of betroubare qrserver)
                snapscanQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(snapscanUrl)}`;
                snapscanQr.style.display = "block";
            }
            
            // Dateer EFT verwysing op
            const eftRef = document.getElementById('eft-reference');
            if (eftRef) {
                eftRef.textContent = "Oppihoek" + orderNum;
            }
            
            // Hide form, show success
            checkoutForm.classList.add('hidden');
            orderSuccess.classList.remove('hidden');
            
            // Clear cart
            cart = [];
            updateCartUI();
            
            // Herstel knoppie vir volgende keer
            submitBtn.textContent = "Plaas Bestelling";
            submitBtn.disabled = false;
        }
    };

    // Submit Checkout Form
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Calculate total in cents and summary
        const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        const totalCents = Math.round(totalPrice * 100);
        window.currentTotalCents = totalCents; // Stoor vir die callback
        
        let summary = "";
        let itemsList = [];
        cart.forEach(item => {
            summary += `${item.quantity}x ${item.name} (${item.date})\n`;
            itemsList.push({
                id: item.id,
                name: item.name,
                date: item.date,
                quantity: item.quantity,
                price: item.price,
                lineTotal: item.price * item.quantity
            });
        });
        
        // Disable knoppie
        const submitBtn = checkoutForm.querySelector('button[type="submit"]');
        const oldText = submitBtn.textContent;
        submitBtn.textContent = "Stuur bestelling...";
        submitBtn.disabled = true;

        // Versamel vorm data
        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            notes: document.getElementById('notes').value,
            orderSummary: summary,
            items: itemsList,
            total: totalPrice
        };

        // Stuur na Google Sheets met JSONP sodat ons die antwoord kan lees
        if (!GOOGLE_WEB_APP_URL || GOOGLE_WEB_APP_URL.includes("HIER_KOPPEL_ONS_DIE_SKAKEL")) {
            alert("Wag asseblief vir admin om die Google skakel te koppel.");
            submitBtn.textContent = oldText;
            submitBtn.disabled = false;
            return;
        }
        
        const url = new URL(GOOGLE_WEB_APP_URL);
        url.searchParams.append('action', 'order');
        url.searchParams.append('callback', 'onOrderSuccess');
        url.searchParams.append('payload', JSON.stringify(data));
        
        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = function() {
            alert("Daar was 'n fout om die bestelling te plaas. Probeer asseblief weer.");
            submitBtn.textContent = oldText;
            submitBtn.disabled = false;
        };
        document.body.appendChild(script);
    });

    // Close success message
    closeSuccessBtn.addEventListener('click', () => {
        checkoutOverlay.classList.remove('active');
        // Reset form for next time
        setTimeout(() => {
            checkoutForm.reset();
            checkoutForm.classList.remove('hidden');
            orderSuccess.classList.add('hidden');
        }, 300);
    });
}

// Add item to cart
function addToCart(id) {
    const product = window.currentDynamicProducts.find(p => p.id === id);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        if (existingItem.quantity + 1 > product.stock) {
            alert(`Jammer, daar is slegs ${product.stock} beskikbaar van ${product.name}.`);
            return;
        }
        existingItem.quantity += 1;
    } else {
        if (product.stock < 1) {
            alert(`Jammer, ${product.name} is uitverkoop.`);
            return;
        }
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
}

// Update item quantity
function updateQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (item) {
        const newQty = item.quantity + change;
        
        // As ons probeer meer byvoeg as wat in voorraad is
        if (change > 0 && window.currentDynamicProducts) {
            const productInfo = window.currentDynamicProducts.find(p => p.id === id);
            if (productInfo && newQty > productInfo.stock) {
                alert(`Jammer, daar is slegs ${productInfo.stock} beskikbaar van ${item.name}.`);
                return; // Moenie verder gaan nie
            }
        }
        
        item.quantity = newQty;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        updateCartUI();
    }
}

// Update Cart UI
function updateCartUI() {
    // Update count
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalItems;

    // Update items list
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart"><p>Jou mandjie is leeg.</p></div>';
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.cursor = 'not-allowed';
    } else {
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
        
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-date">${item.date}</div>
                    <div class="cart-item-price">R${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn minus" data-id="${item.id}">-</button>
                    <span class="item-qty">${item.quantity}</span>
                    <button class="qty-btn plus" data-id="${item.id}">+</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemElement);
        });

        // Add event listeners to qty buttons
        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                updateQuantity(parseInt(e.target.dataset.id), -1);
            });
        });
        
        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                updateQuantity(parseInt(e.target.dataset.id), 1);
            });
        });
    }

    // Update total price
    const totalPrice = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    cartTotalPrice.textContent = `R${totalPrice.toFixed(2)}`;
    
    // Herteken die hoofblad as ons klaar voorraad het sodat die +/- tellers wys
    if (window.currentDynamicProducts) {
        renderProducts(window.currentDynamicProducts);
    }
}

// Run init
init();
