// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections for fade-in animation
document.querySelectorAll('.concept-card, .feature-card, .benefit-item, .challenge-item').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Button click handlers
document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
    // Ignorer le bouton "Ajouter au panier" qui a son propre handler
    if (button.id === 'addPlaqueToCart') {
        return;
    }
    
    button.addEventListener('click', function(e) {
        // Ne pas traiter si c'est le bouton addPlaqueToCart (sécurité supplémentaire)
        if (this.id === 'addPlaqueToCart' || e.target.id === 'addPlaqueToCart' || e.target.closest('#addPlaqueToCart')) {
            return;
        }
        
        const text = this.textContent.trim();
        if (text === 'Get Started' || text === 'Start Free Trial') {
            // Handle sign up
            alert('Redirecting to sign up page...');
        } else if (text === 'Watch Demo') {
            // Handle demo
            alert('Opening demo video...');
        } else if (text === 'Contact Sales' || text === 'Contact') {
            // Handle contact
            window.location.href = 'mailto:contact@goreview.fr';
        } else if (text === 'Launch App') {
            // Handle app launch
            window.open('https://app.goreview.fr', '_blank');
        }
    });
});

// Add scroll effect to navbar
let lastScrollTop = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        navbar.style.transform = 'translateY(-100%)';
    } else {
        navbar.style.transform = 'translateY(0)';
    }
    
    lastScrollTop = scrollTop;
});

// Mobile menu toggle
const toggleButton = document.querySelector('.menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');

if (toggleButton && mobileMenu) {
    const closeMenu = () => {
        mobileMenu.classList.remove('open');
        mobileMenu.hidden = true;
        toggleButton.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
    };

    const openMenu = () => {
        mobileMenu.classList.add('open');
        mobileMenu.hidden = false;
        toggleButton.setAttribute('aria-expanded', 'true');
        document.body.classList.add('menu-open');
    };

    toggleButton.addEventListener('click', () => {
        const isOpen = mobileMenu.classList.contains('open');
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Close on nav click (single-page anchors)
    mobileMenu.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', () => {
            closeMenu();
        });
    });

    // Close on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            closeMenu();
        }
    });
}

// --- Cart & Checkout logic ---
const CART_STORAGE_KEY = 'goreview-cart';
let cartState = { items: [] };

const loadCartFromStorage = () => {
    try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.items)) {
                // Limiter à 1 plaque par commande
                if (parsed.items.length > 1) {
                    cartState = { items: [parsed.items[0]] };
                    saveCartToStorage(); // Sauvegarder la correction
                } else {
                    cartState = { items: parsed.items };
                }
                // Forcer la quantité à 1 pour chaque item
                cartState.items.forEach(item => {
                    if (item.quantity > 1) {
                        item.quantity = 1;
                    }
                });
                if (cartState.items.some(item => item.quantity > 1)) {
                    saveCartToStorage(); // Sauvegarder la correction
                }
            }
        }
    } catch (e) {
        console.warn('Could not load cart from storage:', e);
        cartState = { items: [] };
    }
};

const saveCartToStorage = () => {
    try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
    } catch (e) {
        console.warn('Could not save cart to storage:', e);
    }
};

loadCartFromStorage();

// Mettre à jour l'UI après le chargement du panier
// Utiliser setTimeout pour s'assurer que le DOM est prêt
setTimeout(() => {
    updateCartCount();
    console.log('Panier chargé depuis localStorage:', cartState);
}, 100);

const productCatalog = {
    'plaque-nfc': {
        id: 'plaque-nfc',
        name: 'Plaque NFC GoReview',
        price: 0,
        image: 'photos/product/cardcropped.jpg'
    }
};

const setAddButtonToAddState = () => {
    const button = document.getElementById('addPlaqueToCart');
    if (!button) return;
    button.dataset.viewCart = 'false';
    button.classList.remove('btn-to-cart');
    button.classList.remove('btn-added');
    button.disabled = false;
    button.textContent = 'Ajouter au panier';
};

const setAddButtonToViewCart = () => {
    const button = document.getElementById('addPlaqueToCart');
    if (!button) return;
    button.dataset.viewCart = 'true';
    button.classList.add('btn-to-cart');
    button.disabled = false;
    button.textContent = 'Voir le panier';
};

const cartCountEl = document.querySelector('[data-cart-count]');
const cartItemsContainer = document.querySelector('[data-cart-items]');
const cartEmptyState = document.querySelector('[data-cart-empty]');
const cartTotalEl = document.querySelector('[data-cart-total]');
const cartSubtotalEl = document.querySelector('[data-cart-subtotal]');
const cartSection = document.getElementById('cart') || document.querySelector('.cart-section');

const checkoutCard = document.querySelector('[data-checkout-card]');
const checkoutForm = document.querySelector('[data-checkout-form]');
const submitOrderButton = checkoutForm ? checkoutForm.querySelector('[data-submit-order]') : null;
const orderStatusEl = document.querySelector('[data-order-status]');
// La confirmation sera créée dynamiquement après un envoi réussi

const countrySelect = document.getElementById('order-country');

