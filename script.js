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
    button.addEventListener('click', function(e) {
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

const productCatalog = {
    'plaque-nfc': {
        id: 'plaque-nfc',
        name: 'Plaque NFC GoReview',
        price: 0
    }
};

const cartCountEl = document.querySelector('[data-cart-count]');
const cartItemsContainer = document.querySelector('[data-cart-items]');
const cartEmptyState = document.querySelector('[data-cart-empty]');
const cartTotalEl = document.querySelector('[data-cart-total]');
const cartSection = document.getElementById('cart') || document.querySelector('.cart-section');

const checkoutCard = document.querySelector('[data-checkout-card]');
const checkoutForm = document.querySelector('[data-checkout-form]');
const submitOrderButton = checkoutForm ? checkoutForm.querySelector('[data-submit-order]') : null;
const orderStatusEl = document.querySelector('[data-order-status]');
// La confirmation sera créée dynamiquement après un envoi réussi

const addressInput = document.getElementById('order-address');
const addressSuggestionsEl = document.querySelector('[data-address-suggestions]');
let addressDetails = null;
let addressDebounceTimer = null;
let addressFetchController = null;

const formatCurrency = (value) => {
    if (!Number.isFinite(value) || value === 0) {
        return '0€';
    }
    return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
};

const updateCartIcon = () => {
    const cartIcon = document.querySelector('.cart-icon');
    const cartTab = document.querySelector('.cart-tab');
    if (!cartIcon || !cartTab) return;
    
    const hasItems = cartState.items.length > 0;
    
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
    if (!cartCountEl) return;
    const totalQuantity = cartState.items.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = totalQuantity;
    updateCartIcon();
};

const renderCart = () => {
    updateCartCount();
    saveCartToStorage();

    if (!cartItemsContainer || !cartTotalEl || !cartEmptyState) {
        return;
    }

    cartItemsContainer.innerHTML = '';

    if (cartState.items.length === 0) {
        cartEmptyState.hidden = false;
        cartTotalEl.textContent = '0€';
    } else {
        cartEmptyState.hidden = true;
        cartState.items.forEach((item) => {
            const listItem = document.createElement('li');
            listItem.className = 'cart-item';
            listItem.dataset.itemId = item.id;
            listItem.innerHTML = `
                <div class="cart-item-main">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-quantity">Quantité : ${item.quantity}</span>
                </div>
                <div class="cart-item-actions">
                    <span class="cart-item-price">${formatCurrency(item.price * item.quantity)}</span>
                    <button type="button" class="cart-item-remove" data-action="remove-item">Retirer</button>
                </div>
            `;
            cartItemsContainer.appendChild(listItem);
        });

        const total = cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotalEl.textContent = formatCurrency(total);
    }

    if (checkoutCard) {
        // Afficher le checkout si le panier contient des items ou si une confirmation est visible
        const hasConfirmation = checkoutCard.querySelector('.order-confirmation') !== null;
        const shouldShowCheckout = cartState.items.length > 0 || hasConfirmation;
        checkoutCard.hidden = !shouldShowCheckout;
    }
};

const addItemToCart = (productId) => {
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

    renderCart();
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

const triggerCartAnimation = () => {
    const addPlaqueButton = document.getElementById('addPlaqueToCart');
    if (addPlaqueButton) {
        const originalText = addPlaqueButton.textContent;
        addPlaqueButton.textContent = 'Ajouté';
        addPlaqueButton.classList.add('btn-added');
        addPlaqueButton.disabled = true;
        
        // Réinitialiser après 2 secondes
        setTimeout(() => {
            addPlaqueButton.textContent = originalText;
            addPlaqueButton.classList.remove('btn-added');
            addPlaqueButton.disabled = false;
        }, 2000);
    }
    
    // Mettre à jour l'icône du panier
    updateCartIcon();
};

const addPlaqueButton = document.getElementById('addPlaqueToCart');
if (addPlaqueButton) {
    addPlaqueButton.addEventListener('click', (event) => {
        event.preventDefault();
        const productId = addPlaqueButton.dataset.productId;
        addItemToCart(productId);
        triggerCartAnimation();
    });
}

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
    if (!checkoutForm || !checkoutCard) return;

    // Supprimer toute confirmation existante
    const existingConfirmation = checkoutCard.querySelector('.order-confirmation');
    if (existingConfirmation) {
        existingConfirmation.remove();
    }

    // Créer la confirmation dynamiquement
    const confirmationDiv = document.createElement('div');
    confirmationDiv.className = 'order-confirmation';
    confirmationDiv.innerHTML = `
        <h4>Commande confirmée 🎉</h4>
        <p>Merci ! Votre demande a bien été envoyée. Notre équipe vous contactera très rapidement pour vous confirmer l'expédition.</p>
        <div class="order-summary">
            <p><strong>Nom :</strong> ${customerData.fullName}</p>
            <p><strong>Email :</strong> ${customerData.email}</p>
            <p><strong>Téléphone :</strong> ${customerData.phone}</p>
            <p><strong>Adresse :</strong> ${customerData.address}</p>
        </div>
        <button type="button" class="btn-secondary" data-new-order>Commander une autre plaque</button>
    `;

    // Ajouter le gestionnaire d'événement pour le bouton "Commander une autre plaque"
    const newOrderButton = confirmationDiv.querySelector('[data-new-order]');
    if (newOrderButton) {
        newOrderButton.addEventListener('click', () => {
            resetOrderFlow();
            if (cartSection && typeof cartSection.scrollIntoView === 'function') {
                cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.location.href = '/';
            }
        });
    }

    // Masquer le formulaire et afficher la confirmation
    checkoutForm.hidden = true;
    checkoutCard.appendChild(confirmationDiv);
    checkoutCard.hidden = false;
};

const clearAddressDatasets = () => {
    if (!addressInput) return;
    addressInput.dataset.placeId = '';
    addressInput.dataset.formattedAddress = '';
    addressInput.dataset.lat = '';
    addressInput.dataset.lon = '';
};

const clearAddressSuggestions = () => {
    if (!addressSuggestionsEl) return;
    addressSuggestionsEl.innerHTML = '';
    addressSuggestionsEl.hidden = true;
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
    addressDetails = null;
    clearAddressDatasets();
    clearAddressSuggestions();
};

// Le gestionnaire d'événement pour "Commander une autre plaque" est maintenant créé dynamiquement dans showOrderConfirmation

const renderAddressSuggestions = (results) => {
    if (!addressSuggestionsEl) {
        return;
    }

    addressSuggestionsEl.innerHTML = '';

    if (!results || !results.length) {
        addressSuggestionsEl.hidden = true;
        return;
    }

    results.forEach((result) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'address-suggestion';
        button.innerHTML = `
            <span class="address-suggestion-main">${result.display_name}</span>
        `;

        button.addEventListener('click', () => {
            const formattedAddress = result.display_name;
            addressInput.value = formattedAddress;
            addressInput.dataset.placeId = result.place_id || '';
            addressInput.dataset.formattedAddress = formattedAddress;
            addressInput.dataset.lat = result.lat || '';
            addressInput.dataset.lon = result.lon || '';

            addressDetails = {
                provider: 'openstreetmap',
                displayName: formattedAddress,
                placeId: result.place_id || null,
                lat: result.lat ? Number(result.lat) : null,
                lon: result.lon ? Number(result.lon) : null,
                address: result.address || null,
                raw: result
            };

            clearAddressSuggestions();
        });

        addressSuggestionsEl.appendChild(button);
    });

    addressSuggestionsEl.hidden = false;
};

const fetchAddressSuggestions = async (query) => {
    if (!addressInput) {
        return;
    }

    if (addressFetchController) {
        addressFetchController.abort();
    }
    addressFetchController = new AbortController();

    // Show loading indicator
    if (addressSuggestionsEl) {
        addressSuggestionsEl.innerHTML = '<div class="address-suggestion-loading">Recherche en cours...</div>';
        addressSuggestionsEl.hidden = false;
    }

    // Multiple search strategies for better results
    const searchQueries = [
        query, // Original query
        query + ', France', // Add country for better results
        query + ', Suisse' // Add country for Switzerland
    ];

    const allResults = [];
    const seenPlaceIds = new Set();

    try {
        // Search with multiple strategies in parallel
        const searchPromises = searchQueries.map(async (searchQuery) => {
            const params = new URLSearchParams({
                q: searchQuery,
                format: 'jsonv2',
                addressdetails: '1',
                limit: '10', // Increased from 5 to 10 per query
                countrycodes: 'fr,ch',
                'accept-language': 'fr',
                extratags: '1',
                namedetails: '1'
            });

            const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
                signal: addressFetchController.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'GoReview/1.0'
                }
            });

            if (!response.ok) {
                return [];
            }

            return await response.json();
        });

        const resultsArrays = await Promise.all(searchPromises);

        // Combine and deduplicate results
        resultsArrays.forEach(results => {
            if (Array.isArray(results)) {
                results.forEach(result => {
                    const placeId = result.place_id || result.osm_id;
                    if (placeId && !seenPlaceIds.has(placeId)) {
                        seenPlaceIds.add(placeId);
                        allResults.push(result);
                    }
                });
            }
        });

        // Sort by relevance (importance score if available)
        allResults.sort((a, b) => {
            const scoreA = a.importance || 0;
            const scoreB = b.importance || 0;
            return scoreB - scoreA;
        });

        // Limit to top 15 results
        const finalResults = allResults.slice(0, 15);
        renderAddressSuggestions(finalResults);
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }
        console.error('Erreur lors de la recherche d’adresse', error);
        clearAddressSuggestions();
    }
};

