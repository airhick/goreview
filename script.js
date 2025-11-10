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
const cartState = {
    items: []
};

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
const cartSection = document.getElementById('cart');

const checkoutCard = document.querySelector('[data-checkout-card]');
const checkoutForm = document.querySelector('[data-checkout-form]');
const submitOrderButton = checkoutForm ? checkoutForm.querySelector('[data-submit-order]') : null;
const orderStatusEl = document.querySelector('[data-order-status]');
const orderConfirmationEl = document.querySelector('[data-order-confirmation]');
const orderSummaryEl = document.querySelector('[data-order-summary]');
const newOrderButton = document.querySelector('[data-new-order]');

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

const updateCartCount = () => {
    if (!cartCountEl) return;
    const totalQuantity = cartState.items.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = totalQuantity;
};

const renderCart = () => {
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

    updateCartCount();

    if (checkoutCard) {
        const shouldShowCheckout = cartState.items.length > 0 || (orderConfirmationEl && !orderConfirmationEl.hidden);
        checkoutCard.hidden = !shouldShowCheckout;
    }
};

const addItemToCart = (productId) => {
    const product = productCatalog[productId];
    if (!product) {
        console.warn(`Produit introuvable pour l’ID ${productId}`);
        return;
    }

    const existing = cartState.items.find((item) => item.id === productId);
    if (existing) {
        existing.quantity += 1;
    } else {
        cartState.items.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }

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

const scrollToCart = () => {
    if (!cartSection) return;
    cartSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

document.querySelectorAll('[data-action="scroll-cart"]').forEach((button) => {
    button.addEventListener('click', (event) => {
        event.preventDefault();
        scrollToCart();
    });
});

const addPlaqueButton = document.getElementById('addPlaqueToCart');
if (addPlaqueButton) {
    addPlaqueButton.addEventListener('click', (event) => {
        event.preventDefault();
        const productId = addPlaqueButton.dataset.productId;
        addItemToCart(productId);
        scrollToCart();
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

const showOrderConfirmation = (customerData) => {
    if (!orderConfirmationEl || !orderSummaryEl || !checkoutForm) return;

    orderSummaryEl.innerHTML = `
        <p><strong>Email :</strong> ${customerData.email}</p>
        <p><strong>Téléphone :</strong> ${customerData.phone}</p>
        <p><strong>Adresse :</strong> ${customerData.address}</p>
    `;

    checkoutForm.hidden = true;
    orderConfirmationEl.hidden = false;

    if (checkoutCard) {
        checkoutCard.hidden = false;
    }
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
    if (!orderConfirmationEl || !checkoutForm) return;
    clearCart();
    setOrderStatus('', 'info');
    checkoutForm.reset();
    checkoutForm.hidden = false;
    orderConfirmationEl.hidden = true;
    addressDetails = null;
    clearAddressDatasets();
    clearAddressSuggestions();
};

if (newOrderButton) {
    newOrderButton.addEventListener('click', () => {
        resetOrderFlow();
        scrollToCart();
    });
}

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

    const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'fr,ch',
        'accept-language': 'fr'
    });

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            signal: addressFetchController.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Adresse indisponible (${response.status})`);
        }

        const results = await response.json();
        renderAddressSuggestions(results);
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

        if (!value || value.length < 3) {
            if (addressFetchController) {
                addressFetchController.abort();
            }
            clearAddressSuggestions();
            return;
        }

        addressDebounceTimer = setTimeout(() => {
            fetchAddressSuggestions(value);
        }, 300);
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

        if (!checkoutForm.reportValidity()) {
            return;
        }

        const formData = new FormData(checkoutForm);
        const phonePrefix = formData.get('phonePrefix');
        const phoneNumber = (formData.get('phoneNumber') || '').toString().trim();
        const email = (formData.get('email') || '').toString().trim();
        const address = (formData.get('address') || '').toString().trim();

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

renderCart();