const formatCurrency = (value) => {
    if (!Number.isFinite(value) || value === 0) {
        return '0,00 €';
    }
    return value.toLocaleString('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const updateCartIcon = () => {
    // Chercher les éléments à chaque appel au cas où ils seraient ajoutés dynamiquement
    const cartIcon = document.querySelector('.cart-icon');
    const cartTab = document.querySelector('.cart-tab');
    if (!cartIcon || !cartTab) {
        console.log('Éléments cart-icon ou cart-tab non trouvés');
        return;
    }
    
    const hasItems = cartState.items.length > 0;
    console.log('Mise à jour de l\'icône du panier, hasItems:', hasItems);
    
    if (hasItems) {
        // Panier plein - cercles remplis
        cartIcon.innerHTML = `
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            <circle cx="9" cy="21" r="1" fill="currentColor"></circle>
            <circle cx="20" cy="21" r="1" fill="currentColor"></circle>
        `;
        cartTab.classList.add('cart-tab--full');
    } else {
        // Panier vide - cercles vides
        cartIcon.innerHTML = `
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        `;
        cartTab.classList.remove('cart-tab--full');
    }
};

const updateCartCount = () => {
    // Chercher l'élément à chaque appel au cas où il serait ajouté dynamiquement
    const cartCountElement = document.querySelector('[data-cart-count]');
    if (!cartCountElement) {
        console.log('Élément data-cart-count non trouvé');
        updateCartIcon(); // Mettre à jour l'icône quand même
        return;
    }
    
    const totalQuantity = cartState.items.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElement.textContent = totalQuantity;
    console.log('Compteur du panier mis à jour:', totalQuantity);
    updateCartIcon();
};

const renderCart = () => {
    updateCartCount();
    saveCartToStorage();

    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';

        if (cartState.items.length === 0) {
            if (cartEmptyState) {
                cartEmptyState.hidden = false;
            }
            if (cartTotalEl) {
                cartTotalEl.textContent = '0,00 €';
            }
            if (cartSubtotalEl) {
                cartSubtotalEl.textContent = '0,00 €';
            }
        } else {
            if (cartEmptyState) {
                cartEmptyState.hidden = true;
            }
            cartState.items.forEach((item) => {
                const product = productCatalog[item.id];
                const productImage = product?.image || 'photos/product/cardcropped.jpg';
                const listItem = document.createElement('li');
                listItem.className = 'order-item';
                listItem.dataset.itemId = item.id;
                listItem.innerHTML = `
                    <div class="order-item-info">
                        <div class="order-item-image">
                            <img src="${productImage}" alt="${item.name}" loading="lazy">
                        </div>
                        <div class="order-item-details">
                            <div class="order-item-name">${item.name}</div>
                            <div class="order-item-quantity">Quantité : ${item.quantity}</div>
                        </div>
                    </div>
                    <div class="order-item-price">${formatCurrency(item.price * item.quantity)}</div>
                `;
                cartItemsContainer.appendChild(listItem);
            });

            const subtotal = cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const total = subtotal; // Free shipping, so total = subtotal
            
            if (cartSubtotalEl) {
                cartSubtotalEl.textContent = formatCurrency(subtotal);
            }
            if (cartTotalEl) {
                cartTotalEl.textContent = formatCurrency(total);
            }
        }
    }

    if (checkoutCard) {
        // Afficher le checkout si le panier contient des items ou si une confirmation est visible
        const hasConfirmation = checkoutCard.querySelector('.order-confirmation') !== null;
        const shouldShowCheckout = cartState.items.length > 0 || hasConfirmation;
        checkoutCard.hidden = !shouldShowCheckout;
    }

    // Désactiver le bouton de soumission si le panier est vide
    if (submitOrderButton) {
        const totalQuantity = cartState.items.reduce((sum, item) => sum + item.quantity, 0);
        submitOrderButton.disabled = totalQuantity === 0;
    }

    if (cartState.items.length > 0) {
        setAddButtonToViewCart();
    } else {
        setAddButtonToAddState();
    }
};

const addItemToCart = (productId) => {
    console.log('addItemToCart appelé avec:', productId);
    console.log('État actuel du panier:', cartState);
    
    const product = productCatalog[productId];
    if (!product) {
        console.warn(`Produit introuvable pour l'ID ${productId}`);
        return;
    }

    // Limiter à 1 plaque par commande
    if (cartState.items.length > 0) {
        showCartToast('⚠️ Une seule plaque par commande (offre limitée)', 'error');
        return;
    }

    const existing = cartState.items.find((item) => item.id === productId);
    if (existing) {
        // Si l'item existe déjà, ne pas augmenter la quantité (limite à 1)
        showCartToast('⚠️ Une seule plaque par commande (offre limitée)', 'error');
        return;
    }

    cartState.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
    });

    console.log('Nouvel état du panier:', cartState);
    
    // Toujours mettre à jour le compteur et l'icône, même si les autres éléments n'existent pas
    updateCartCount();
    saveCartToStorage();
    
    // Afficher un message de succès
    showCartToast('✅ Plaque ajoutée au panier !', 'success');
    
    // Rendre le panier seulement si les éléments existent
    if (cartItemsContainer && cartTotalEl && cartEmptyState) {
        renderCart();
    } else {
        console.log('Éléments de la page cart non trouvés, mise à jour du compteur uniquement');
    }
};

const removeItemFromCart = (productId) => {
    cartState.items = cartState.items.filter((item) => item.id !== productId);
    renderCart();
};

const clearCart = () => {
    cartState.items = [];
    renderCart();
};

const showCartToast = (message, type = 'success') => {
    const cartLink = document.querySelector('.cart-tab');
    if (cartLink && type === 'success') {
        cartLink.classList.add('cart-tab--pulse');
        setTimeout(() => cartLink.classList.remove('cart-tab--pulse'), 1200);
    }

    const existingToast = document.querySelector('.cart-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `cart-toast ${type === 'error' ? 'cart-toast--error' : ''}`;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('is-visible');
    });

    setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 300);
    }, 2200);
};