if (addressInput) {
    addressInput.addEventListener('input', () => {
        addressDetails = null;
        clearAddressDatasets();

        const value = addressInput.value.trim();

        if (addressDebounceTimer) {
            clearTimeout(addressDebounceTimer);
        }

        if (!value || value.length < 2) {
            if (addressFetchController) {
                addressFetchController.abort();
            }
            clearAddressSuggestions();
            return;
        }

        // Faster debounce for better responsiveness
        addressDebounceTimer = setTimeout(() => {
            fetchAddressSuggestions(value);
        }, 200);
    });

    addressInput.addEventListener('focus', () => {
        if (addressSuggestionsEl && addressSuggestionsEl.children.length > 0) {
            addressSuggestionsEl.hidden = false;
        }
    });
}

if (addressSuggestionsEl) {
    addressSuggestionsEl.addEventListener('mousedown', (event) => {
        // Prevent input blur before click handlers run
        event.preventDefault();
    });

    document.addEventListener('click', (event) => {
        if (!addressSuggestionsEl.contains(event.target) && event.target !== addressInput) {
            clearAddressSuggestions();
        }
    });
}

const sendOrderToWebhook = async (payload) => {
    const webhookUrl = 'https://n8n.goreview.fr/webhook-test/commandes';
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

    return response.json().catch(() => ({}));
};

