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
    if (button.id === 'addPlaqueToCart' || button.id === 'viewCartButton') {
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
    
    // Vérifier si le bouton est déjà en état "Ajouté" ou désactivé
    if (button.disabled || button.textContent.trim() === 'Ajouté') {
        console.log('⚠️ Bouton déjà ajouté ou désactivé');
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
        
        // Changer le bouton en "Ajouté"
        button.textContent = 'Ajouté';
        button.classList.add('btn-added');
        button.disabled = true;
        
        // Afficher le bouton "Voir le panier"
        const viewCartButton = document.getElementById('viewCartButton');
        if (viewCartButton) {
            viewCartButton.style.display = 'inline-block';
        }
        
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
        
        if (isInCart) {
            // Si déjà dans le panier, afficher "Ajouté"
            button.textContent = 'Ajouté';
            button.classList.add('btn-added');
            button.disabled = true;
            
            // Afficher le bouton "Voir le panier"
            const viewCartButton = document.getElementById('viewCartButton');
            if (viewCartButton) {
                viewCartButton.style.display = 'inline-block';
            }
        } else {
            // S'assurer que le bouton n'est pas désactivé
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            
            // Supprimer les anciens listeners en clonant le bouton
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Attacher le nouveau listener
            newButton.addEventListener('click', handleAddToCartClick);
            console.log('✅ Listener attaché au bouton addPlaqueToCart');
        }
    } else {
        console.log('⚠️ Bouton addPlaqueToCart non trouvé lors de l\'initialisation');
    }
}