// Gestionnaire pour le bouton "Ajouter au panier"
function handleAddToCartClick(event) {
    console.log('🔍 handleAddToCartClick appelé');
    
    // Empêcher la propagation
    event.preventDefault();
    event.stopPropagation();
    
    // Trouver le bouton
    const button = event.target.closest('#addPlaqueToCart') || document.getElementById('addPlaqueToCart');
    if (!button) {
        console.error('❌ Bouton addPlaqueToCart non trouvé');
        return;
    }
    
    // Si déjà en mode "Voir le panier", rediriger directement
    if (button.dataset.viewCart === 'true') {
        window.location.href = '/cart.html';
        return;
    }
    
    if (button.disabled) {
        console.log('⚠️ Bouton déjà désactivé');
        return;
    }
    
    // Récupérer le productId
    const productId = button.getAttribute('data-product-id');
    if (!productId) {
        console.error('❌ Product ID manquant');
        return;
    }
    
    console.log('✅ Ajout au panier - Product ID:', productId);
    
    // Ajouter au panier
    try {
        addItemToCart(productId);
        
        setAddButtonToViewCart();
        
        // Animation de l'icône du panier
        animateCartIcon();
        
        console.log('✅ Item ajouté au panier avec succès');
    } catch (error) {
        console.error('❌ Erreur:', error);
        showCartToast('❌ Erreur lors de l\'ajout au panier', 'error');
    }
}

// Animation de l'icône du panier
function animateCartIcon() {
    const cartTab = document.querySelector('.cart-tab');
    if (!cartTab) {
        return;
    }
    
    cartTab.classList.add('cart-tab--pop');
    cartTab.classList.add('cart-tab--pulse');
    
    setTimeout(() => {
        cartTab.classList.remove('cart-tab--pop');
        cartTab.classList.remove('cart-tab--pulse');
    }, 1500);
}

// Initialiser le bouton "Ajouter au panier"
function initAddToCartButton() {
    const button = document.getElementById('addPlaqueToCart');
    if (button) {
        // Vérifier si l'item est déjà dans le panier
        const productId = button.getAttribute('data-product-id');
        const isInCart = cartState.items.some(item => item.id === productId);
        
        // Supprimer les anciens listeners en clonant le bouton
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        if (isInCart) {
            setAddButtonToViewCart();
        } else {
            setAddButtonToAddState();
        }
        newButton.addEventListener('click', handleAddToCartClick);
        console.log('✅ Listener attaché au bouton addPlaqueToCart');
    } else {
        console.log('⚠️ Bouton addPlaqueToCart non trouvé lors de l\'initialisation');
    }
}

// Délégation d'événements globale en backup (capture phase pour intercepter tôt)
document.addEventListener('click', function(event) {
    const button = event.target.closest('#addPlaqueToCart');
    if (!button || button.disabled) {
        return;
    }
    if (!event.defaultPrevented && !button.hasAttribute('data-processing')) {
        button.setAttribute('data-processing', 'true');
        handleAddToCartClick(event);
        setTimeout(() => button.removeAttribute('data-processing'), 100);
    }
}, true);

// Initialiser quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initAddToCartButton, 50);
    });
} else {
    setTimeout(initAddToCartButton, 50);
}

// Réessayer après des délais pour s'assurer que le bouton est trouvé
setTimeout(initAddToCartButton, 100);
setTimeout(initAddToCartButton, 300);
setTimeout(initAddToCartButton, 500);

if (cartItemsContainer) {
    cartItemsContainer.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-action="remove-item"]');
        if (!removeButton) {
            return;
        }
        const listItem = removeButton.closest('[data-item-id]');
        if (!listItem) {
            return;
        }
        const productId = listItem.dataset.itemId;
        removeItemFromCart(productId);
    });
}

const setOrderStatus = (message, type = 'info') => {
    if (!orderStatusEl) return;
    if (!message) {
        orderStatusEl.hidden = true;
        orderStatusEl.textContent = '';
        orderStatusEl.classList.remove('is-error', 'is-success', 'is-info');
        return;
    }

    orderStatusEl.hidden = false;
    orderStatusEl.textContent = message;
    orderStatusEl.classList.remove('is-error', 'is-success', 'is-info');
    if (type === 'error') {
        orderStatusEl.classList.add('is-error');
    } else if (type === 'success') {
        orderStatusEl.classList.add('is-success');
    } else {
        orderStatusEl.classList.add('is-info');
    }
};

const toggleFormLoading = (isLoading) => {
    if (!submitOrderButton) return;
    submitOrderButton.disabled = isLoading;
    if (isLoading) {
        submitOrderButton.dataset.originalText = submitOrderButton.textContent;
        submitOrderButton.textContent = 'Envoi en cours...';
    } else if (submitOrderButton.dataset.originalText) {
        // If success state is set, keep success UI and do not restore
        if (submitOrderButton.dataset.success === 'true') {
            return;
        }
        submitOrderButton.textContent = submitOrderButton.dataset.originalText;
        delete submitOrderButton.dataset.originalText;
    }
};

