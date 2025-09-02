document.addEventListener('DOMContentLoaded', () => {
    const app = {
        state: {
            currentUser: null,
            currentSection: 'dashboard',
            branches: [
                { id: 1, name: 'Copandaro' },
                { id: 2, name: 'Zamora' },
                { id: 3, name: 'Cuanajo' },
            ],
            users: [
                { id: 1, username: 'admin@agronare.mx', password: 'password', name: 'Administrador General', role: 'Admin', branchId: null },
                { id: 2, username: 'copandaro@agronare.mx', password: 'password', name: 'Vendedor Copandaro', role: 'Vendedor', branchId: 1 },
                { id: 3, username: 'zamora@agronare.mx', password: 'password', name: 'Vendedor Zamora', role: 'Vendedor', branchId: 2 },
                { id: 4, username: 'cuanajo@agronare.mx', password: 'password', name: 'Vendedor Cuanajo', role: 'Vendedor', branchId: 3 },
            ],
            currentBranchId: 1,
            products: [
                { id: 1, branchId: 1, name: 'Herbicida Faena', type: 'Agroquímico', description: 'Control de maleza de hoja ancha y angosta en post-emergencia.', quantity: 12, minStock: 10, price: 250.50 },
                { id: 2, branchId: 1, name: 'Urea (Bulto 50kg)', type: 'Fertilizante', description: 'Fertilizante nitrogenado de alta concentración para etapas de crecimiento.', quantity: 120, minStock: 40, price: 850.00 },
                { id: 3, branchId: 1, name: 'Fungicida Manzate', type: 'Agroquímico', description: 'Fungicida preventivo de amplio espectro para hortalizas y frutales.', quantity: 5, minStock: 8, price: 450.75 },
                { id: 4, branchId: 2, name: 'Herbicida Faena', type: 'Agroquímico', description: 'Control de maleza de hoja ancha y angosta en post-emergencia.', quantity: 50, minStock: 10, price: 255.00 },
                { id: 5, branchId: 2, name: 'Semilla Maíz Híbrido', type: 'Semilla', description: 'Semilla de alto rendimiento para siembra en temporal o riego.', quantity: 300, minStock: 100, price: 1250.00 },
                { id: 6, branchId: 3, name: 'Triple 17 (Bulto)', type: 'Fertilizante', description: 'Fertilizante NPK completo.', quantity: 150, minStock: 50, price: 930.00 },
            ],
            clients: [
                { id: 1, branchId: 1, name: 'Juan Pérez García', phone: '4431234567', email: 'juan.perez@email.com', hasCredit: true, creditLimit: 5000, creditUsed: 1500.50, creditCutoffDate: '2025-09-15', creditPaymentDate: '2025-09-30' },
                { id: 2, branchId: 2, name: 'Ana López Hernández', phone: '4437654321', email: 'ana.lopez@email.com', hasCredit: false, creditLimit: 0, creditUsed: 0, creditCutoffDate: null, creditPaymentDate: null },
            ],
            suppliers: [
                { id: 1, branchId: 1, name: 'Agroinsumos del Valle', contact: 'Carlos Rodriguez', phone: '5512345678', hasCredit: true, creditLimit: 20000, creditUsed: 8500, creditCutoffDate: '2025-09-20', creditPaymentDate: '2025-10-05' }
            ],
            payments: [],
            sales: [],
            purchases: [],
            quotes: [],
            activities: [],
            cart: [],
            cashReconciliations: [],
            transfers: [],
            charts: {},
            LOW_STOCK_THRESHOLD: 15,
            posSearchTerm: '',
            posCategoryFilter: 'Todos',
            inventorySearchTerm: '',
            inventoryCategoryFilter: 'Todos',
        },
        undo: {
            last: null,
            set(cb, label) { this.last = { do: cb, label } },
            clear() { this.last = null }
        },
        init() {
            this.cacheDOM();
            this.loadFromStorage();
            this.bindEvents();
        },
        cacheDOM() {
            this.dom = {
                loginScreen: document.getElementById('login-screen'),
                loginForm: document.getElementById('login-form'),
                loginError: document.getElementById('login-error'),
                adminPanel: document.getElementById('admin-panel'),
                mainPanel: document.querySelector('.main-panel'),
                mainContent: document.getElementById('main-content'),
                sidebar: document.getElementById('sidebar'),
                sidebarOverlay: document.getElementById('sidebar-overlay'),
                modalContainer: document.getElementById('modal-container'),
                notificationContainer: document.getElementById('notification-container'),
                navMenu: document.getElementById('nav-menu'),
                sectionTitle: document.getElementById('section-title'),
                menuToggle: document.getElementById('menu-toggle'),
                branchSelector: document.getElementById('branch-selector'),
                branchSelectorContainer: document.getElementById('branch-selector-container'),
                userDisplay: document.getElementById('user-display'),
            };
        },
        bindEvents() {
            this.dom.loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const d = Object.fromEntries(new FormData(e.target));
                this.handleLogin(d.username, d.password);
            });
            document.body.addEventListener('click', this.handleAction.bind(this));
            document.body.addEventListener('submit', this.handleFormSubmit.bind(this));
            document.body.addEventListener('input', this.handleInput.bind(this));
            document.body.addEventListener('change', this.handleChange.bind(this));
            this.dom.branchSelector.addEventListener('change', this.handleBranchSwitch.bind(this));
        },
        persistState() {
            const keys = ['products', 'clients', 'suppliers', 'sales', 'purchases', 'quotes', 'cashReconciliations', 'transfers', 'branches', 'users', 'payments'];
            keys.forEach(k => localStorage.setItem(`agronare_${k}`, JSON.stringify(this.state[k])));
            localStorage.setItem('agronare_currentBranchId', String(this.state.currentBranchId));
        },
        loadFromStorage() {
            const keys = ['products', 'clients', 'suppliers', 'sales', 'purchases', 'quotes', 'cashReconciliations', 'transfers', 'branches', 'users', 'payments'];
            keys.forEach(k => {
                const v = localStorage.getItem(`agronare_${k}`);
                if (v) {
                    try {
                        const p = JSON.parse(v);
                        if (Array.isArray(p)) this.state[k] = p;
                    } catch { }
                }
            });
            const bid = localStorage.getItem('agronare_currentBranchId');
            if (bid) this.state.currentBranchId = parseInt(bid) || this.state.currentBranchId;
        },
        handleLogin(username, password) {
            const user = this.state.users.find(u => u.username === username && u.password === password);
            if (user) {
                this.state.currentUser = user;
                this.dom.loginError.textContent = '';
                this.dom.loginScreen.style.opacity = '0';
                setTimeout(() => {
                    this.dom.loginScreen.style.display = 'none';
                    this.dom.adminPanel.classList.remove('hidden');
                    if (window.innerWidth >= 768) this.dom.adminPanel.classList.remove('sidebar-closed');
                    this.setupPanelForUser();
                    setTimeout(() => this.dom.adminPanel.style.opacity = '1', 50);
                }, 500);
            } else {
                this.dom.loginError.textContent = 'Usuario o contraseña incorrectos.';
            }
        },
        handleLogout() {
            this.state.currentUser = null;
            this.dom.adminPanel.style.opacity = '0';
            setTimeout(() => {
                this.dom.adminPanel.classList.add('hidden');
                this.dom.loginScreen.style.display = 'flex';
                this.dom.loginForm.reset();
                setTimeout(() => this.dom.loginScreen.style.opacity = '1', 50);
            }, 500);
        },
        toggleSidebar() {
            if (window.innerWidth < 768) {
                this.dom.sidebar.classList.toggle('open');
                this.dom.sidebarOverlay.classList.toggle('open');
            } else {
                this.dom.adminPanel.classList.toggle('sidebar-closed');
            }
        },
        setupPanelForUser() {
            const user = this.state.currentUser;
            if (!user) return;
            this.dom.userDisplay.querySelector('p:first-child').textContent = user.name;
            this.dom.userDisplay.querySelector('p:last-child').textContent = user.role;
            if (user.role === 'Admin') {
                this.dom.branchSelectorContainer.style.display = 'block';
                if (!this.state.branches.some(b => b.id === this.state.currentBranchId)) this.state.currentBranchId = this.state.branches[0].id;
                this.populateBranchSelector();
            } else {
                this.dom.branchSelectorContainer.style.display = 'none';
                this.state.currentBranchId = user.branchId;
            }
            this.logActivity(`Inicio de sesión: ${user.name}`);
            this.navigateTo('dashboard');
        },
        populateBranchSelector() {
            const currentVal = this.dom.branchSelector.value;
            this.dom.branchSelector.innerHTML = this.state.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
            this.dom.branchSelector.value = this.state.branches.some(b => b.id == currentVal) ? currentVal : this.state.currentBranchId;
        },
        handleBranchSwitch(e) {
            this.state.currentBranchId = parseInt(e.target.value);
            this.state.cart = [];
            this.logActivity(`Cambiando a sucursal: ${this.state.branches.find(b => b.id === this.state.currentBranchId).name}`);
            this.persistState();
            this.navigateTo(this.state.currentSection);
        },
        navigateTo(section) {
            this.state.currentSection = section;
            this.state.posSearchTerm = '';
            this.state.posCategoryFilter = 'Todos';
            this.state.inventorySearchTerm = '';
            this.state.inventoryCategoryFilter = 'Todos';
            this.render();
            this.dom.navMenu.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.section === section));
            const activeLink = this.dom.navMenu.querySelector(`[data-section="${section}"]`);
            this.dom.sectionTitle.textContent = activeLink ? activeLink.querySelector('span').textContent.trim() : 'Resumen';
        },
        render() {
            const fn = this.templates[this.state.currentSection];
            if (typeof fn === 'function') {
                this.dom.mainContent.innerHTML = fn(this.state);
                if (this.state.currentSection === 'dashboard') this.renderCharts();
            } else {
                this.dom.mainContent.innerHTML = `<p class="text-red-500">Error al cargar esta sección.</p>`;
            }
        },
        renderCharts() {
            Object.values(this.state.charts).forEach(c => c?.destroy?.());
            this.state.charts = {};
            const branchSales = this.state.sales.filter(s => s.branchId === this.state.currentBranchId);
            const categorySales = {};
            branchSales.forEach(s => s.items.forEach(i => {
                categorySales[i.type] = (categorySales[i.type] || 0) + (i.price * i.quantity);
            }));
            const categoryCtx = document.getElementById('categorySalesChart')?.getContext('2d');
            if (categoryCtx && Object.keys(categorySales).length > 0) {
                this.state.charts.categoryChart = new Chart(categoryCtx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(categorySales),
                        datasets: [{ data: Object.values(categorySales), backgroundColor: ['#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'], hoverOffset: 4 }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
            const monthlyCtx = document.getElementById('monthlySalesChart')?.getContext('2d');
            if (monthlyCtx) {
                this.state.charts.monthlyChart = new Chart(monthlyCtx, {
                    type: 'bar',
                    data: {
                        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                        datasets: [{ label: 'Ventas Mensuales', data: [1200, 1900, 3000, 5000, 2300, 3200], backgroundColor: '#059669' }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                });
            }
        },
        handleInput(e) {
            const t = e.target;
            if (t.matches('#pos-search, #inventory-search')) {
                const key = `${t.id.split('-')[0]}SearchTerm`;
                this.state[key] = t.value;
                const selectionStart = t.selectionStart;
                const selectionEnd = t.selectionEnd;
                this.render();
                const newT = document.getElementById(t.id);
                if (newT) {
                    newT.focus();
                    newT.setSelectionRange(selectionStart, selectionEnd);
                }
            }
            if (t.id === 'physical-cash-input') {
                const systemTotal = parseFloat(t.dataset.systemTotal);
                const physical = parseFloat(t.value) || 0;
                const diff = physical - systemTotal;
                const el = document.getElementById('discrepancy-display');
                if (el) {
                    el.textContent = this.utils.formatCurrency(diff);
                    el.className = 'font-bold text-lg ';
                    if (diff < 0) el.classList.add('text-red-600');
                    else if (diff > 0) el.classList.add('text-yellow-600');
                    else el.classList.add('text-green-600');
                }
            }
        },
        handleChange(e) {
            const target = e.target;
            if (target.matches('[name="hasCredit"]')) {
                const container = target.closest('form').querySelector('.credit-details');
                if (container) container.classList.toggle('hidden', !target.checked);
            }
            if (target.matches('[name="paymentMethod"]')) {
                const form = target.closest('form');
                if (form) {
                    const clientSelector = form.querySelector('#clientSelectorContainer');
                    if (clientSelector) {
                        clientSelector.classList.toggle('hidden', target.value !== 'Credito');
                    }
                }
            }
        },
        handleAction(e) {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            e.preventDefault();
            const { action, id, type, category, section, name } = target.dataset;
            const itemId = id ? parseInt(id) : null;
            const actions = {
                toggleSidebar: () => this.toggleSidebar(),
                navigateTo: () => {
                    this.navigateTo(section);
                    if (window.innerWidth < 768 && this.dom.sidebar.classList.contains('open')) this.toggleSidebar();
                },
                showProductModal: () => this.modals.product(itemId),
                showClientModal: () => this.modals.client(itemId),
                showSupplierModal: () => this.modals.supplier(itemId),
                showPurchaseModal: () => this.modals.purchase(),
                showQuoteModal: () => this.modals.quote(itemId),
                showPaymentModal: () => this.modals.payment(itemId, type),
                showBranchModal: () => this.modals.branch(itemId),
                showUserModal: () => this.modals.user(itemId),
                closeModal: () => this.utils.closeModal(),
                deleteItem: () => this.utils.confirmDelete(type, itemId),
                deleteItemConfirmed: () => { this.crud.delete(type + 's', itemId); this.utils.closeModal(); },
                addToCart: () => this.pos.addToCart(itemId),
                removeFromCart: () => this.pos.removeFromCart(itemId),
                updateCartQuantity: () => {
                    const input = e.target.closest('div').querySelector('input');
                    this.pos.updateCartQuantity(itemId, parseInt(input.value));
                },
                filterPosCategory: () => { this.state.posCategoryFilter = category; this.render(); },
                filterInventoryCategory: () => { this.state.inventoryCategoryFilter = category; this.render(); },
                downloadPdfReport: () => this.reports.downloadPdf(),
                downloadExcelReport: () => this.reports.downloadExcel(),
                generateDescription: () => this.gemini.generateDescription(),
                analyzePerformance: () => this.gemini.analyzePerformance(),
                getProductInfo: () => this.gemini.getProductInfo(itemId, name),
                logout: () => this.handleLogout(),
            };
            if (actions[action]) actions[action]();
        },
        handleFormSubmit(e) {
            e.preventDefault();
            const form = e.target;
            if (form.id === 'login-form') return;

            console.log('Formulario enviado:', form.id);

            const data = Object.fromEntries(new FormData(form));
            const id = data.id ? parseInt(data.id) : null;

            const forms = {
                'product-form': () => {
                    const quantity = parseFloat(data.quantity) || 0;
                    const minStock = parseFloat(data.minStock) || 0;
                    const price = parseFloat(data.price) || 0;

                    if (isNaN(quantity) || isNaN(minStock) || isNaN(price)) {
                        const errores = [];
                        if (isNaN(quantity)) errores.push("cantidad");
                        if (isNaN(minStock)) errores.push("stock mínimo");
                        if (isNaN(price)) errores.push("precio");
                        return this.utils.showNotification(`Los siguientes campos deben ser números válidos: ${errores.join(', ')}.`, 'error');
                    }

                    const payload = {
                        name: data.name.trim(),
                        type: data.type,
                        description: (data.description || '').trim(),
                        quantity,
                        minStock,
                        price,
                        branchId: this.state.currentBranchId,
                    };

                    console.log('Datos del producto:', payload);

                    this.crud.save('products', payload, id);
                },
                'client-form': () => {
                    const hasCredit = form.querySelector('[name="hasCredit"]').checked;
                    const payload = {
                        name: data.name.trim(),
                        phone: (data.phone || '').trim(),
                        email: (data.email || '').trim(),
                        hasCredit,
                        creditLimit: hasCredit ? parseFloat(data.creditLimit || '0') : 0,
                        creditUsed: this.state.clients.find(c => c.id === id)?.creditUsed || 0,
                        creditCutoffDate: hasCredit ? data.creditCutoffDate : null,
                        creditPaymentDate: hasCredit ? data.creditPaymentDate : null,
                        branchId: this.state.currentBranchId,
                    };
                    this.crud.save('clients', payload, id);
                },
                'supplier-form': () => {
                    const hasCredit = form.querySelector('[name="hasCredit"]').checked;
                    const payload = {
                        name: data.name.trim(),
                        contact: (data.contact || '').trim(),
                        phone: (data.phone || '').trim(),
                        hasCredit,
                        creditLimit: hasCredit ? parseFloat(data.creditLimit || '0') : 0,
                        creditUsed: this.state.suppliers.find(s => s.id === id)?.creditUsed || 0,
                        creditCutoffDate: hasCredit ? data.creditCutoffDate : null,
                        creditPaymentDate: hasCredit ? data.creditPaymentDate : null,
                        branchId: this.state.currentBranchId,
                    };
                    this.crud.save('suppliers', payload, id);
                },
                'payment-form': () => this.crud.handlePayment(data),
                'purchase-form': () => this.crud.handlePurchase(data),
                'quote-form': () => this.crud.save('quotes', {
                    supplierId: parseInt(data.supplierId),
                    productName: data.productName,
                    cost: parseFloat(data.cost || '0'),
                    quantity: parseInt(data.quantity),
                    status: 'Pendiente',
                    date: new Date().toISOString(),
                    branchId: this.state.currentBranchId,
                }, id),
                'pos-form': () => this.pos.completeSale(data.paymentMethod, parseInt(data.clientId)),
                'cash-reconciliation-form': () => this.cash.performReconciliation(data),
                'transfer-form': () => this.transfers.performTransfer(data),
                'branch-form': () => {
                    this.crud.save('branches', { name: data.name }, id, false);
                    this.populateBranchSelector();
                },
                'user-form': () => this.crud.save('users', {
                    name: data.name,
                    branchId: parseInt(data.branchId),
                    role: data.role
                }, id, false),
            };

            if (forms[form.id]) {
                forms[form.id]();
                this.logActivity(`Formulario '${form.id}' enviado.`);
                this.utils.closeModal();
                this.render();
            }
        },
        gemini: {
            async generateText(prompt, useGrounding = false) {
                const apiKey = "";
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{ parts: [{ text: prompt }] }],
                };
                if (useGrounding) {
                    payload.tools = [{ "google_search": {} }];
                }
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) throw new Error(`Error de API: ${response.statusText}`);
                    const result = await response.json();
                    return result.candidates?.[0]?.content?.parts?.[0]?.text;
                } catch (error) {
                    console.error("Error al llamar a la API de Gemini:", error);
                    app.utils.showNotification("Error al contactar la IA. Intenta de nuevo.", 'error');
                    return null;
                }
            },
            async generateDescription() {
                const nameInput = document.querySelector('form#product-form input[name="name"]');
                const typeInput = document.querySelector('form#product-form select[name="type"]');
                const descTextarea = document.querySelector('form#product-form textarea[name="description"]');
                if (!nameInput.value || !typeInput.value) return app.utils.showNotification('Ingresa nombre y tipo del producto.', 'error');
                const prompt = `Actúa como un experto en agronomía. Genera una descripción de producto concisa y profesional (2-3 frases) para un catálogo de ventas. El producto es '${nameInput.value}', un tipo de '${typeInput.value}'. La descripción debe ser clara, atractiva y destacar su propósito o beneficio principal.`;
                descTextarea.value = "Generando descripción con IA...";
                const generatedText = await this.generateText(prompt);
                descTextarea.value = generatedText ? generatedText.trim() : "No se pudo generar la descripción.";
            },
            async analyzePerformance() {
                const resultContainer = document.getElementById('ai-analysis-result');
                if (!resultContainer) return;
                resultContainer.innerHTML = `<div class="flex items-center justify-center p-4"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p class="ml-3">Analizando datos de la sucursal...</p></div>`;
                const branchName = app.state.branches.find(b => b.id === app.state.currentBranchId).name;
                const branchSales = app.state.sales.filter(s => s.branchId === app.state.currentBranchId);
                const branchProducts = app.state.products.filter(p => p.branchId === app.state.currentBranchId);
                if (branchSales.length === 0) {
                    resultContainer.innerHTML = `<p class="text-center text-gray-500 p-4">No hay suficientes datos de ventas para un análisis.</p>`;
                    return;
                }
                const salesSummary = branchSales.slice(0, 10).map(s => `- Venta de ${s.items.length} productos por ${app.utils.formatCurrency(s.total)}`).join('\n');
                const productsSummary = branchProducts.map(p => `- ${p.name}: ${p.quantity} en stock (mínimo ${p.minStock})`).join('\n');
                const prompt = `Eres un analista de negocios para "Agronare", una tienda de insumos agrícolas. Analiza los datos de la sucursal "${branchName}" y genera un resumen conciso en 3 puntos clave con viñetas (usando *). 1. Producto Estrella: Identifica el producto que genera más ingresos. 2. Oportunidad de Inventario: Menciona un producto con bajo stock que se vende bien o uno que no se vende y tiene mucho stock. 3. Recomendación Estratégica: Ofrece una sugerencia accionable para mejorar las ventas o la gestión de inventario basada en los datos.
DATOS DE VENTAS RECIENTES:
${salesSummary}
NIVELES DE INVENTARIO ACTUALES:
${productsSummary}`;
                const analysisText = await this.generateText(prompt);
                if (analysisText) {
                    const formattedHtml = analysisText.split('*').filter(item => item.trim() !== '').map(item => `<li class="flex items-start mb-2"><i class="fas fa-check-circle text-green-500 mt-1 mr-2"></i><span>${item.trim()}</span></li>`).join('');
                    resultContainer.innerHTML = `<ul class="text-gray-700">${formattedHtml}</ul>`;
                } else {
                    resultContainer.innerHTML = `<p class="text-center text-red-500 p-4">No se pudo generar el análisis en este momento.</p>`;
                }
            },
            async getProductInfo(productId, productName) {
                app.utils.renderModal(
                    `✨ Información de ${productName}`,
                    `<div id="ai-product-info" class="p-4 text-center"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p>Buscando información actualizada...</p></div>`
                );
                const prompt = `Actúa como un experto vendedor de productos agrícolas para la tienda Agronare. Dame un resumen rápido y convincente para un cliente sobre el producto "${productName}". Incluye sus usos principales, beneficios clave y por qué es una buena opción de compra. Basa tu respuesta en información actualizada de la web.`;
                const result = await this.generateText(prompt, true);
                const container = document.getElementById('ai-product-info');
                if (container) {
                    if (result) {
                        container.innerHTML = `<p class="text-gray-700 text-left whitespace-pre-wrap">${result}</p>`;
                    } else {
                        container.innerHTML = `<p class="text-red-500">No se pudo obtener la información en este momento.</p>`;
                    }
                }
            }
        },
        crud: {
            _getNewId(col) { return col.length > 0 ? Math.max(...col.map(i => i.id)) + 1 : 1; },
            create(collectionName, itemData, assignBranch = true) {
                const collection = app.state[collectionName];
                const newItem = { id: this._getNewId(collection), ...itemData };
                if (assignBranch && (newItem.branchId === null || newItem.branchId === undefined)) {
                    newItem.branchId = app.state.currentBranchId;
                }
                collection.push(newItem);
                app.undo.set(() => {
                    const idx = collection.findIndex(x => x.id === newItem.id);
                    if (idx > -1) collection.splice(idx, 1);
                    app.persistState();
                    app.render();
                }, `Crear ${collectionName.slice(0, -1)}`);
                app.utils.showNotification(`${collectionName.slice(0, -1)} creado.`, 'success', () => {
                    app.undo.last?.do();
                    app.undo.clear();
                });
                app.persistState();
                return newItem;
            },
            save(collectionName, itemData, itemId, assignBranch = true) {
                if (itemId) {
                    const col = app.state[collectionName];
                    const i = col.findIndex(x => x.id === itemId);
                    if (i > -1) {
                        const prev = { ...col[i] };
                        col[i] = { ...col[i], ...itemData };
                        app.undo.set(() => {
                            col[i] = prev;
                            app.persistState();
                            app.render();
                        }, `Actualizar ${collectionName.slice(0, -1)}`);
                        app.utils.showNotification(`${collectionName.slice(0, -1)} actualizado.`, 'success', () => {
                            app.undo.last?.do();
                            app.undo.clear();
                        });
                        app.persistState();
                    }
                } else {
                    this.create(collectionName, itemData, assignBranch);
                }
            },
            delete(collectionName, itemId) {
                const col = app.state[collectionName];
                const idx = col.findIndex(x => x.id === itemId);
                if (idx > -1) {
                    const removed = col.splice(idx, 1)[0];
                    app.undo.set(() => {
                        col.splice(idx, 0, removed);
                        app.persistState();
                        app.render();
                    }, `Eliminar ${collectionName.slice(0, -1)}`);
                    app.utils.showNotification(`${removed.name || 'Elemento'} eliminado.`, 'success', () => {
                        app.undo.last?.do();
                        app.undo.clear();
                    });
                    app.logActivity(`Eliminó ${collectionName.slice(0, -1)}: ${removed.name || removed.id}`);
                    app.persistState();
                    app.render();
                }
            },
            handlePurchase(data) {
                const supplierId = parseInt(data.supplierId),
                    productId = parseInt(data.productId),
                    qty = parseInt(data.quantity),
                    cost = parseFloat(data.cost);
                if (![supplierId, productId, qty, cost].every(v => !isNaN(v) && v > 0)) return app.utils.showNotification('Completa correctamente la compra.', 'error');
                const prod = app.state.products.find(p => p.id === productId);
                if (prod) {
                    const prevQty = prod.quantity;
                    prod.quantity += qty;
                    const purchase = app.crud.create('purchases', {
                        supplierId,
                        productId,
                        quantity: qty,
                        cost,
                        date: new Date().toISOString(),
                        branchId: app.state.currentBranchId,
                    });
                    app.undo.set(() => {
                        prod.quantity = prevQty;
                        const i = app.state.purchases.findIndex(x => x.id === purchase.id);
                        if (i > -1) app.state.purchases.splice(i, 1);
                        app.persistState();
                        app.render();
                    }, 'Registrar compra');
                    app.logActivity(`Compra de ${qty} x ${prod.name}`);
                    app.utils.showNotification('Compra registrada.', 'success', () => {
                        app.undo.last?.do();
                        app.undo.clear();
                    });
                    app.persistState();
                }
            },
            handlePayment(data) {
                const amount = parseFloat(data.amount);
                const entityId = parseInt(data.entityId);
                const type = data.type;
                if (isNaN(amount) || amount <= 0 || !entityId) {
                    return app.utils.showNotification('Datos de abono inválidos.', 'error');
                }
                const collection = type === 'client' ? app.state.clients : app.state.suppliers;
                const entity = collection.find(e => e.id === entityId);
                if (entity && entity.hasCredit) {
                    const prevUsed = entity.creditUsed;
                    entity.creditUsed -= amount;
                    if (entity.creditUsed < 0) entity.creditUsed = 0;
                    const payment = this.create('payments', {
                        type,
                        entityId,
                        entityName: entity.name,
                        amount,
                        date: new Date().toISOString(),
                        dueDate: data.dueDate || null,
                    });
                    app.undo.set(() => {
                        entity.creditUsed = prevUsed;
                        const i = app.state.payments.findIndex(p => p.id === payment.id);
                        if (i > -1) app.state.payments.splice(i, 1);
                        app.persistState();
                        app.render();
                    }, 'Registrar abono');
                    app.utils.showNotification(`Abono de ${app.utils.formatCurrency(amount)} registrado para ${entity.name}.`, 'success', () => {
                        app.undo.last?.do();
                        app.undo.clear();
                    });
                    app.persistState();
                } else {
                    app.utils.showNotification(`No se encontró o no tiene crédito: ${type}.`, 'error');
                }
            }
        },
        pos: {
            addToCart(productId) {
                const p = app.state.products.find(x => x.id === productId);
                if (!p) return;
                if (p.quantity <= 0) return app.utils.showNotification('Producto sin stock.', 'error');
                const item = app.state.cart.find(i => i.id === productId);
                const next = (item?.quantity || 0) + 1;
                if (next > p.quantity) return app.utils.showNotification('No hay más stock disponible.', 'error');
                if (p.quantity - next <= (p.minStock ?? app.state.LOW_STOCK_THRESHOLD)) app.utils.showNotification(`Aviso: "${p.name}" quedará en stock bajo (${p.quantity - next}).`, 'warn');
                if (item) item.quantity++;
                else app.state.cart.push({ ...p, quantity: 1 });
                app.render();
            },
            removeFromCart(id) {
                app.state.cart = app.state.cart.filter(i => i.id !== id);
                app.render();
            },
            updateCartQuantity(id, newQty) {
                const item = app.state.cart.find(i => i.id === id);
                const p = app.state.products.find(x => x.id === id);
                if (!item || !p) return;
                if (newQty <= 0) { this.removeFromCart(id); return; }
                if (newQty > p.quantity) {
                    item.quantity = p.quantity;
                    return app.utils.showNotification('Cantidad máxima de stock alcanzada.', 'error');
                }
                if (p.quantity - newQty <= (p.minStock ?? app.state.LOW_STOCK_THRESHOLD)) app.utils.showNotification(`Aviso: "${p.name}" quedará en stock bajo (${p.quantity - newQty}).`, 'warn');
                item.quantity = newQty;
                app.render();
            },
            calculateTotal() {
                return app.state.cart.reduce((t, i) => t + (i.price * i.quantity), 0);
            },
            completeSale(paymentMethod, clientId) {
                if (app.state.cart.length === 0) return app.utils.showNotification('El carrito está vacío.', 'error');
                if (paymentMethod === 'Credito' && !clientId) return app.utils.showNotification('Seleccione un cliente para venta a crédito.', 'error');
                const client = app.state.clients.find(c => c.id === clientId);
                const total = this.calculateTotal();
                if (paymentMethod === 'Credito') {
                    if (!client?.hasCredit) return app.utils.showNotification('Este cliente no tiene crédito activo.', 'error');
                    if ((client.creditUsed + total) > client.creditLimit) return app.utils.showNotification(`Límite de crédito excedido. Disponible: ${app.utils.formatCurrency(client.creditLimit - client.creditUsed)}`, 'error');
                }
                let clientName = 'Mostrador';
                const before = app.state.products.map(p => ({ id: p.id, quantity: p.quantity }));
                app.state.cart.forEach(ci => {
                    const p = app.state.products.find(x => x.id === ci.id);
                    if (p) p.quantity -= ci.quantity;
                });
                if (paymentMethod === 'Credito') {
                    if (client) {
                        client.creditUsed += total;
                        clientName = client.name;
                    }
                }
                const sale = app.crud.create('sales', {
                    items: [...app.state.cart],
                    total,
                    paymentMethod,
                    clientId: paymentMethod === 'Credito' ? clientId : null,
                    clientName,
                    date: new Date().toISOString(),
                    branchId: this.state.currentBranchId,
                });
                app.state.cart.forEach(ci => {
                    const p = app.state.products.find(x => x.id === ci.id);
                    if (p && p.quantity <= (p.minStock ?? app.state.LOW_STOCK_THRESHOLD)) app.utils.showNotification(`Stock bajo: "${p.name}" quedó en ${p.quantity}.`, 'warn');
                });
                app.undo.set(() => {
                    before.forEach(prev => {
                        const p = app.state.products.find(x => x.id === prev.id);
                        if (p) p.quantity = prev.quantity;
                    });
                    if (paymentMethod === 'Credito' && clientId) {
                        const c = app.state.clients.find(x => x.id === clientId);
                        if (c) c.creditUsed -= total;
                    }
                    const i = app.state.sales.findIndex(s => s.id === sale.id);
                    if (i > -1) app.state.sales.splice(i, 1);
                    app.persistState();
                    app.render();
                }, 'Completar venta');
                app.logActivity(`Venta de ${app.utils.formatCurrency(total)} a ${clientName}`);
                app.state.cart = [];
                app.persistState();
                app.utils.showNotification('¡Venta completada!', 'success', () => {
                    app.undo.last?.do();
                    app.undo.clear();
                });
                app.navigateTo('pos');
            }
        },
        cash: {
            getUnreconciledSales() {
                const set = new Set(app.state.cashReconciliations.flatMap(r => r.salesCovered || []));
                return app.state.sales.filter(s => s.branchId === this.state.currentBranchId && s.paymentMethod === 'Contado' && !set.has(s.id));
            },
            calculateSystemTotal() {
                return this.getUnreconciledSales().reduce((s, v) => s + v.total, 0);
            },
            performReconciliation(data) {
                const physical = parseFloat(data.physicalCash);
                if (isNaN(physical)) return app.utils.showNotification('El monto en efectivo no es válido.', 'error');
                const unreconciled = this.getUnreconciledSales();
                const system = this.calculateSystemTotal();
                const discrepancy = physical - system;
                const covered = unreconciled.map(s => s.id);
                const rec = app.crud.create('cashReconciliations', {
                    date: new Date().toISOString(),
                    systemTotalCash: system,
                    physicalCashCount: physical,
                    discrepancy,
                    notes: data.notes || '',
                    salesCovered: covered,
                    branchId: this.state.currentBranchId,
                });
                app.undo.set(() => {
                    const i = app.state.cashReconciliations.findIndex(r => r.id === rec.id);
                    if (i > -1) app.state.cashReconciliations.splice(i, 1);
                    app.persistState();
                    app.render();
                }, 'Corte de caja');
                app.logActivity(`Corte de caja con discrepancia de ${app.utils.formatCurrency(discrepancy)}`);
                app.utils.showNotification('Corte de caja finalizado.', 'success', () => {
                    app.undo.last?.do();
                    app.undo.clear();
                });
            }
        },
        transfers: {
            performTransfer(data) {
                const from = app.state.currentBranchId;
                const to = parseInt(data.toBranchId);
                const productId = parseInt(data.productId);
                const qty = parseInt(data.quantity);
                if (!to || !productId || !qty || qty <= 0) return app.utils.showNotification('Todos los campos son obligatorios.', 'error');
                const src = app.state.products.find(p => p.id === productId && p.branchId === from);
                if (!src || src.quantity < qty) return app.utils.showNotification('Stock insuficiente en origen.', 'error');
                const prevSrc = src.quantity;
                src.quantity -= qty;
                let dst = app.state.products.find(p => p.branchId === to && p.name === src.name);
                let createdId = null;
                let prevDst;
                if (dst) {
                    prevDst = dst.quantity;
                    dst.quantity += qty;
                } else {
                    dst = app.crud.create('products', {
                        branchId: to,
                        name: src.name,
                        type: src.type,
                        description: src.description,
                        quantity: qty,
                        minStock: src.minStock || 0,
                        price: src.price
                    }, false);
                    createdId = dst.id;
                }
                const t = app.crud.create('transfers', {
                    fromBranchId: from,
                    toBranchId: to,
                    productId: src.id,
                    productName: src.name,
                    quantity: qty,
                    date: new Date().toISOString()
                }, false);
                app.undo.set(() => {
                    src.quantity = prevSrc;
                    if (createdId) {
                        const i = app.state.products.findIndex(p => p.id === createdId);
                        if (i > -1) app.state.products.splice(i, 1);
                    } else {
                        dst.quantity = prevDst;
                    }
                    const ti = app.state.transfers.findIndex(x => x.id === t.id);
                    if (ti > -1) app.state.transfers.splice(ti, 1);
                    app.persistState();
                    app.render();
                }, 'Transferencia');
                const fromName = app.state.branches.find(b => b.id === from).name;
                const toName = app.state.branches.find(b => b.id === to).name;
                app.logActivity(`Transferencia de ${qty}x ${src.name} de ${fromName} a ${toName}`);
                app.utils.showNotification('Transferencia realizada.', 'success', () => {
                    app.undo.last?.do();
                    app.undo.clear();
                });
            }
        },
        reports: {
            downloadPdf() {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const branch = app.state.branches.find(b => b.id === app.state.currentBranchId);
                const sales = app.state.sales.filter(s => s.branchId === app.state.currentBranchId);
                const purchases = app.state.purchases.filter(p => p.branchId === app.state.currentBranchId);
                doc.setFontSize(18);
                doc.text(`Reporte de Operaciones - Agronare`, 14, 22);
                doc.setFontSize(12);
                doc.text(`Sucursal: ${branch.name}`, 14, 30);
                doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 14, 36);
                const salesData = sales.map(s => [app.utils.formatDateTime(s.date), s.clientName, s.items.map(i => `${i.quantity}x ${i.name}`).join(', '), s.paymentMethod, app.utils.formatCurrency(s.total)]);
                const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
                doc.autoTable({
                    head: [['Fecha', 'Cliente', 'Productos', 'Pago', 'Total']],
                    body: salesData,
                    startY: 45,
                    headStyles: { fillColor: [22, 101, 52] },
                    foot: [['', '', '', 'TOTAL', app.utils.formatCurrency(totalSales)]],
                    footStyles: { fontStyle: 'bold' }
                });
                const finalY = doc.autoTable.previous.finalY;
                const purchasesData = purchases.map(p => [app.utils.formatDateTime(p.date), app.state.products.find(pr => pr.id === p.productId)?.name || 'N/A', p.quantity, app.utils.formatCurrency(p.cost)]);
                const totalPurchases = purchases.reduce((s, p) => s + p.cost, 0);
                doc.autoTable({
                    head: [['Fecha', 'Producto', 'Cantidad', 'Costo Total']],
                    body: purchasesData,
                    startY: finalY + 15,
                    headStyles: { fillColor: [22, 101, 52] },
                    foot: [['', '', 'TOTAL GASTOS', app.utils.formatCurrency(totalPurchases)]],
                    footStyles: { fontStyle: 'bold' }
                });
                doc.save(`Reporte_Agronare_${branch.name.replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
                app.utils.showNotification('Reporte PDF generado.', 'info');
            },
            downloadExcel() {
                const branch = app.state.branches.find(b => b.id === app.state.currentBranchId);
                const sales = app.state.sales.filter(s => s.branchId === app.state.currentBranchId);
                const purchases = app.state.purchases.filter(p => p.branchId === app.state.currentBranchId);
                const salesData = sales.map(s => ({
                    Fecha: app.utils.formatDateTime(s.date),
                    Cliente: s.clientName,
                    Productos: s.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
                    "Método de Pago": s.paymentMethod,
                    Total: s.total
                }));
                const purchasesData = purchases.map(p => ({
                    Fecha: app.utils.formatDateTime(p.date),
                    Proveedor: app.state.suppliers.find(s => s.id === p.supplierId)?.name || 'N/A',
                    Producto: app.state.products.find(pr => pr.id === p.productId)?.name || 'N/A',
                    Cantidad: p.quantity,
                    "Costo Total": p.cost
                }));
                const wb = XLSX.utils.book_new();
                const wsSales = XLSX.utils.json_to_sheet(salesData);
                const wsPurchases = XLSX.utils.json_to_sheet(purchasesData);
                XLSX.utils.book_append_sheet(wb, wsSales, "Ventas");
                XLSX.utils.book_append_sheet(wb, wsPurchases, "Compras");
                XLSX.writeFile(wb, `Reporte_Agronare_${branch.name.replace(' ', '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
                app.utils.showNotification('Reporte Excel generado.', 'info');
            }
        },
        utils: {
            formatCurrency: (a) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(a),
            formatDateTime: (s) => new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
            showNotification(message, type = 'success', undoCallback = null) {
                const n = document.createElement('div');
                const t = (type === 'warn' ? 'notification-warning' : `notification-${type}`);
                n.className = `notification ${t}`;
                n.innerHTML = `<span>${message}</span>${undoCallback ? '<button class="undo-btn" title="Deshacer" aria-label="Deshacer">Deshacer</button>' : ''}`;
                const c = app.dom.notificationContainer;
                c.appendChild(n);
                if (undoCallback) {
                    n.querySelector('.undo-btn').addEventListener('click', () => {
                        undoCallback();
                        n.remove();
                    });
                }
                setTimeout(() => {
                    n.classList.add('fade-out');
                    setTimeout(() => n.remove(), 500);
                }, 3500);
            },
            closeModal() { app.dom.modalContainer.innerHTML = ''; },
            confirmDelete(type, id) {
                const col = type + 's';
                const item = app.state[col].find(i => i.id === id);
                if (!item) return;
                if (type === 'branch' && app.state.users.some(u => u.branchId === id)) return app.utils.showNotification('No se puede eliminar. Hay usuarios asignados a esta sucursal.', 'error');
                this.renderModal(
                    `Confirmar Eliminación`,
                    `<p>¿Estás seguro de que quieres eliminar <strong>"${item.name}"</strong>? Esta acción no se puede deshacer.</p>
                     <div class="pt-6 flex justify-end space-x-3">
                         <button type="button" data-action="closeModal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                         <button type="button" data-action="deleteItemConfirmed" data-type="${type}" data-id="${id}" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">Eliminar</button>
                     </div>`
                );
            },
            renderModal(title, content) {
                app.dom.modalContainer.innerHTML = `
                <div class="modal-backdrop fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="${title}">
                  <div class="modal-content p-6" role="document">
                    <div class="flex justify-between items-center pb-4 border-b">
                      <h3 class="text-xl font-bold text-gray-800">${title}</h3>
                      <button data-action="closeModal" class="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                              aria-label="Cerrar modal" title="Cerrar"><span aria-hidden="true">&times;</span></button>
                    </div>
                    <div class="pt-6">${content}</div>
                  </div>
                </div>`;
            }
        },
        logActivity(text) {
            this.state.activities.unshift({ text, time: new Date() });
            if (this.state.activities.length > 20) this.state.activities.pop();
            this.persistState();
        },
        templates: {
            dashboard(state) {
                const branchSales = state.sales.filter(s => s.branchId === state.currentBranchId);
                const branchClients = state.clients.filter(c => c.branchId === state.currentBranchId);
                const branchProducts = state.products.filter(p => p.branchId === state.currentBranchId);
                const totalSales = branchSales.reduce((sum, s) => sum + s.total, 0);
                const totalCredit = branchClients.reduce((sum, c) => sum + (c.creditUsed || 0), 0);
                const inventoryValue = branchProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0);
                return `
                  <div class="flex justify-between items-center mb-6">
                    <div>
                      <h1 class="text-2xl font-bold text-gray-800">Bienvenido al Panel de Control</h1>
                      <p class="text-gray-600">Aquí puedes gestionar las operaciones de la sucursal.</p>
                    </div>
                    <div class="flex space-x-3">
                      <button data-action="downloadPdfReport" class="bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm border flex items-center" aria-label="Descargar reporte PDF" title="Descargar PDF"><i class="fas fa-file-pdf text-red-500 mr-2" aria-hidden="true"></i>PDF</button>
                      <button data-action="downloadExcelReport" class="bg-white hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-lg shadow-sm border flex items-center" aria-label="Descargar reporte Excel" title="Descargar Excel"><i class="fas fa-file-excel text-green-600 mr-2" aria-hidden="true"></i>Excel</button>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div class="card p-5"><div class="flex justify-between items-start"><div><p class="text-gray-500 text-sm">Ventas (Sucursal)</p><p class="text-2xl font-bold text-gray-800">${app.utils.formatCurrency(totalSales)}</p></div><div class="bg-emerald-100 p-3 rounded-full"><i class="fas fa-dollar-sign text-emerald-600 text-xl" aria-hidden="true"></i></div></div></div>
                    <div class="card p-5"><div class="flex justify-between items-start"><div><p class="text-gray-500 text-sm">Cuentas por Cobrar</p><p class="text-2xl font-bold text-gray-800">${app.utils.formatCurrency(totalCredit)}</p></div><div class="bg-amber-100 p-3 rounded-full"><i class="fas fa-hand-holding-usd text-amber-600 text-xl" aria-hidden="true"></i></div></div></div>
                    <div class="card p-5"><div class="flex justify-between items-start"><div><p class="text-gray-500 text-sm">Valor de Inventario</p><p class="text-2xl font-bold text-gray-800">${app.utils.formatCurrency(inventoryValue)}</p></div><div class="bg-sky-100 p-3 rounded-full"><i class="fas fa-boxes text-sky-600 text-xl" aria-hidden="true"></i></div></div></div>
                    <div class="card p-5"><div class="flex justify-between items-start"><div><p class="text-gray-500 text-sm">Clientes</p><p class="text-2xl font-bold text-gray-800">${branchClients.length}</p></div><div class="bg-indigo-100 p-3 rounded-full"><i class="fas fa-users text-indigo-600 text-xl" aria-hidden="true"></i></div></div></div>
                  </div>
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="lg:col-span-2 card p-6">
                      <h3 class="text-lg font-bold text-gray-800 mb-4">Rendimiento de Ventas</h3>
                      <div class="h-80"><canvas id="monthlySalesChart" aria-label="Gráfico de ventas mensuales" role="img"></canvas></div>
                    </div>
                    <div class="card p-6">
                      <h3 class="text-lg font-bold text-gray-800 mb-4">Ventas por Categoría</h3>
                      <div class="h-80"><canvas id="categorySalesChart" aria-label="Gráfico de ventas por categoría" role="img"></canvas></div>
                    </div>
                  </div>
                  <div class="card p-6 mt-6">
                    <div class="flex justify-between items-center mb-4">
                      <h3 class="text-lg font-bold text-gray-800">✨ Análisis con IA</h3>
                      <button data-action="analyzePerformance" class="btn-primary flex items-center" aria-label="Analizar rendimiento con IA" title="Analizar rendimiento"><i class="fas fa-brain mr-2" aria-hidden="true"></i>Analizar Rendimiento</button>
                    </div>
                    <div id="ai-analysis-result" class="bg-gray-50 p-4 rounded-lg min-h-[100px]"><p class="text-center text-gray-500">Presiona el botón para generar un análisis de la sucursal actual.</p></div>
                  </div>`;
            },
            inventory(state) {
                const branchProducts = state.products.filter(p => p.branchId === state.currentBranchId);
                const categories = ['Todos', ...new Set(branchProducts.map(p => p.type))];
                const categoryFilters = categories.map(cat => `<button data-action="filterInventoryCategory" data-category="${cat}" class="category-filter px-4 py-2 text-sm font-medium ${state.inventoryCategoryFilter === cat ? 'active' : ''}" aria-pressed="${state.inventoryCategoryFilter === cat}" title="Filtrar por ${cat}">${cat}</button>`).join('');
                const filtered = branchProducts.filter(p => (state.inventoryCategoryFilter === 'Todos' || p.type === state.inventoryCategoryFilter) && p.name.toLowerCase().includes(state.inventorySearchTerm.toLowerCase()));
                const productCards = filtered.map(p => {
                    const low = p.quantity <= (p.minStock ?? app.state.LOW_STOCK_THRESHOLD);
                    const stockColor = low ? 'text-red-600' : 'text-gray-700';
                    const badge = low ? `<span class="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full" aria-label="Stock bajo">Stock bajo</span>` : '';
                    const typeColors = {
                        'Agroquímico': 'bg-red-100 text-red-800',
                        'Fertilizante': 'bg-blue-100 text-blue-800',
                        'Semilla': 'bg-yellow-100 text-yellow-800',
                        'Otro': 'bg-gray-100 text-gray-800'
                    };
                    return `
                    <div class="card flex flex-col">
                      <div class="p-5 flex-1">
                        <div class="flex justify-between items-start">
                          <h3 class="text-lg font-bold text-gray-900">${p.name}</h3>
                          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeColors[p.type] || typeColors['Otro']}">${p.type}</span>
                        </div>
                        <p class="text-gray-600 mt-2 text-sm">${p.description || 'Sin descripción.'}</p>
                        <div class="mt-4"><p class="text-sm text-gray-500">Stock mínimo: <b>${p.minStock ?? 0}</b></p></div>
                        <div class="mt-2 flex justify-between items-center">
                          <p class="text-xl font-bold text-green-600">${app.utils.formatCurrency(p.price)}</p>
                          <p class="text-sm font-semibold ${stockColor}">Stock: ${p.quantity} ${badge}</p>
                        </div>
                      </div>
                      <div class="bg-gray-50 px-5 py-3 flex justify-end space-x-3">
                        <button data-action="showProductModal" data-id="${p.id}" class="text-sm text-blue-600 hover:text-blue-800 font-medium" title="Editar producto ${p.name}">Editar</button>
                        <button data-action="deleteItem" data-type="product" data-id="${p.id}" class="text-sm text-red-600 hover:text-red-800 font-medium" title="Eliminar producto ${p.name}">Eliminar</button>
                      </div>
                    </div>`;
                }).join('');
                return `
                  <div class="card p-4 mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div class="md:col-span-2">
                        <label for="inventory-search" class="sr-only">Buscar producto</label>
                        <input id="inventory-search" type="text" placeholder="Buscar producto..." value="${state.inventorySearchTerm}" class="form-input w-full" autocomplete="off" aria-label="Buscar producto">
                      </div>
                      <div class="flex justify-end"><button data-action="showProductModal" class="btn-primary w-full md:w-auto flex items-center justify-center" aria-label="Agregar producto" title="Agregar producto"><i class="fas fa-plus mr-2" aria-hidden="true"></i>Agregar Producto</button></div>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-4 pt-4 border-t" role="toolbar" aria-label="Filtros de inventario">${categoryFilters}</div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">${productCards || '<p class="col-span-full text-center text-gray-500 py-10">No hay productos que coincidan.</p>'}</div>`;
            },
            clients(state) {
                const list = state.clients.filter(c => c.branchId === state.currentBranchId).map(c => {
                    const creditAvailable = (c.creditLimit || 0) - (c.creditUsed || 0);
                    const creditUsage = c.creditLimit ? ((c.creditUsed || 0) / c.creditLimit) * 100 : 0;
                    let dateClass = 'text-gray-500';
                    let alertText = '';
                    if (c.hasCredit && c.creditPaymentDate) {
                        const now = new Date();
                        const paymentDate = new Date(c.creditPaymentDate + 'T00:00:00');
                        const diff = (paymentDate - now) / (1000 * 60 * 60 * 24);
                        if (diff < 0) { dateClass = 'text-red-600 font-bold'; alertText = ' (Vencido)'; }
                        else if (diff <= 7) { dateClass = 'text-yellow-600 font-semibold'; alertText = ' (Próximo)'; }
                    }
                    return `
                    <div class="card p-5">
                      <h3 class="text-lg font-bold text-gray-900">${c.name}</h3>
                      <p class="text-sm text-gray-500">${c.phone || 'N/A'}</p>
                      <p class="text-sm text-gray-500">${c.email || 'N/A'}</p>
                      ${c.hasCredit ? `
                      <div class="mt-3 pt-3 border-t">
                        <div class="flex justify-between items-center text-sm">
                          <span class="font-medium text-gray-600">Crédito Usado:</span>
                          <span class="font-bold ${c.creditUsed > 0 ? 'text-red-600' : 'text-gray-800'}">${app.utils.formatCurrency(c.creditUsed || 0)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div class="bg-red-500 h-2.5 rounded-full" style="width: ${creditUsage}%"></div>
                        </div>
                         <div class="flex justify-between items-center text-xs text-gray-500 mt-1">
                          <span>Disp: ${app.utils.formatCurrency(creditAvailable)}</span>
                          <span>Límite: ${app.utils.formatCurrency(c.creditLimit)}</span>
                         </div>
                         <div class="flex justify-between items-center text-xs mt-1">
                             <span class="text-gray-500">Corte: ${c.creditCutoffDate ? new Date(c.creditCutoffDate + 'T00:00:00').toLocaleDateString('es-MX') : 'N/A'}</span>
                             <span class="${dateClass}">Pago: ${c.creditPaymentDate ? new Date(c.creditPaymentDate + 'T00:00:00').toLocaleDateString('es-MX') : 'N/A'} ${alertText}</span>
                         </div>
                      </div>` : '<div class="mt-3 pt-3 border-t text-sm text-gray-500">Sin crédito</div>'}
                      <div class="mt-4 flex justify-end space-x-3">
                        ${c.hasCredit ? `<button data-action="showPaymentModal" data-id="${c.id}" data-type="client" class="text-sm text-green-600 hover:text-green-800 font-medium">Abonar</button>` : ''}
                        <button data-action="showClientModal" data-id="${c.id}" class="text-sm text-blue-600 hover:text-blue-800 font-medium" title="Editar cliente ${c.name}">Editar</button>
                        <button data-action="deleteItem" data-type="client" data-id="${c.id}" class="text-sm text-red-600 hover:text-red-800 font-medium" title="Eliminar cliente ${c.name}">Eliminar</button>
                      </div>
                    </div>`
                }).join('');
                return `<div class="flex justify-end mb-6"><button data-action="showClientModal" class="btn-primary flex items-center" aria-label="Agregar cliente" title="Agregar cliente"><i class="fas fa-plus mr-2" aria-hidden="true"></i>Agregar Cliente</button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${list || '<p class="col-span-full text-center text-gray-500">No hay clientes.</p>'}</div>`;
            },
            suppliers(state) {
                const list = state.suppliers.filter(s => s.branchId === state.currentBranchId).map(s => {
                    const creditAvailable = (s.creditLimit || 0) - (s.creditUsed || 0);
                    const creditUsage = s.creditLimit ? ((s.creditUsed || 0) / s.creditLimit) * 100 : 0;
                    let dateClass = 'text-gray-500';
                    let alertText = '';
                    if (s.hasCredit && s.creditPaymentDate) {
                        const now = new Date();
                        const paymentDate = new Date(s.creditPaymentDate + 'T00:00:00');
                        const diff = (paymentDate - now) / (1000 * 60 * 60 * 24);
                        if (diff < 0) { dateClass = 'text-red-600 font-bold'; alertText = ' (Vencido)'; }
                        else if (diff <= 7) { dateClass = 'text-yellow-600 font-semibold'; alertText = ' (Próximo)'; }
                    }
                    return `
                    <div class="card p-5">
                      <h3 class="text-lg font-bold text-gray-900">${s.name}</h3>
                      <p class="text-sm text-gray-500">Contacto: ${s.contact || 'N/A'}</p>
                      <p class="text-sm text-gray-500">Tel: ${s.phone || 'N/A'}</p>
                      ${s.hasCredit ? `
                      <div class="mt-3 pt-3 border-t">
                        <div class="flex justify-between items-center text-sm">
                          <span class="font-medium text-gray-600">Crédito Usado:</span>
                          <span class="font-bold ${s.creditUsed > 0 ? 'text-red-600' : 'text-gray-800'}">${app.utils.formatCurrency(s.creditUsed || 0)}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div class="bg-red-500 h-2.5 rounded-full" style="width: ${creditUsage}%"></div>
                        </div>
                         <div class="flex justify-between items-center text-xs text-gray-500 mt-1">
                          <span>Disp: ${app.utils.formatCurrency(creditAvailable)}</span>
                          <span>Límite: ${app.utils.formatCurrency(s.creditLimit)}</span>
                         </div>
                         <div class="flex justify-between items-center text-xs mt-1">
                             <span class="text-gray-500">Corte: ${s.creditCutoffDate ? new Date(s.creditCutoffDate + 'T00:00:00').toLocaleDateString('es-MX') : 'N/A'}</span>
                             <span class="${dateClass}">Pago: ${s.creditPaymentDate ? new Date(s.creditPaymentDate + 'T00:00:00').toLocaleDateString('es-MX') : 'N/A'} ${alertText}</span>
                         </div>
                      </div>` : '<div class="mt-3 pt-3 border-t text-sm text-gray-500">Sin crédito</div>'}
                      <div class="mt-4 flex justify-end space-x-3">
                        ${s.hasCredit ? `<button data-action="showPaymentModal" data-id="${s.id}" data-type="supplier" class="text-sm text-green-600 hover:text-green-800 font-medium">Abonar</button>` : ''}
                        <button data-action="showSupplierModal" data-id="${s.id}" class="text-sm text-blue-600 hover:text-blue-800 font-medium" title="Editar proveedor ${s.name}">Editar</button>
                        <button data-action="deleteItem" data-type="supplier" data-id="${s.id}" class="text-sm text-red-600 hover:text-red-800 font-medium" title="Eliminar proveedor ${s.name}">Eliminar</button>
                      </div>
                    </div>`
                }).join('');
                return `<div class="flex justify-end mb-6"><button data-action="showSupplierModal" class="btn-primary flex items-center" aria-label="Agregar proveedor" title="Agregar proveedor"><i class="fas fa-plus mr-2" aria-hidden="true"></i>Agregar Proveedor</button></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">${list || '<p class="col-span-full text-center text-gray-500">No hay proveedores.</p>'}</div>`;
            },
            purchases(state) {
                const rows = state.purchases.filter(p => p.branchId === state.currentBranchId).map(p => {
                    const supplier = state.suppliers.find(s => s.id === p.supplierId)?.name || 'N/A';
                    const product = state.products.find(pr => pr.id === p.productId)?.name || 'N/A';
                    return `<tr><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatDateTime(p.date)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${supplier}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.quantity}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatCurrency(p.cost)}</td></tr>`;
                }).join('');
                return `<div class="flex justify-end mb-6"><button data-action="showPurchaseModal" class="btn-primary flex items-center" aria-label="Registrar compra" title="Registrar compra"><i class="fas fa-plus mr-2" aria-hidden="true"></i>Registrar Compra</button></div><div class="card overflow-x-auto"><table class="min-w-full divide-y divide-gray-200" aria-label="Listado de compras"><thead><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Total</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">${rows || '<tr><td colspan="5" class="text-center py-4 text-gray-500">No hay compras.</td></tr>'}</tbody></table></div>`;
            },
            quotes(state) {
                const rows = state.quotes.filter(q => q.branchId === state.currentBranchId).map(q => {
                    const supplier = state.suppliers.find(s => s.id === q.supplierId)?.name || 'N/A';
                    return `<tr><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatDateTime(q.date)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${supplier}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${q.productName}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatCurrency(q.cost || 0)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${q.quantity}</td><td class="px-6 py-4 whitespace-nowrap text-sm"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">${q.status}</span></td></tr>`;
                }).join('');
                return `<div class="flex justify-end mb-6"><button data-action="showQuoteModal" class="btn-primary flex items-center" aria-label="Nueva cotización" title="Nueva cotización"><i class="fas fa-plus mr-2" aria-hidden="true"></i>Nueva Cotización</button></div><div class="card overflow-x-auto"><table class="min-w-full divide-y divide-gray-200" aria-label="Listado de cotizaciones"><thead><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">${rows || '<tr><td colspan="6" class="text-center py-4 text-gray-500">No hay cotizaciones.</td></tr>'}</tbody></table></div>`;
            },
            payments(state) {
                const branchPayments = state.payments.filter(p => {
                    const entityList = p.type === 'client' ? state.clients : state.suppliers;
                    const entity = entityList.find(e => e.id === p.entityId);
                    return entity && entity.branchId === state.currentBranchId;
                });
                const now = new Date();
                const upcomingPayments = branchPayments.filter(p => p.dueDate && new Date(p.dueDate) > now && (new Date(p.dueDate) - now) / (1000 * 60 * 60 * 24) <= 7)
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                const overduePayments = branchPayments.filter(p => p.dueDate && new Date(p.dueDate) <= now);
                const renderPaymentRow = (p) => {
                    const dueDate = p.dueDate ? new Date(p.dueDate) : null;
                    let dateClass = '';
                    if (dueDate) {
                        const diff = (dueDate - now) / (1000 * 60 * 60 * 24);
                        if (diff < 0) dateClass = 'text-red-500 font-bold';
                        else if (diff <= 7) dateClass = 'text-yellow-600';
                    }
                    return `
                    <tr>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatDateTime(p.date)}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.entityName}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.type === 'client' ? 'Abono de Cliente' : 'Abono a Proveedor'}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">${app.utils.formatCurrency(p.amount)}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm ${dateClass}">${p.dueDate ? new Date(p.dueDate).toLocaleDateString('es-MX') : 'N/A'}</td>
                    </tr>`;
                };
                return `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                              <div class="card">
                                  <div class="p-5 border-b"><h2 class="text-xl font-bold text-gray-800">Pagos Próximos y Vencidos</h2></div>
                                  <div class="p-5">
                                      <h3 class="font-semibold text-red-600 mb-2">Vencidos</h3>
                                      ${overduePayments.length > 0 ? overduePayments.map(p => `<div class="text-sm p-2 bg-red-50 rounded mb-2">${p.entityName} - ${app.utils.formatCurrency(p.amount)}</div>`).join('') : '<p class="text-sm text-gray-500">No hay pagos vencidos.</p>'}
                                      <h3 class="font-semibold text-yellow-600 mt-4 mb-2">Próximos (7 días)</h3>
                                       ${upcomingPayments.length > 0 ? upcomingPayments.map(p => `<div class="text-sm p-2 bg-yellow-50 rounded mb-2">${p.entityName} - ${app.utils.formatCurrency(p.amount)}</div>`).join('') : '<p class="text-sm text-gray-500">No hay pagos próximos.</p>'}
                                  </div>
                              </div>
                          </div>
                          <div class="card">
                              <div class="p-5 border-b"><h2 class="text-xl font-bold text-gray-800">Historial de Abonos</h2></div>
                              <div class="overflow-y-auto max-h-[60vh]">
                                  <table class="min-w-full divide-y divide-gray-200">
                                      <thead>
                                          <tr>
                                              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Abono</th>
                                              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                                              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Vencimiento</th>
                                          </tr>
                                      </thead>
                                      <tbody class="bg-white divide-y divide-gray-200">
                                          ${branchPayments.length > 0 ? branchPayments.map(renderPaymentRow).join('') : '<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay abonos registrados.</td></tr>'}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                    </div>
                `;
            },
            pos(state) {
                const products = state.products.filter(p => p.branchId === state.currentBranchId);
                const clients = state.clients.filter(c => c.branchId === state.currentBranchId);
                const categories = ['Todos', ...new Set(products.map(p => p.type))];
                const catBtns = categories.map(cat => `<button data-action="filterPosCategory" data-category="${cat}" class="category-filter px-3 py-1 text-sm ${state.posCategoryFilter === cat ? 'active' : ''}" aria-pressed="${state.posCategoryFilter === cat}" title="Filtrar por ${cat}">${cat}</button>`).join('');
                const filtered = products.filter(p => (state.posCategoryFilter === 'Todos' || p.type === state.posCategoryFilter) && p.name.toLowerCase().includes(state.posSearchTerm.toLowerCase()));
                const grid = filtered.map(p => {
                    const inCart = state.cart.find(i => i.id === p.id);
                    const out = p.quantity <= 0,
                        max = inCart && inCart.quantity >= p.quantity,
                        disabled = out || max;
                    let cls = 'cursor-pointer hover:shadow-md hover:border-green-500 bg-white';
                    if (disabled) cls = 'opacity-50 bg-gray-100 cursor-not-allowed';
                    else if (inCart) cls = 'border-green-600 bg-green-50';
                    const low = p.quantity <= (p.minStock ?? app.state.LOW_STOCK_THRESHOLD) ? `<div class="mt-1 text-[10px] text-white bg-red-600 rounded-full px-2 py-0.5">Bajo</div>` : '';
                    return `
                    <div data-action="addToCart" data-id="${p.id}" class="border rounded-lg p-3 flex flex-col justify-between text-center transition-all ${cls}" ${disabled ? 'aria-disabled="true"' : ''} title="Agregar ${p.name}">
                      <div>
                        <div class="flex justify-between items-start">
                            <h4 class="font-semibold text-sm text-left flex-1">${p.name}</h4>
                            <button data-action="getProductInfo" data-id="${p.id}" data-name="${p.name}" class="text-purple-500 hover:text-purple-700 text-xs ml-2" title="✨ Obtener información del producto con IA">
                                <i class="fas fa-wand-magic-sparkles"></i>
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Stock: ${p.quantity}</p>
                        <p class="font-bold text-green-600 mt-1">${app.utils.formatCurrency(p.price)}</p>
                      </div>
                      <div class="w-full mt-1">
                        ${inCart ? `<div class="text-xs text-white bg-green-600 rounded-full px-2 py-0.5">En carrito (${inCart.quantity})</div>` : ''}
                        ${max ? `<div class="text-xs text-white bg-gray-500 rounded-full px-2 py-0.5">Stock max</div>` : ''}
                        ${low}
                      </div>
                    </div>`;
                }).join('');
                const cartItems = state.cart.map(item => `
                  <div class="flex items-center justify-between text-sm py-2">
                    <div><p class="font-semibold">${item.name}</p><p class="text-gray-500">${app.utils.formatCurrency(item.price)} x ${item.quantity} = ${app.utils.formatCurrency(item.price * item.quantity)}</p></div>
                    <div class="flex items-center space-x-2">
                      <label for="cart-qty-${item.id}" class="sr-only">Cantidad para ${item.name}</label>
                      <input type="number" id="cart-qty-${item.id}" value="${item.quantity}" min="1" max="${state.products.find(p => p.id === item.id).quantity}" class="form-input w-16 text-center p-1" data-action="updateCartQuantity" data-id="${item.id}">
                      <button data-action="removeFromCart" data-id="${item.id}" class="text-red-500 hover:text-red-700 font-bold text-2xl" aria-label="Quitar ${item.name} del carrito" title="Quitar"><span aria-hidden="true">&times;</span></button>
                    </div>
                  </div>`).join('');
                const clientOptions = clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                return `
                  <form id="pos-form">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    <div class="lg:col-span-2 card p-6 flex flex-col h-[80vh]">
                      <div class="mb-4">
                        <label for="pos-search" class="sr-only">Buscar producto en punto de venta</label>
                        <input id="pos-search" type="text" placeholder="Buscar producto..." value="${state.posSearchTerm}" class="form-input w-full" autocomplete="off" aria-label="Buscar producto">
                      </div>
                      <div class="flex flex-wrap gap-2 mb-4 pb-4 border-b" role="toolbar" aria-label="Filtros de productos">${catBtns}</div>
                      <div class="flex-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2">${grid || '<p class="col-span-full text-center text-gray-500">No hay productos.</p>'}</div>
                    </div>
                    <div class="card p-6 flex flex-col h-[80vh]">
                      <h2 class="text-2xl font-bold mb-4">Venta Actual</h2>
                      <div class="flex-1 space-y-3 mb-4 overflow-y-auto border-b pb-4 pr-2">${cartItems || '<p class="text-center text-gray-400 py-8">El carrito está vacío</p>'}</div>
                      <div class="space-y-4 pt-4">
                        <div class="flex justify-between items-center text-xl font-bold"><span>TOTAL:</span><span>${app.utils.formatCurrency(app.pos.calculateTotal())}</span></div>
                        <div><label for="paymentMethod" class="form-label">Método de Pago</label><select id="paymentMethod" name="paymentMethod" class="form-input w-full"><option value="Contado">Contado</option><option value="Credito">Crédito</option></select></div>
                        <div id="clientSelectorContainer" class="hidden"><label for="clientId" class="form-label">Cliente</label><select id="clientId" name="clientId" class="form-input w-full"><option value="">Seleccionar cliente...</option>${clientOptions}</select></div>
                        <button type="submit" class="btn-primary w-full py-3" ${state.cart.length === 0 ? 'disabled' : ''}>Finalizar Venta</button>
                      </div>
                    </div>
                  </div>
                  </form>`;
            },
            cashReconciliation(state) {
                const systemTotal = app.cash.calculateSystemTotal();
                const branchRecs = state.cashReconciliations.filter(r => r.branchId === state.currentBranchId);
                const rows = [...branchRecs].reverse().map(r => {
                    let cls = 'text-green-600';
                    if (r.discrepancy < 0) cls = 'text-red-600';
                    else if (r.discrepancy > 0) cls = 'text-yellow-600';
                    return `<tr><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatDateTime(r.date)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatCurrency(r.systemTotalCash)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatCurrency(r.physicalCashCount)}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-bold ${cls}">${app.utils.formatCurrency(r.discrepancy)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.notes || '-'}</td></tr>`;
                }).join('');
                return `
                  <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2">
                      <form id="cash-reconciliation-form" class="card p-6 space-y-6">
                        <h2 class="text-2xl font-bold text-gray-800">Realizar Corte de Caja</h2>
                        <div><label class="block text-sm font-medium text-gray-500">Ventas en Efectivo (Sistema)</label><p class="text-3xl font-bold text-green-700 mt-1">${app.utils.formatCurrency(systemTotal)}</p></div>
                        <div><label for="physical-cash-input" class="form-label">Efectivo Físico en Caja</label><input type="number" step="0.01" id="physical-cash-input" name="physicalCash" data-system-total="${systemTotal}" class="form-input w-full" placeholder="0.00" required></div>
                        <div><label class="block text-sm font-medium text-gray-500">Discrepancia</label><p id="discrepancy-display" class="font-bold text-lg text-gray-700 mt-1">${app.utils.formatCurrency(0)}</p></div>
                        <div><label for="notes" class="form-label">Notas (Opcional)</label><textarea id="notes" name="notes" rows="3" class="form-input w-full"></textarea></div>
                        <button type="submit" class="btn-primary w-full py-3">Finalizar Corte</button>
                      </form>
                    </div>
                    <div class="lg:col-span-3 card p-6"><h2 class="text-2xl font-bold text-gray-800 mb-4">Historial de Cortes</h2><div class="overflow-x-auto max-h-[65vh]"><table class="min-w-full divide-y divide-gray-200" aria-label="Historial de cortes de caja"><thead><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sistema</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Físico</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discrepancia</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">${rows || `<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay cortes.</td></tr>`}</tbody></table></div></div>
                  </div>`;
            },
            transfers(state) {
                const otherBranches = state.branches.filter(b => b.id !== state.currentBranchId);
                const branchProducts = state.products.filter(p => p.branchId === state.currentBranchId);
                const otherBranchesOptions = otherBranches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                const productOptions = branchProducts.map(p => `<option value="${p.id}">${p.name} (Stock: ${p.quantity})</option>`).join('');
                const rows = [...state.transfers].reverse().map(t => {
                    const fromBranch = state.branches.find(b => b.id === t.fromBranchId)?.name || 'N/A';
                    const toBranch = state.branches.find(b => b.id === t.toBranchId)?.name || 'N/A';
                    return `<tr><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${app.utils.formatDateTime(t.date)}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${fromBranch}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${toBranch}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${t.productName}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">${t.quantity}</td></tr>`;
                }).join('');
                return `
                  <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div class="lg:col-span-2">
                      <form id="transfer-form" class="card p-6 space-y-6">
                        <h2 class="text-2xl font-bold text-gray-800">Iniciar Transferencia</h2>
                        <div><label class="block text-sm font-medium text-gray-500">Desde Sucursal</label><p class="text-lg font-semibold text-gray-800 mt-1">${state.branches.find(b => b.id === state.currentBranchId).name}</p></div>
                        <div><label for="toBranchId" class="form-label">Hacia Sucursal</label><select id="toBranchId" name="toBranchId" class="form-input w-full" required><option value="">Seleccionar destino...</option>${otherBranchesOptions}</select></div>
                        <div><label for="productId" class="form-label">Producto a Transferir</label><select id="productId" name="productId" class="form-input w-full" required><option value="">Seleccionar producto...</option>${productOptions}</select></div>
                        <div><label for="quantity" class="form-label">Cantidad</label><input type="number" id="quantity" name="quantity" min="1" class="form-input w-full" placeholder="0" required></div>
                        <button type="submit" class="btn-primary w-full py-3">Realizar Transferencia</button>
                      </form>
                    </div>
                    <div class="lg:col-span-3 card p-6"><h2 class="text-2xl font-bold text-gray-800 mb-4">Historial de Transferencias</h2><div class="overflow-x-auto max-h-[65vh]"><table class="min-w-full divide-y divide-gray-200" aria-label="Historial de transferencias"><thead><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">${rows || `<tr><td colspan="5" class="text-center py-8 text-gray-500">No hay transferencias.</td></tr>`}</tbody></table></div></div>
                  </div>`;
            },
            settings(state) {
                const branchRows = state.branches.map(b => `
                  <div class="flex items-center justify-between py-3 px-4 hover:bg-gray-50">
                    <p class="text-gray-800">${b.name}</p>
                    <div class="space-x-4">
                      <button data-action="showBranchModal" data-id="${b.id}" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <button data-action="deleteItem" data-type="branch" data-id="${b.id}" class="text-sm text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                    </div>
                  </div>`).join('');
                const userRows = state.users.map(u => {
                    const branchName = state.branches.find(b => b.id === u.branchId)?.name || 'N/A';
                    return `<div class="flex items-center justify-between py-3 px-4 hover:bg-gray-50">
                    <div><p class="text-gray-800 font-semibold">${u.name}</p><p class="text-sm text-gray-500">Sucursal: ${branchName} | Rol: ${u.role}</p></div>
                    <div class="space-x-4">
                      <button data-action="showUserModal" data-id="${u.id}" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Editar</button>
                      <button data-action="deleteItem" data-type="user" data-id="${u.id}" class="text-sm text-red-600 hover:text-red-800 font-medium">Eliminar</button>
                    </div>
                  </div>`;
                }).join('');
                return `
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div class="card">
                      <div class="p-5 border-b flex justify-between items-center"><h2 class="text-xl font-bold text-gray-800">Gestionar Sucursales</h2><button data-action="showBranchModal" class="btn-primary text-sm">Nueva</button></div>
                      <div class="divide-y max-h-96 overflow-y-auto">${branchRows}</div>
                    </div>
                    <div class="card">
                      <div class="p-5 border-b flex justify-between items-center"><h2 class="text-xl font-bold text-gray-800">Gestionar Usuarios</h2><button data-action="showUserModal" class="btn-primary text-sm">Nuevo</button></div>
                      <div class="divide-y max-h-96 overflow-y-auto">${userRows}</div>
                    </div>
                  </div>`;
            },
        },
        modals: {
            _baseForm(id, fields, submitButton) {
                return `<form id="${id}" class="space-y-4">
                  ${fields}
                  <div class="pt-4 flex justify-end space-x-3">
                    <button type="button" data-action="closeModal" class="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
                    <button type="submit" class="btn-primary">${submitButton}</button>
                  </div>
                </form>`;
            },
            product(id) {
                const p = app.state.products.find(prod => prod.id === id) || {};
                const title = id ? 'Editar Producto' : 'Nuevo Producto';
                const minStock = p.minStock ?? app.state.LOW_STOCK_THRESHOLD;
                const fields = `
                  <input type="hidden" name="id" value="${p.id || ''}">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="form-label" for="product-name">Nombre</label>
                      <input type="text" id="product-name" name="name" value="${p.name || ''}" class="form-input w-full" required>
                    </div>
                    <div>
                      <label class="form-label" for="product-type">Tipo</label>
                      <select id="product-type" name="type" class="form-input w-full">
                        <option ${p.type === 'Agroquímico' ? 'selected' : ''} value="Agroquímico">Agroquímico</option>
                        <option ${p.type === 'Fertilizante' ? 'selected' : ''} value="Fertilizante">Fertilizante</option>
                        <option ${p.type === 'Semilla' ? 'selected' : ''} value="Semilla">Semilla</option>
                        <option ${p.type === 'Otro' ? 'selected' : ''} value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div class="flex justify-between items-center">
                      <label class="form-label" for="product-desc">Descripción</label>
                      <button type="button" data-action="generateDescription" class="text-xs bg-green-100 text-green-800 font-semibold py-1 px-2 rounded-md hover:bg-green-200">✨ Generar con IA</button>
                    </div>
                    <textarea id="product-desc" name="description" class="form-input w-full">${p.description || ''}</textarea>
                  </div>
                  <div class="grid grid-cols-3 gap-4">
                    <div>
                      <label class="form-label" for="product-qty">Cantidad</label>
                      <input type="number" id="product-qty" name="quantity" value="${p.quantity || 0}" class="form-input w-full" required>
                    </div>
                    <div>
                      <label class="form-label" for="product-price">Precio</label>
                      <input type="number" id="product-price" name="price" step="0.01" value="${p.price || 0}" class="form-input w-full" required>
                    </div>
                    <div>
                      <label class="form-label" for="product-minstock">Stock Mín.</label>
                      <input type="number" id="product-minstock" name="minStock" min="0" value="${minStock}" class="form-input w-full" required>
                    </div>
                  </div>`;
                app.utils.renderModal(title, this._baseForm('product-form', fields, 'Guardar'));
            },
            client(id) {
                const c = app.state.clients.find(cli => cli.id === id) || {};
                const title = id ? 'Editar Cliente' : 'Nuevo Cliente';
                const fields = `
                  <input type="hidden" name="id" value="${c.id || ''}">
                  <label class="form-label" for="client-name">Nombre Completo</label>
                  <input type="text" id="client-name" name="name" value="${c.name || ''}" class="form-input w-full" required>
                  <label class="form-label" for="client-phone">Teléfono</label>
                  <input type="tel" id="client-phone" name="phone" value="${c.phone || ''}" class="form-input w-full">
                  <label class="form-label" for="client-email">Email</label>
                  <input type="email" id="client-email" name="email" value="${c.email || ''}" class="form-input w-full">
                  <div class="mt-4"><label class="flex items-center"><input type="checkbox" name="hasCredit" class="form-checkbox h-5 w-5 text-green-600" ${c.hasCredit ? 'checked' : ''}> <span class="ml-2 text-gray-700">Activar crédito</span></label></div>
                  <div class="credit-details space-y-4 p-4 bg-gray-50 rounded-lg ${!c.hasCredit ? 'hidden' : ''}">
                       <div><label class="form-label" for="client-creditLimit">Límite de Crédito</label><input type="number" id="client-creditLimit" name="creditLimit" value="${c.creditLimit || '0'}" class="form-input w-full"></div>
                       <div class="grid grid-cols-2 gap-4">
                           <div><label for="client-creditCutoffDate" class="form-label">Fecha de Corte</label><input type="date" id="client-creditCutoffDate" name="creditCutoffDate" value="${c.creditCutoffDate || ''}" class="form-input w-full"></div>
                           <div><label for="client-creditPaymentDate" class="form-label">Fecha Límite de Pago</label><input type="date" id="client-creditPaymentDate" name="creditPaymentDate" value="${c.creditPaymentDate || ''}" class="form-input w-full"></div>
                       </div>
                  </div>`;
                app.utils.renderModal(title, this._baseForm('client-form', fields, 'Guardar'));
            },
            supplier(id) {
                const s = app.state.suppliers.find(sup => sup.id === id) || {};
                const title = id ? 'Editar Proveedor' : 'Nuevo Proveedor';
                const fields = `
                  <input type="hidden" name="id" value="${s.id || ''}">
                  <label class="form-label" for="supplier-name">Nombre del Proveedor</label>
                  <input type="text" id="supplier-name" name="name" value="${s.name || ''}" class="form-input w-full" required>
                  <label class="form-label" for="supplier-contact">Contacto</label>
                  <input type="text" id="supplier-contact" name="contact" value="${s.contact || ''}" class="form-input w-full">
                  <label class="form-label" for="supplier-phone">Teléfono</label>
                  <input type="tel" id="supplier-phone" name="phone" value="${s.phone || ''}" class="form-input w-full">
                  <div class="mt-4"><label class="flex items-center"><input type="checkbox" name="hasCredit" class="form-checkbox h-5 w-5 text-green-600" ${s.hasCredit ? 'checked' : ''}> <span class="ml-2 text-gray-700">Activar crédito de proveedor</span></label></div>
                  <div class="credit-details space-y-4 p-4 bg-gray-50 rounded-lg ${!s.hasCredit ? 'hidden' : ''}">
                       <div><label class="form-label" for="supplier-creditLimit">Límite de Crédito</label><input type="number" id="supplier-creditLimit" name="creditLimit" value="${s.creditLimit || '0'}" class="form-input w-full"></div>
                       <div class="grid grid-cols-2 gap-4">
                           <div><label for="supplier-creditCutoffDate" class="form-label">Fecha de Corte</label><input type="date" id="supplier-creditCutoffDate" name="creditCutoffDate" value="${s.creditCutoffDate || ''}" class="form-input w-full"></div>
                           <div><label for="supplier-creditPaymentDate" class="form-label">Fecha Límite de Pago</label><input type="date" id="supplier-creditPaymentDate" name="creditPaymentDate" value="${s.creditPaymentDate || ''}" class="form-input w-full"></div>
                       </div>
                  </div>`;
                app.utils.renderModal(title, this._baseForm('supplier-form', fields, 'Guardar'));
            },
            purchase() {
                const suppliers = app.state.suppliers.filter(s => s.branchId === app.state.currentBranchId);
                const products = app.state.products.filter(p => p.branchId === app.state.currentBranchId);
                const supOpts = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                const prodOpts = products.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                const fields = `<div><label for="purchase-supplier" class="form-label">Proveedor</label><select id="purchase-supplier" name="supplierId" class="form-input w-full" required>${supOpts}</select></div><div><label for="purchase-product" class="form-label">Producto</label><select id="purchase-product" name="productId" class="form-input w-full" required>${prodOpts}</select></div><div class="grid grid-cols-2 gap-4"><div><label for="purchase-qty" class="form-label">Cantidad</label><input type="number" id="purchase-qty" name="quantity" class="form-input w-full" required></div><div><label for="purchase-cost" class="form-label">Costo Total ($)</label><input type="number" id="purchase-cost" step="0.01" name="cost" class="form-input w-full" required></div></div>`;
                app.utils.renderModal('Registrar Compra', this._baseForm('purchase-form', fields, 'Registrar'));
            },
            quote(id) {
                const q = app.state.quotes.find(x => x.id === id) || {};
                const title = id ? 'Editar Cotización' : 'Nueva Cotización';
                const suppliers = app.state.suppliers.filter(s => s.branchId === app.state.currentBranchId);
                const supplierOptions = suppliers.map(s => `<option value="${s.id}" ${q.supplierId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
                const fields = `
                    <input type="hidden" name="id" value="${q.id || ''}">
                    <label class="form-label">Proveedor</label>
                    <select name="supplierId" class="form-input w-full" required>${supplierOptions}</select>
                    <label class="form-label">Producto</label>
                    <input type="text" name="productName" value="${q.productName || ''}" class="form-input w-full" required>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="form-label">Costo por unidad</label>
                            <input type="number" name="cost" step="0.01" value="${q.cost || ''}" class="form-input w-full" required>
                        </div>
                        <div>
                            <label class="form-label">Cantidad</label>
                            <input type="number" name="quantity" value="${q.quantity || ''}" class="form-input w-full" required>
                        </div>
                    </div>`;
                app.utils.renderModal(title, this._baseForm('quote-form', fields, 'Guardar Cotización'));
            },
            payment(entityId, type) {
                const collection = type === 'client' ? app.state.clients : app.state.suppliers;
                const entity = collection.find(e => e.id === entityId);
                if (!entity) return;
                const title = `Registrar Abono para ${entity.name}`;
                const fields = `
                    <input type="hidden" name="entityId" value="${entityId}">
                    <input type="hidden" name="type" value="${type}">
                    <div>
                        <label for="payment-amount" class="form-label">Monto del Abono</label>
                        <input id="payment-amount" type="number" name="amount" step="0.01" class="form-input w-full" required>
                    </div>
                    <div>
                        <label for="payment-dueDate" class="form-label">Próximo Vencimiento (Opcional)</label>
                        <input id="payment-dueDate" type="date" name="dueDate" class="form-input w-full">
                    </div>`;
                app.utils.renderModal(title, this._baseForm('payment-form', fields, 'Registrar Abono'));
            },
            branch(id) {
                const branch = app.state.branches.find(b => b.id === id) || {};
                const title = id ? 'Editar Sucursal' : 'Nueva Sucursal';
                const fields = `<input type="hidden" name="id" value="${branch.id || ''}"><label for="branch-name" class="form-label">Nombre de la Sucursal</label><input type="text" id="branch-name" name="name" value="${branch.name || ''}" class="form-input w-full" required>`;
                app.utils.renderModal(title, this._baseForm('branch-form', fields, 'Guardar'));
            },
            user(id) {
                const user = app.state.users.find(u => u.id === id) || {};
                const title = id ? 'Editar Usuario' : 'Nuevo Usuario';
                const branchOpts = app.state.branches.map(b => `<option value="${b.id}" ${user.branchId === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
                const fields = `<input type="hidden" name="id" value="${user.id || ''}"><label for="user-name" class="form-label">Nombre</label><input type="text" id="user-name" name="name" value="${user.name || ''}" class="form-input w-full" required><label for="user-role" class="form-label">Rol</label><select id="user-role" name="role" class="form-input w-full"><option value="Admin" ${user.role === 'Admin' ? 'selected' : ''}>Admin</option><option value="Vendedor" ${user.role === 'Vendedor' ? 'selected' : ''}>Vendedor</option></select><label for="user-branchId" class="form-label">Sucursal Asignada</label><select id="user-branchId" name="branchId" class="form-input w-full" required>${branchOpts}</select>`;
                app.utils.renderModal(title, this._baseForm('user-form', fields, 'Guardar'));
            }
        }
    };
    app.init();
});