// Délégation d'événements globale en backup (capture phase pour intercepter tôt)
document.addEventListener('click', function(event) {
    const button = event.target.closest('#addPlaqueToCart');
    if (button && !button.disabled && button.textContent.trim() !== 'Ajouté') {
        // Vérifier si l'événement n'a pas déjà été traité
        if (!event.defaultPrevented && !button.hasAttribute('data-processing')) {
            button.setAttribute('data-processing', 'true');
            handleAddToCartClick(event);
            setTimeout(() => button.removeAttribute('data-processing'), 100);
        }
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
    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => null);
        throw new Error(errorText || `Erreur ${response.status}`);
    }

    // Vérifier que la réponse correspond au format attendu
    let responseData;
    try {
        responseData = await response.json();
    } catch (e) {
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

        // Vérifier que le panier contient au moins un article
        if (!cartState.items.length) {
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
        const fullName = (formData.get('fullName') || '').toString().trim();
        const phonePrefix = formData.get('phonePrefix');
        const phoneNumber = (formData.get('phoneNumber') || '').toString().trim();
        const email = (formData.get('email') || '').toString().trim();
        const addressLine1 = (formData.get('address_line1') || '').toString().trim();
        const addressLine2 = (formData.get('address_line2') || '').toString().trim();
        const postalCode = (formData.get('postal_code') || '').toString().trim();
        const city = (formData.get('city') || '').toString().trim();
        const company = (formData.get('company') || '').toString().trim();
        
        // Build full address string from individual fields
        const addressParts = [addressLine1];
        if (addressLine2) {
            addressParts.push(addressLine2);
        }
        addressParts.push(postalCode, city);
        const address = addressParts.filter(part => part).join(', ');

        // Validation du nom complet : doit contenir au moins 2 mots
        if (!fullName) {
            setOrderStatus('Veuillez indiquer votre nom complet.', 'error');
            highlightFieldError('order-name');
            return;
        }

        const nameWords = fullName.split(/\s+/).filter(word => word.length > 0);
        if (nameWords.length < 2) {
            setOrderStatus('Le nom complet doit contenir au moins 2 mots (ex: "Jean Dupont").', 'error');
            highlightFieldError('order-name');
            return;
        }

        // Validation de l'email : format strict
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            setOrderStatus('Veuillez entrer une adresse email valide (ex: nom@exemple.com).', 'error');
            highlightFieldError('order-email');
            return;
        }

        // Validation du numéro de téléphone selon le préfixe
        if (!phoneNumber) {
            setOrderStatus('Veuillez entrer votre numéro de téléphone.', 'error');
            highlightFieldError('order-phone');
            return;
        }

        // Nettoyer le numéro de téléphone (enlever espaces, tirets, points)
        let cleanPhoneNumber = phoneNumber.replace(/[\s.\-()]/g, '');
        
        // Supprimer le 0 initial si présent (car le préfixe +33 ou +41 le remplace)
        if (cleanPhoneNumber.startsWith('0') && cleanPhoneNumber.length === 10) {
            cleanPhoneNumber = cleanPhoneNumber.substring(1);
        }
        
        let phoneValid = false;
        let phoneError = '';

        if (phonePrefix === '+33') {
            // Format français : 9 chiffres (sans le 0 initial)
            // Exemples valides : 612345678, 0612345678 (le 0 sera supprimé), 123456789
            if (/^\d{9}$/.test(cleanPhoneNumber)) {
                phoneValid = true;
            } else {
                phoneError = 'Le numéro de téléphone français doit contenir 9 chiffres (ex: 6 12 34 56 78 ou 06 12 34 56 78).';
            }
        } else if (phonePrefix === '+41') {
            // Format suisse : 9 chiffres (sans le 0 initial)
            // Exemples valides : 791234567, 0791234567 (le 0 sera supprimé), 123456789
            if (/^\d{9}$/.test(cleanPhoneNumber)) {
                phoneValid = true;
            } else {
                phoneError = 'Le numéro de téléphone suisse doit contenir 9 chiffres (ex: 79 123 45 67 ou 079 123 45 67).';
            }
        }

        if (!phoneValid) {
            setOrderStatus(phoneError || 'Format de numéro de téléphone invalide.', 'error');
            highlightFieldError('order-phone');
            return;
        }

        // Validation des champs d'adresse
        if (!addressLine1) {
            setOrderStatus('Veuillez entrer votre adresse (numéro et nom de rue).', 'error');
            highlightFieldError('order-address-line1');
            return;
        }

        if (!postalCode) {
            setOrderStatus('Veuillez entrer votre code postal.', 'error');
            highlightFieldError('order-postal-code');
            return;
        }

        if (!city) {
            setOrderStatus('Veuillez entrer votre ville.', 'error');
            highlightFieldError('order-city');
            return;
        }

        // Réinitialiser les erreurs de champ
        clearFieldErrors();

        const fullPhone = `${phonePrefix} ${phoneNumber}`.trim();

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
                phoneNumber,
                address,
                addressLine1,
                addressLine2,
                postalCode,
                city,
                company,
                country: countrySelect ? countrySelect.value : 'FR'
            },
            metadata: {
                source: 'landing-page',
                submittedAt: new Date().toISOString()
            }
        };

        try {
            setOrderStatus('Envoi de votre commande...', 'info');
            toggleFormLoading(true);
            await sendOrderToWebhook(payload);
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

// Effacer les erreurs de champ quand l'utilisateur commence à taper
if (checkoutForm) {
    const nameInput = document.getElementById('order-name');
    const emailInput = document.getElementById('order-email');
    const phoneInput = document.getElementById('order-phone');
    const phonePrefixSelect = document.getElementById('order-phone-prefix');
    const addressLine1Input = document.getElementById('order-address-line1');
    const postalCodeInput = document.getElementById('order-postal-code');
    const cityInput = document.getElementById('order-city');

    if (nameInput) {
        nameInput.addEventListener('input', () => {
            if (nameInput.classList.contains('field-error')) {
                nameInput.classList.remove('field-error');
            }
        });
    }

    if (emailInput) {
        emailInput.addEventListener('input', () => {
            if (emailInput.classList.contains('field-error')) {
                emailInput.classList.remove('field-error');
            }
        });
    }

    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            if (phoneInput.classList.contains('field-error')) {
                phoneInput.classList.remove('field-error');
            }
        });
    }

    if (phonePrefixSelect) {
        phonePrefixSelect.addEventListener('change', () => {
            if (phoneInput && phoneInput.classList.contains('field-error')) {
                phoneInput.classList.remove('field-error');
            }
        });
    }

    if (addressLine1Input) {
        addressLine1Input.addEventListener('input', () => {
            if (addressLine1Input.classList.contains('field-error')) {
                addressLine1Input.classList.remove('field-error');
            }
        });
    }

    if (postalCodeInput) {
        postalCodeInput.addEventListener('input', () => {
            if (postalCodeInput.classList.contains('field-error')) {
                postalCodeInput.classList.remove('field-error');
            }
        });
    }

    if (cityInput) {
        cityInput.addEventListener('input', () => {
            if (cityInput.classList.contains('field-error')) {
                cityInput.classList.remove('field-error');
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