const highlightFieldError = (fieldId) => {
    const field = document.getElementById(fieldId);
    if (field) {
        field.classList.add('field-error');
        field.focus();
        // Scroll vers le champ en erreur
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

const clearFieldErrors = () => {
    if (!checkoutForm) return;
    const fields = checkoutForm.querySelectorAll('.field-error');
    fields.forEach(field => {
        field.classList.remove('field-error');
    });
};

const showOrderConfirmation = (customerData) => {
    // Sauvegarder les données de confirmation dans sessionStorage
    try {
        sessionStorage.setItem('orderConfirmation', JSON.stringify({
            ...customerData,
            timestamp: new Date().toISOString()
        }));
    } catch (e) {
        console.error('Erreur lors de la sauvegarde de la confirmation', e);
    }

    // Rediriger vers la page de confirmation
    window.location.href = '/confirmation.html';
};

const resetOrderFlow = () => {
    if (!checkoutForm || !checkoutCard) return;
    
    // Supprimer la confirmation dynamique si elle existe
    const existingConfirmation = checkoutCard.querySelector('.order-confirmation');
    if (existingConfirmation) {
        existingConfirmation.remove();
    }
    
    clearCart();
    setOrderStatus('', 'info');
    checkoutForm.reset();
    checkoutForm.hidden = false;
};


const sendOrderToWebhook = async (payload) => {
    const webhookUrl = 'https://n8n.goreview.fr/webhook/commandes';
    console.log('🌐 Appel du webhook:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    let response;
    try {
        response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('📡 Réponse HTTP:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text().catch(() => null);
            console.error('❌ Erreur HTTP:', response.status, errorText);
            throw new Error(errorText || `Erreur ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Erreur réseau lors de l\'appel au webhook:', error);
        throw error;
    }

    // Vérifier que la réponse correspond au format attendu
    let responseData;
    try {
        responseData = await response.json();
    } catch (e) {
        console.error('❌ Erreur lors du parsing JSON:', e);
        throw new Error('Réponse invalide du serveur : format JSON attendu');
    }

    // Flexible validation: accept multiple response formats
    console.log('✅ Webhook response received:', JSON.stringify(responseData, null, 2));
    console.log('📊 Response type:', typeof responseData, 'Is Array:', Array.isArray(responseData));
    
    // Format 1: Array with status object: [{"status": "success"}]
    if (Array.isArray(responseData) && responseData.length > 0 && responseData[0]?.status === 'success') {
        console.log('✅ Webhook validation passed (array format)!');
        return responseData;
    }
    
    // Format 2: Direct object with status: {"status": "success"}
    if (typeof responseData === 'object' && responseData !== null && responseData.status === 'success') {
        console.log('✅ Webhook validation passed (object format)!');
        return [responseData]; // Normalize to array format
    }
    
    // Format 3: Empty array or object (n8n sometimes returns empty on success)
    if ((Array.isArray(responseData) && responseData.length === 0) || 
        (typeof responseData === 'object' && Object.keys(responseData).length === 0)) {
        console.log('✅ Webhook validation passed (empty response - assuming success)!');
        return [{ status: 'success' }];
    }
    
    // Format 4: Any truthy response (workflow executed = success)
    if (responseData) {
        console.log('⚠️ Non-standard response format, but treating as success');
        return [{ status: 'success' }];
    }

    // If we get here, something is wrong
    console.error('❌ Unexpected response format:', responseData);
    throw new Error('Réponse invalide du serveur : format de réponse incorrect');
};

if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('📋 Formulaire soumis - début du traitement');

        // Vérifier que le panier contient au moins un article
        if (!cartState.items.length) {
            console.warn('⚠️ Panier vide');
            setOrderStatus('Ajoutez la plaque gratuite à votre panier avant de confirmer la commande.', 'error');
            return;
        }

        // Vérifier la quantité totale (doit être au moins 1 et au maximum 1)
        const totalQuantity = cartState.items.reduce((sum, item) => sum + item.quantity, 0);
        if (totalQuantity === 0) {
            setOrderStatus('Votre panier est vide. Ajoutez au moins un article avant de passer commande.', 'error');
            return;
        }

        // Vérifier qu'il n'y a qu'une seule plaque (limite à 1 par commande)
        if (cartState.items.length > 1) {
            setOrderStatus('Une seule plaque par commande (offre limitée). Veuillez retirer les plaques supplémentaires.', 'error');
            // Nettoyer le panier pour ne garder que la première plaque
            cartState.items = [cartState.items[0]];
            renderCart();
            return;
        }

        // Vérifier que la quantité totale ne dépasse pas 1
        if (totalQuantity > 1) {
            setOrderStatus('Une seule plaque par commande (offre limitée).', 'error');
            // Forcer la quantité à 1
            cartState.items.forEach(item => {
                item.quantity = 1;
            });
            renderCart();
            return;
        }

        if (!checkoutForm.reportValidity()) {
            return;
        }

        const formData = new FormData(checkoutForm);
        const country = formData.get('country') || 'FR';
        const phonePrefix = formData.get('phonePrefix');
        
        // Sanitize and validate all inputs
        const fullName = sanitizeInput((formData.get('fullName') || '').toString());
        const email = sanitizeInput((formData.get('email') || '').toString());
        const phoneNumber = sanitizeInput((formData.get('phoneNumber') || '').toString());
        const addressLine1 = sanitizeInput((formData.get('address_line1') || '').toString());
        const addressLine2 = sanitizeInput((formData.get('address_line2') || '').toString());
        const postalCode = sanitizeInput((formData.get('postal_code') || '').toString());
        const city = sanitizeInput((formData.get('city') || '').toString());
        const company = sanitizeInput((formData.get('company') || '').toString());
        
        // Validate all fields using validation functions
        const nameValidation = validateName(fullName);
        if (!nameValidation.valid) {
            setOrderStatus(nameValidation.message, 'error');
            showFieldError('order-name', nameValidation.message);
            return;
        }

        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            setOrderStatus(emailValidation.message, 'error');
            showFieldError('order-email', emailValidation.message);
            return;
        }

        const phoneValidation = validatePhone(phoneNumber, phonePrefix);
        if (!phoneValidation.valid) {
            setOrderStatus(phoneValidation.message, 'error');
            showFieldError('order-phone', phoneValidation.message);
            return;
        }

        const addressValidation = validateAddress(addressLine1);
        if (!addressValidation.valid) {
            setOrderStatus(addressValidation.message, 'error');
            showFieldError('order-address-line1', addressValidation.message);
            return;
        }

        const postalValidation = validatePostalCode(postalCode, country);
        if (!postalValidation.valid) {
            setOrderStatus(postalValidation.message, 'error');
            showFieldError('order-postal-code', postalValidation.message);
            return;
        }

        const cityValidation = validateCity(city);
        if (!cityValidation.valid) {
            setOrderStatus(cityValidation.message, 'error');
            showFieldError('order-city', cityValidation.message);
            return;
        }

        // Build full address string from individual fields
        const addressParts = [addressLine1];
        if (addressLine2) {
            addressParts.push(addressLine2);
        }
        addressParts.push(postalCode, city);
        const address = addressParts.filter(part => part).join(', ');

        // Clean phone number for storage
        let cleanPhoneNumber = phoneNumber.replace(/[\s.\-()]/g, '');
        if (cleanPhoneNumber.startsWith('0') && cleanPhoneNumber.length === 10) {
            cleanPhoneNumber = cleanPhoneNumber.substring(1);
        }

        // Réinitialiser les erreurs de champ
        clearFieldErrors();

        const fullPhone = `${phonePrefix} ${cleanPhoneNumber}`.trim();

        const payload = {
            cart: cartState.items.map((item) => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
            })),
            totals: {
                subtotal: 0,
                shipping: 0,
                total: 0,
                currency: 'EUR'
            },
            customer: {
                fullName,
                email,
                phone: fullPhone,
                phonePrefix,
                phoneNumber: cleanPhoneNumber,
                address,
                addressLine1,
                addressLine2,
                postalCode,
                city,
                company,
                country
            },
            metadata: {
                source: 'landing-page',
                submittedAt: new Date().toISOString()
            }
        };

        try {
            console.log('📤 Envoi de la commande au webhook...', payload);
            setOrderStatus('Envoi de votre commande...', 'info');
            toggleFormLoading(true);
            const result = await sendOrderToWebhook(payload);
            console.log('✅ Réponse du webhook reçue:', result);
            // Show success state on the submit button and status
            setOrderStatus('Commande envoyée avec succès.', 'success');
            if (submitOrderButton) {
                submitOrderButton.dataset.success = 'true';
                submitOrderButton.classList.add('btn-added');
                submitOrderButton.disabled = true;
                submitOrderButton.textContent = 'Commande envoyée ✓';
            }
            clearCart();
            // Brief delay to let the user see the success state before redirect
            setTimeout(() => {
                showOrderConfirmation({
                    fullName,
                    email,
                    phone: fullPhone,
                    address,
                    addressLine1,
                    addressLine2,
                    postalCode,
                    city,
                    company
                });
            }, 700);
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la commande', error);
            // Afficher un message d'erreur spécifique selon le type d'erreur
            let errorMessage = 'Impossible d\'envoyer la commande. Merci de réessayer ou de nous contacter.';
            if (error.message && (
                error.message.includes('format de réponse incorrect') || 
                error.message.includes('format JSON attendu')
            )) {
                errorMessage = 'Erreur de communication avec le serveur. Veuillez réessayer dans quelques instants.';
            }
            setOrderStatus(errorMessage, 'error');
        } finally {
            toggleFormLoading(false);
        }
    });
}

// Security: Sanitize input to prevent XSS
const sanitizeInput = (value) => {
    if (typeof value !== 'string') return '';
    // Remove potentially dangerous characters but keep valid form data
    return value.trim().replace(/[<>]/g, '');
};

// Validation functions
const validateEmail = (email) => {
    if (!email) return { valid: false, message: 'L\'email est requis.' };
    const sanitized = sanitizeInput(email);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
        return { valid: false, message: 'Format d\'email invalide (ex: nom@exemple.com).' };
    }
    if (sanitized.length > 254) {
        return { valid: false, message: 'L\'email est trop long (maximum 254 caractères).' };
    }
    return { valid: true, message: '' };
};

const validatePhone = (phoneNumber, phonePrefix) => {
    if (!phoneNumber) return { valid: false, message: 'Le numéro de téléphone est requis.' };
    const sanitized = sanitizeInput(phoneNumber);
    // Remove spaces, dots, dashes, parentheses
    let cleanPhone = sanitized.replace(/[\s.\-()]/g, '');
    // Remove leading 0 if present (for FR/CH format)
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
        cleanPhone = cleanPhone.substring(1);
    }
    // Must be exactly 9 digits
    if (!/^\d{9}$/.test(cleanPhone)) {
        const prefix = phonePrefix === '+33' ? 'français' : 'suisse';
        return { valid: false, message: `Le numéro de téléphone ${prefix} doit contenir exactement 9 chiffres (ex: 6 12 34 56 78).` };
    }
    return { valid: true, message: '', cleaned: cleanPhone };
};

const validateName = (name) => {
    if (!name) return { valid: false, message: 'Le nom est requis.' };
    const sanitized = sanitizeInput(name);
    if (sanitized.length < 2) {
        return { valid: false, message: 'Le nom doit contenir au moins 2 caractères.' };
    }
    if (sanitized.length > 50) {
        return { valid: false, message: 'Le nom est trop long (maximum 50 caractères).' };
    }
    const nameWords = sanitized.split(/\s+/).filter(word => word.length > 0);
    if (nameWords.length < 2) {
        return { valid: false, message: 'Le nom complet doit contenir au moins 2 mots (ex: "Jean Dupont").' };
    }
    return { valid: true, message: '' };
};

const validatePostalCode = (postalCode, country) => {
    if (!postalCode) return { valid: false, message: 'Le code postal est requis.' };
    const sanitized = sanitizeInput(postalCode).replace(/\s/g, '');
    if (country === 'FR') {
        if (!/^\d{5}$/.test(sanitized)) {
            return { valid: false, message: 'Le code postal français doit contenir 5 chiffres (ex: 75001).' };
        }
    } else if (country === 'CH') {
        if (!/^\d{4}$/.test(sanitized)) {
            return { valid: false, message: 'Le code postal suisse doit contenir 4 chiffres (ex: 1200).' };
        }
    }
    return { valid: true, message: '' };
};

const validateAddress = (address) => {
    if (!address) return { valid: false, message: 'L\'adresse est requise.' };
    const sanitized = sanitizeInput(address);
    if (sanitized.length < 5) {
        return { valid: false, message: 'L\'adresse doit contenir au moins 5 caractères.' };
    }
    if (sanitized.length > 100) {
        return { valid: false, message: 'L\'adresse est trop longue (maximum 100 caractères).' };
    }
    return { valid: true, message: '' };
};

const validateCity = (city) => {
    if (!city) return { valid: false, message: 'La ville est requise.' };
    const sanitized = sanitizeInput(city);
    if (sanitized.length < 2) {
        return { valid: false, message: 'La ville doit contenir au moins 2 caractères.' };
    }
    if (sanitized.length > 50) {
        return { valid: false, message: 'La ville est trop longue (maximum 50 caractères).' };
    }
    return { valid: true, message: '' };
};

// Show/hide field error message
const showFieldError = (fieldId, message) => {
    const field = document.getElementById(fieldId);
    // Map field IDs to error element IDs
    const errorIdMap = {
        'order-email': 'email-error',
        'order-name': 'name-error',
        'order-phone': 'phone-error',
        'order-address-line1': 'address-error',
        'order-postal-code': 'postal-error',
        'order-city': 'city-error'
    };
    const errorId = errorIdMap[fieldId] || fieldId.replace('order-', '') + '-error';
    const errorEl = document.getElementById(errorId);
    if (field) {
        field.classList.add('field-error');
    }
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
    }
};

const hideFieldError = (fieldId) => {
    const field = document.getElementById(fieldId);
    // Map field IDs to error element IDs
    const errorIdMap = {
        'order-email': 'email-error',
        'order-name': 'name-error',
        'order-phone': 'phone-error',
        'order-address-line1': 'address-error',
        'order-postal-code': 'postal-error',
        'order-city': 'city-error'
    };
    const errorId = errorIdMap[fieldId] || fieldId.replace('order-', '') + '-error';
    const errorEl = document.getElementById(errorId);
    if (field) {
        field.classList.remove('field-error');
    }
    if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = '';
    }
};

// Real-time validation on input
if (checkoutForm) {
    const nameInput = document.getElementById('order-name');
    const emailInput = document.getElementById('order-email');
    const phoneInput = document.getElementById('order-phone');
    const phonePrefixSelect = document.getElementById('order-phone-prefix');
    const addressLine1Input = document.getElementById('order-address-line1');
    const postalCodeInput = document.getElementById('order-postal-code');
    const cityInput = document.getElementById('order-city');
    const countrySelect = document.getElementById('order-country');

    // Email validation
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            const result = validateEmail(emailInput.value);
            if (result.valid) {
                hideFieldError('order-email');
            } else {
                showFieldError('order-email', result.message);
            }
        });
        emailInput.addEventListener('blur', () => {
            const result = validateEmail(emailInput.value);
            if (!result.valid && emailInput.value) {
                showFieldError('order-email', result.message);
            }
        });
    }

    // Phone validation
    const validatePhoneField = () => {
        if (phoneInput && phonePrefixSelect) {
            const result = validatePhone(phoneInput.value, phonePrefixSelect.value);
            if (result.valid) {
                hideFieldError('order-phone');
            } else {
                showFieldError('order-phone', result.message);
            }
        }
    };
    if (phoneInput) {
        phoneInput.addEventListener('input', validatePhoneField);
        phoneInput.addEventListener('blur', validatePhoneField);
    }
    if (phonePrefixSelect) {
        phonePrefixSelect.addEventListener('change', validatePhoneField);
    }

    // Name validation
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            const result = validateName(nameInput.value);
            if (result.valid) {
                hideFieldError('order-name');
            } else {
                showFieldError('order-name', result.message);
            }
        });
        nameInput.addEventListener('blur', () => {
            const result = validateName(nameInput.value);
            if (!result.valid && nameInput.value) {
                showFieldError('order-name', result.message);
            }
        });
    }

    // Address validation
    if (addressLine1Input) {
        addressLine1Input.addEventListener('input', () => {
            const result = validateAddress(addressLine1Input.value);
            if (result.valid) {
                hideFieldError('order-address-line1');
            } else {
                showFieldError('order-address-line1', result.message);
            }
        });
    }

    // Postal code validation
    const validatePostalField = () => {
        if (postalCodeInput && countrySelect) {
            const result = validatePostalCode(postalCodeInput.value, countrySelect.value);
            if (result.valid) {
                hideFieldError('order-postal-code');
            } else {
                showFieldError('order-postal-code', result.message);
            }
        }
    };
    if (postalCodeInput) {
        postalCodeInput.addEventListener('input', validatePostalField);
    }
    if (countrySelect) {
        countrySelect.addEventListener('change', validatePostalField);
    }

    // City validation
    if (cityInput) {
        cityInput.addEventListener('input', () => {
            const result = validateCity(cityInput.value);
            if (result.valid) {
                hideFieldError('order-city');
            } else {
                showFieldError('order-city', result.message);
            }
        });
    }
}

// Initialize cart on page load
renderCart();

// If on cart page and cart is empty, show message
if (window.location.pathname === '/cart' || window.location.pathname === '/cart.html') {
    if (cartState.items.length === 0) {
        // Cart is empty, checkout should be hidden
        if (checkoutCard) {
            checkoutCard.hidden = true;
        }
    }
}

// Hero card animation is now handled entirely by CSS (3D rotation)

// --- Checkout Address Autocomplete (Google Places) ---
let checkoutAddressAutocompleteInitialized = false;

const checkoutAddressComponent = (components, type) => {
    if (!components || !Array.isArray(components)) return '';
    const component = components.find((c) => Array.isArray(c.types) && c.types.includes(type));
    return component ? component.long_name : '';
};

const hydrateCheckoutAddressFields = (place, elements) => {
    if (!place || !place.address_components) return;
    const components = place.address_components;

    const streetNumber = checkoutAddressComponent(components, 'street_number');
    const route = checkoutAddressComponent(components, 'route');
    const locality = checkoutAddressComponent(components, 'locality')
        || checkoutAddressComponent(components, 'postal_town')
        || checkoutAddressComponent(components, 'sublocality_level_1');
    const postalCode = checkoutAddressComponent(components, 'postal_code');
    const countryCode = checkoutAddressComponent(components, 'country');

    const formattedStreet = [streetNumber, route].filter(Boolean).join(' ').trim();
    if (formattedStreet && elements.addressInput) {
        elements.addressInput.value = formattedStreet;
        elements.addressInput.dispatchEvent(new Event('input'));
    }

    if (postalCode && elements.postalInput) {
        elements.postalInput.value = postalCode;
        elements.postalInput.dispatchEvent(new Event('input'));
    }

    if (locality && elements.cityInput) {
        elements.cityInput.value = locality;
        elements.cityInput.dispatchEvent(new Event('input'));
    }

    if (countryCode && elements.countrySelect) {
        const normalizedCountry = countryCode.toUpperCase();
        const matchingOption = Array.from(elements.countrySelect.options).find(
            (opt) => opt.value.toUpperCase() === normalizedCountry
        );
        if (matchingOption) {
            elements.countrySelect.value = matchingOption.value;
        }
    }

    return {
        street: formattedStreet || place.formatted_address || ''
    };
};

const setupCheckoutAddressAutocomplete = () => {
    if (checkoutAddressAutocompleteInitialized) {
        return;
    }

    const addressInput = document.getElementById('order-address-line1');
    if (!addressInput) {
        return;
    }

    if (!(window.google && window.google.maps && window.google.maps.places)) {
        console.warn('Google Places API non disponible pour l\'adresse du checkout.');
        return;
    }

    checkoutAddressAutocompleteInitialized = true;

    const postalInput = document.getElementById('order-postal-code');
    const cityInput = document.getElementById('order-city');
    const countrySelect = document.getElementById('order-country');

    const autocompleteService = new google.maps.places.AutocompleteService();
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));

    const suggestionsWrapper = document.createElement('div');
    suggestionsWrapper.className = 'checkout-address-suggestions';
    suggestionsWrapper.innerHTML = `
        <div class="address-suggestions">
            <div class="address-suggestions-header">
                <span>SUGGESTIONS</span>
            </div>
            <div class="address-suggestions-list"></div>
        </div>
    `;
    const suggestionsList = suggestionsWrapper.querySelector('.address-suggestions-list');
    const suggestionsContainer = suggestionsWrapper.querySelector('.address-suggestions');
    suggestionsContainer.hidden = true;
    addressInput.parentElement.appendChild(suggestionsWrapper);

    let predictionTimer;
    let latestInputValue = '';
    let suppressProgrammaticAddressInput = false;

    const hideSuggestions = () => {
        suggestionsContainer.hidden = true;
        suggestionsList.innerHTML = '';
    };

    const handleSuggestionSelect = (prediction) => {
        hideSuggestions();
        addressInput.blur();
        addressInput.setAttribute('readonly', 'readonly');

        placesService.getDetails({
            placeId: prediction.place_id,
            fields: ['address_components', 'formatted_address']
        }, (place, status) => {
            addressInput.removeAttribute('readonly');
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                console.warn('Impossible de récupérer les détails du lieu', status);
                return;
            }

            suppressProgrammaticAddressInput = true;
            const { street } = hydrateCheckoutAddressFields(place, { addressInput, postalInput, cityInput, countrySelect }) || {};
            if (street) {
                addressInput.value = street;
            } else if (place.formatted_address) {
                addressInput.value = place.formatted_address;
            }
            addressInput.dataset.placeSelected = 'true';
            suppressProgrammaticAddressInput = false;
        });
    };

    const renderSuggestions = (predictions) => {
        suggestionsList.innerHTML = '';
        if (!predictions || !predictions.length) {
            hideSuggestions();
            return;
        }

        predictions.forEach((prediction) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'address-suggestion';
            const main = prediction.structured_formatting?.main_text || prediction.description;
            const secondary = prediction.structured_formatting?.secondary_text || '';
            item.innerHTML = `
                <span class="address-suggestion-icon">📍</span>
                <span>
                    <span class="address-suggestion-main">${main}</span>
                    ${secondary ? `<span class="address-suggestion-secondary">${secondary}</span>` : ''}
                </span>
            `;
            item.addEventListener('click', () => handleSuggestionSelect(prediction));
            suggestionsList.appendChild(item);
        });
        suggestionsContainer.hidden = false;
    };

    const fetchPredictions = (value) => {
        if (!value || value.length < 3) {
            hideSuggestions();
            return;
        }

        autocompleteService.getPlacePredictions({
            input: value,
            componentRestrictions: { country: ['fr', 'ch'] },
            types: ['address'],
            language: 'fr'
        }, (predictions, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                hideSuggestions();
                return;
            }
            renderSuggestions(predictions);
        });
    };

    const schedulePredictions = () => {
        clearTimeout(predictionTimer);
        predictionTimer = setTimeout(() => {
            fetchPredictions(latestInputValue);
        }, 200);
    };

    addressInput.addEventListener('input', (event) => {
        if (suppressProgrammaticAddressInput) {
            suppressProgrammaticAddressInput = false;
            return;
        }
        addressInput.dataset.placeSelected = 'false';
        addressInput.removeAttribute('readonly');
        latestInputValue = event.target.value.trim();
        if (!latestInputValue) {
            hideSuggestions();
            return;
        }
        schedulePredictions();
    });

    addressInput.addEventListener('focus', () => {
        addressInput.setAttribute('autocomplete', 'off');
        if (addressInput.dataset.placeSelected === 'true') {
            hideSuggestions();
            return;
        }

        if (addressInput.value.trim().length >= 3) {
            latestInputValue = addressInput.value.trim();
            schedulePredictions();
        }
    });

    addressInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !suggestionsContainer.hidden) {
            event.preventDefault();
        }
    });

    document.addEventListener('click', (event) => {
        if (!suggestionsWrapper.contains(event.target) && event.target !== addressInput) {
            hideSuggestions();
        }
    });

    console.log('Autocomplete personnalisé activé pour l\'adresse du checkout.');
};

const requestCheckoutAddressAutocompleteInit = () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupCheckoutAddressAutocomplete();
        }, { once: true });
    } else {
        setupCheckoutAddressAutocomplete();
    }
};

// Callback utilisé par le script Google Places (voir cart.html)
window.initCheckoutAddressAutocomplete = () => {
    requestCheckoutAddressAutocompleteInit();
};

// Si Google Places est déjà chargé avant l'insertion du script (rare mais possible), initialiser immédiatement
if (window.google && window.google.maps && window.google.maps.places) {
    requestCheckoutAddressAutocompleteInit();
}

// Handle checkout submit button click (button is outside the form)
function setupCheckoutSubmitButton() {
    const checkoutSubmitButton = document.querySelector('.checkout-submit');
    const form = document.querySelector('[data-checkout-form]');
    
    if (!checkoutSubmitButton) {
        console.warn('⚠️ Bouton checkout-submit non trouvé');
        return;
    }
    
    if (!form) {
        console.warn('⚠️ Formulaire checkout non trouvé');
        return;
    }
    
    // Remove existing listeners by cloning the button
    const newButton = checkoutSubmitButton.cloneNode(true);
    checkoutSubmitButton.parentNode.replaceChild(newButton, checkoutSubmitButton);
    
    // Add click handler
    newButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('🔵 Bouton "Confirmer la commande" cliqué');
        
        // Check if form exists and is valid
        const currentForm = document.querySelector('[data-checkout-form]');
        if (!currentForm) {
            console.error('❌ Formulaire non trouvé lors du clic');
            setOrderStatus('Erreur: formulaire non trouvé. Veuillez recharger la page.', 'error');
            return;
        }
        
        // Trigger form submission
        try {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const submitted = currentForm.dispatchEvent(submitEvent);
            if (!submitted) {
                console.warn('⚠️ Soumission du formulaire annulée');
            } else {
                console.log('✅ Événement submit déclenché');
            }
        } catch (error) {
            console.error('❌ Erreur lors de la soumission:', error);
            setOrderStatus('Erreur lors de la soumission. Veuillez réessayer.', 'error');
        }
    });
    
    console.log('✅ Handler du bouton checkout configuré');
}

// Setup on DOM ready and also retry after a delay for dynamic content
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupCheckoutSubmitButton();
        // Retry after a short delay in case checkout card is shown dynamically
        setTimeout(setupCheckoutSubmitButton, 500);
        setTimeout(setupCheckoutSubmitButton, 1000);
    });
} else {
    setupCheckoutSubmitButton();
    // Retry after a short delay in case checkout card is shown dynamically
    setTimeout(setupCheckoutSubmitButton, 500);
    setTimeout(setupCheckoutSubmitButton, 1000);
}

// Watch for checkout card visibility changes
if (checkoutCard) {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
                if (!checkoutCard.hidden) {
                    console.log('👁️ Checkout card visible, setup du bouton...');
                    setTimeout(setupCheckoutSubmitButton, 100);
                }
            }
        });
    });
    observer.observe(checkoutCard, { attributes: true, attributeFilter: ['hidden'] });
}

// Product Gallery Swipe Functionality
(function() {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;

    const container = gallery.querySelector('.product-gallery-container');
    const slides = gallery.querySelectorAll('.product-gallery-slide');
    const dots = gallery.querySelectorAll('.gallery-dot');
    
    if (!container || slides.length === 0) return;

    let currentSlide = 0;
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    let scrollLeft = 0;

    // Initialize: show first slide
    updateSlide(0);

    // Touch events for mobile
    container.addEventListener('touchstart', (e) => {
        isDragging = true;
        startX = e.touches[0].pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
        container.style.scrollBehavior = 'auto';
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.touches[0].pageX - container.offsetLeft;
        const walk = (currentX - startX) * 2;
        container.scrollLeft = scrollLeft - walk;
    }, { passive: false });

    container.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        container.style.scrollBehavior = 'smooth';
        
        // Determine which slide to snap to
        const slideWidth = container.offsetWidth;
        const newSlide = Math.round(container.scrollLeft / slideWidth);
        updateSlide(Math.max(0, Math.min(newSlide, slides.length - 1)));
    }, { passive: true });

    // Mouse events for desktop drag
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseScrollLeft = 0;

    container.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        mouseStartX = e.pageX - container.offsetLeft;
        mouseScrollLeft = container.scrollLeft;
        container.style.scrollBehavior = 'auto';
        container.style.cursor = 'grabbing';
    });

    container.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const walk = (x - mouseStartX) * 2;
        container.scrollLeft = mouseScrollLeft - walk;
    });

    container.addEventListener('mouseup', () => {
        if (!isMouseDown) return;
        isMouseDown = false;
        container.style.scrollBehavior = 'smooth';
        container.style.cursor = 'grab';
        
        const slideWidth = container.offsetWidth;
        const newSlide = Math.round(container.scrollLeft / slideWidth);
        updateSlide(Math.max(0, Math.min(newSlide, slides.length - 1)));
    });

    container.addEventListener('mouseleave', () => {
        if (isMouseDown) {
            isMouseDown = false;
            container.style.scrollBehavior = 'smooth';
            container.style.cursor = 'grab';
            
            const slideWidth = container.offsetWidth;
            const newSlide = Math.round(container.scrollLeft / slideWidth);
            updateSlide(Math.max(0, Math.min(newSlide, slides.length - 1)));
        }
    });

    // Scroll event to update active slide
    container.addEventListener('scroll', () => {
        const slideWidth = container.offsetWidth;
        const newSlide = Math.round(container.scrollLeft / slideWidth);
        if (newSlide !== currentSlide) {
            updateSlide(newSlide);
        }
    }, { passive: true });

    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            updateSlide(index);
            container.scrollTo({
                left: index * container.offsetWidth,
                behavior: 'smooth'
            });
        });
    });

    function updateSlide(index) {
        currentSlide = index;
        
        // Update slides
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        
        // Update dots
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    // Set cursor style
    container.style.cursor = 'grab';
})();