if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!cartState.items.length) {
            setOrderStatus('Ajoutez la plaque gratuite à votre panier avant de confirmer la commande.', 'error');
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
        const totalQuantity = cartState.items.reduce((sum, item) => sum + item.quantity, 0);
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
        const address = (formData.get('address') || '').toString().trim();

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
                addressDetails
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
            setOrderStatus('Commande envoyée avec succès.', 'success');
            clearCart();
            showOrderConfirmation({
                fullName,
                email,
                phone: fullPhone,
                address
            });
        } catch (error) {
            console.error('Erreur lors de l’envoi de la commande', error);
            setOrderStatus('Impossible d’envoyer la commande. Merci de réessayer ou de nous contacter.', 'error');
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

// Hero card animation on scroll
const heroCard = document.querySelector('.hero-card');
if (heroCard) {
    const heroSection = heroCard.closest('.hero');
    let ticking = false;

    const updateHeroCard = () => {
        if (!heroSection) return;

        const rect = heroSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        // Calculate progress of hero section within viewport
        const sectionCenter = rect.top + rect.height / 2;
        const progress = 1 - (sectionCenter / viewportHeight);
        const clampedProgress = Math.max(Math.min(progress, 1), -0.5);

        const rotate = -10 + clampedProgress * 18;
        const translateY = clampedProgress * 16;
        const scale = 1 + Math.max(clampedProgress, 0) * 0.04;

        heroCard.style.transform = `rotate(${rotate}deg) translateY(${translateY}px) scale(${scale})`;

        if (Math.abs(clampedProgress) > 0.05) {
            heroCard.classList.add('is-active');
        } else {
            heroCard.classList.remove('is-active');
        }

        ticking = false;
    };

    const handleScroll = () => {
        if (!ticking) {
            window.requestAnimationFrame(updateHeroCard);
            ticking = true;
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    updateHeroCard();
}

