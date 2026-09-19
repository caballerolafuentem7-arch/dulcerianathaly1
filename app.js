// js/app.js - Lógica Frontend Integrada y Actualizada con Panel de Administración

const initialProducts = [
    { id: 1, name: "Queque Esponjoso Tradicional", price: 25.00, stock: 15, desc: "Clásico queque casero perfumado con vainilla y naranja.", img: "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&q=80&w=600" },
    { id: 2, name: "Empanadas Fritas Cruceñas", price: 5.00, stock: 40, desc: "Empanadas fritas doradas rellenas de queso criollo.", img: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&q=80&w=600" },
    { id: 3, name: "Torta Mixta (Dulce de Leche & Chantilly)", price: 120.00, stock: 6, desc: "Bizcochuelo húmedo relleno con dulce de leche artesanal.", img: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600" },
    { id: 4, name: "Cuñapé Tradicional", price: 3.50, stock: 60, desc: "Pan típico cruceño con almidón de yuca y queso.", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600" },
    { id: 5, name: "Rosca de Maíz Horneada", price: 4.00, stock: 25, desc: "Rosca horneada de harina de maíz y queso criollo.", img: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&q=80&w=600" }
];

// Sincronización robusta de productos en localStorage
let products = JSON.parse(localStorage.getItem('productosDulceria')) || JSON.parse(localStorage.getItem('nathaly_products')) || initialProducts;
localStorage.setItem('productosDulceria', JSON.stringify(products));
localStorage.setItem('nathaly_products', JSON.stringify(products));

let cart = [];
let currentUser = JSON.parse(localStorage.getItem('nathaly_user')) || JSON.parse(localStorage.getItem('usuarioLogueado')) || JSON.parse(localStorage.getItem('usuario')) || JSON.parse(localStorage.getItem('usuarioActual')) || null;
let orders = JSON.parse(localStorage.getItem('nathaly_orders')) || JSON.parse(localStorage.getItem('pedidosDulceria')) || [];

// Base de datos simulada/registrada de clientes para validación local
let registeredClients = JSON.parse(localStorage.getItem('nathaly_registered_clients')) || [];

let comprobanteBase64 = null;
let uploadedProofData = null; 

// -------------------------------------------------------------
// 🛡️ CONTROL DE ADMINISTRADORES Y ROLES
// -------------------------------------------------------------

// Lista de administradores autorizados
const ADMINS_AUTORIZADOS = [
    { email: "caballerolafuentem7@gmail.com", nombre: "Maria Cristina" },
    { email: "admin@dulceria.com", nombre: "Administrador" }
];

function checkAdminRole() {
    const btnAdmin = document.getElementById('btn-tab-admin');
    if (!btnAdmin) return;

    if (currentUser && (currentUser.email || currentUser.correo)) {
        const emailActual = (currentUser.email || currentUser.correo).toLowerCase().trim();
        const esAdmin = ADMINS_AUTORIZADOS.some(admin => admin.email.toLowerCase() === emailActual);
        if (esAdmin) {
            btnAdmin.classList.remove('hidden');
        } else {
            btnAdmin.classList.add('hidden');
        }
    } else {
        btnAdmin.classList.add('hidden');
    }
}

function verificarAdminCredenciales() {
    if (!currentUser) {
        alert("Acceso restringido. Debes iniciar sesión con una cuenta de Administrador.");
        openAuthModal();
        return false;
    }

    const emailActual = (currentUser.email || currentUser.correo || '').toLowerCase().trim();
    const esAdmin = ADMINS_AUTORIZADOS.some(admin => admin.email.toLowerCase() === emailActual);
    if (!esAdmin) {
        alert("Acceso denegado. Esta sección es exclusiva para administradores autorizados.");
        switchTab('catalog');
        return false;
    }
    return true;
}

window.addEventListener('DOMContentLoaded', () => {
    renderCatalog();
    updateAuthUI();
    updateCartUI();
    checkAdminRole();
});

// -------------------------------------------------------------
// 👤 AUTENTICACIÓN, REGISTRO Y VALIDACIÓN DE CORREO GMAIL
// -------------------------------------------------------------

function openAuthModal() { document.getElementById('auth-modal')?.classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal')?.classList.add('hidden'); }

function logout() {
    currentUser = null;
    localStorage.removeItem('nathaly_user');
    localStorage.removeItem('usuarioLogueado');
    localStorage.removeItem('usuario');
    localStorage.removeItem('usuarioActual');
    updateAuthUI();
    checkAdminRole();
    switchTab('catalog');
    alert('Has cerrado sesión exitosamente.');
}

function updateAuthUI() {
    const container = document.getElementById('user-auth-section');
    if (!container) return;

    if (currentUser) {
        const displayName = currentUser.name || currentUser.nombre || "Usuario";
        container.innerHTML = `
            <div class="flex items-center space-x-2 bg-rose-50 px-3 py-1.5 rounded-2xl border border-rose-100 shadow-sm">
                <span class="text-xs font-bold text-rose-700">${displayName}</span>
                <button onclick="logout()" title="Cerrar Sesión" class="text-rose-500 hover:text-rose-800 transition p-1 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <button onclick="openAuthModal()" class="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition">
                Iniciar Sesión / Registrarse
            </button>
        `;
    }
    
    checkAdminRole();
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const emailInput = document.getElementById('auth-email')?.value.trim();
    const nameInput = document.getElementById('auth-name')?.value.trim();
    const phoneInput = document.getElementById('auth-phone')?.value.trim();
    const errorBox = document.getElementById('gmail-error-box');

    if (!emailInput || !emailInput.toLowerCase().endsWith('@gmail.com')) {
        if (errorBox) {
            errorBox.textContent = "⚠️ Debe ingresar una cuenta de correo válida de Gmail (@gmail.com).";
            errorBox.classList.remove('hidden');
        } else {
            alert("⚠️ Debe ingresar una cuenta de correo válida de Gmail (@gmail.com).");
        }
        return;
    }

    let foundClient = registeredClients.find(c => c.email.toLowerCase() === emailInput.toLowerCase());

    if (!foundClient) {
        if (!nameInput || !phoneInput) {
            if (errorBox) {
                errorBox.innerHTML = `⚠️ El correo <b>${emailInput}</b> no está registrado. Por favor complete su Nombre y Teléfono.`;
                errorBox.classList.remove('hidden');
            }
            document.getElementById('additional-user-fields')?.classList.remove('hidden');
            return;
        }

        foundClient = {
            id: Date.now(),
            id_usuario: Date.now(),
            id_cliente: Date.now(),
            email: emailInput,
            name: nameInput,
            nombre: nameInput,
            phone: phoneInput
        };
        registeredClients.push(foundClient);
        localStorage.setItem('nathaly_registered_clients', JSON.stringify(registeredClients));
    }

    currentUser = foundClient;
    localStorage.setItem('nathaly_user', JSON.stringify(currentUser));
    localStorage.setItem('usuarioLogueado', JSON.stringify(currentUser));
    localStorage.setItem('usuario', JSON.stringify(currentUser));
    localStorage.setItem('usuarioActual', JSON.stringify(currentUser));
    
    if (errorBox) errorBox.classList.add('hidden');
    updateAuthUI();
    closeAuthModal();
    alert(`✅ ¡Bienvenido(a), ${currentUser.name || currentUser.nombre}!`);
}

// -------------------------------------------------------------
// 🛒 CATÁLOGO, PESTAÑAS Y CARRITO DE COMPRAS
// -------------------------------------------------------------

function switchTab(tabName) {
    if (tabName === 'admin') {
        if (!verificarAdminCredenciales()) return;
        renderAdminProducts();
    }

    const tabCatalog = document.getElementById('tab-catalog');
    const tabOrders = document.getElementById('tab-orders');
    const tabAdmin = document.getElementById('tab-admin');

    if (tabCatalog) tabCatalog.classList.add('hidden');
    if (tabOrders) tabOrders.classList.add('hidden');
    if (tabAdmin) tabAdmin.classList.add('hidden');

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.remove('hidden');
    }

    if (tabName === 'orders') {
        cargarHistorialPedidos();
    }
}

function renderCatalog() {
    const grid = document.getElementById('product-grid');
    if (!grid) return;
    grid.innerHTML = '';

    products = JSON.parse(localStorage.getItem('productosDulceria')) || products;

    products.forEach(p => {
        const prodName = p.name || p.nombre;
        const prodPrice = p.price !== undefined ? p.price : p.precio;
        const prodImg = p.img || p.imagen;
        const prodDesc = p.desc || p.descripcion || '';
        const isOutOfStock = p.stock <= 0;

        const card = document.createElement('div');
        card.className = "bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <div class="relative h-52 overflow-hidden bg-slate-100">
                    <img src="${prodImg}" alt="${prodName}" class="w-full h-full object-cover">
                    <div class="absolute top-3 right-3">
                        <span class="px-3 py-1 ${isOutOfStock ? 'bg-rose-600' : 'bg-emerald-600'} text-white font-bold text-xs rounded-full">
                            ${isOutOfStock ? 'AGOTADO' : 'Stock: ' + p.stock}
                        </span>
                    </div>
                </div>
                <div class="p-6 space-y-2">
                    <h4 class="font-serif-title font-bold text-lg text-slate-900">${prodName}</h4>
                    <p class="text-slate-500 text-xs">${prodDesc}</p>
                </div>
            </div>
            <div class="p-6 pt-0 flex items-center justify-between border-t border-slate-50 mt-2">
                <div>
                    <span class="text-xs text-slate-400 block">Precio</span>
                    <span class="text-xl font-extrabold text-slate-900">Bs. ${Number(prodPrice).toFixed(2)}</span>
                </div>
                <button onclick="addToCart(${p.id})" ${isOutOfStock ? 'disabled' : ''} class="px-4 py-2.5 rounded-xl font-semibold text-xs text-white ${isOutOfStock ? 'bg-slate-300' : 'bg-rose-600 hover:bg-rose-700'}">
                    ${isOutOfStock ? 'Sin Stock' : 'Añadir'}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function addToCart(productId) {
    const prod = products.find(p => p.id === productId);
    if (!prod || prod.stock <= 0) return;

    const prodName = prod.name || prod.nombre;
    const prodPrice = prod.price !== undefined ? prod.price : prod.precio;

    const existing = cart.find(item => item.id === productId);
    if (existing) {
        if (existing.qty + 1 > prod.stock) return alert("Límite de stock alcanzado.");
        existing.qty++;
    } else {
        cart.push({ id: prod.id, name: prodName, nombre: prodName, price: prodPrice, precio: prodPrice, qty: 1, cantidad: 1 });
    }
    updateCartUI();
    // openCartModal(); <--- Elimina o comenta esta línea de aquí
}

function updateCartUI() {
    const badge = document.getElementById('cart-badge');
    const totalQty = cart.reduce((sum, i) => sum + (i.qty || i.cantidad || 1), 0);
    if (badge) {
        badge.textContent = totalQty;
        badge.classList.toggle('hidden', totalQty === 0);
    }

    const container = document.getElementById('cart-items-list');
    if (container) {
        container.innerHTML = cart.map(item => {
            const nombreItem = item.name || item.nombre;
            const precioItem = item.price !== undefined ? item.price : item.precio;
            const cantidadItem = item.qty || item.cantidad || 1;
            return `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <div>
                        <h5 class="text-xs font-bold text-slate-800">${nombreItem}</h5>
                        <p class="text-xs text-rose-600 font-semibold">Bs. ${(precioItem * cantidadItem).toFixed(2)}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="changeCartQty(${item.id}, -1)" class="px-2 bg-white rounded border">-</button>
                        <span class="text-xs font-bold">${cantidadItem}</span>
                        <button onclick="changeCartQty(${item.id}, 1)" class="px-2 bg-white rounded border">+</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    const total = cart.reduce((sum, i) => sum + ((i.price !== undefined ? i.price : i.precio) * (i.qty || i.cantidad || 1)), 0);
    if (document.getElementById('cart-total')) {
        document.getElementById('cart-total').textContent = `Bs. ${total.toFixed(2)}`;
    }
}

function changeCartQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    if (item.qty !== undefined) item.qty += delta;
    if (item.cantidad !== undefined) item.cantidad += delta;
    
    const cantidadActual = item.qty || item.cantidad || 1;
    if (cantidadActual <= 0) {
        cart = cart.filter(i => i.id !== id);
    }
    updateCartUI();
}

function openCartModal() { document.getElementById('cart-modal')?.classList.remove('hidden'); }
function closeCartModal() { document.getElementById('cart-modal')?.classList.add('hidden'); }

// -------------------------------------------------------------
// 🛠️ PANEL DE ADMINISTRACIÓN (CRUD DE PRODUCTOS)
// -------------------------------------------------------------

function renderAdminProducts() {
    const container = document.getElementById('admin-products-list');
    if (!container) return;

    products = JSON.parse(localStorage.getItem('productosDulceria')) || products;

    if (products.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No hay productos registrados en el catálogo.</p>`;
        return;
    }

    container.innerHTML = products.map(prod => {
        const name = prod.name || prod.nombre;
        const price = prod.price !== undefined ? prod.price : prod.precio;
        const img = prod.img || prod.imagen;
        const stock = prod.stock;

        return `
            <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div class="flex items-center space-x-3">
                    <img src="${img}" alt="${name}" class="w-12 h-12 object-cover rounded-xl border">
                    <div>
                        <h4 class="text-xs font-bold text-slate-900">${name}</h4>
                        <p class="text-[11px] text-rose-600 font-semibold">Bs. ${Number(price).toFixed(2)} <span class="text-slate-400 font-normal">| Stock: ${stock}</span></p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="editarProducto(${prod.id})" class="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-200 transition">
                        <i class="fa-solid fa-pen"></i> Modificar
                    </button>
                    <button onclick="eliminarProducto(${prod.id})" class="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold hover:bg-rose-200 transition">
                        <i class="fa-solid fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openProductModal(prodId = null) {
    if (!verificarAdminCredenciales()) return;

    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const form = document.getElementById('product-form');
    if (!modal) return;

    form.reset();
    document.getElementById('admin-prod-id').value = '';

    if (prodId) {
        title.textContent = "Modificar Producto";
        const prod = products.find(p => p.id === prodId);
        if (prod) {
            document.getElementById('admin-prod-id').value = prod.id;
            document.getElementById('admin-prod-name').value = prod.name || prod.nombre;
            document.getElementById('admin-prod-price').value = prod.price !== undefined ? prod.price : prod.precio;
            document.getElementById('admin-prod-stock').value = prod.stock;
            document.getElementById('admin-prod-desc').value = prod.desc || prod.descripcion || '';
            document.getElementById('admin-prod-img').value = prod.img || prod.imagen || '';
        }
    } else {
        title.textContent = "Añadir Nuevo Producto";
    }

    modal.classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('product-modal')?.classList.add('hidden');
}

function editarProducto(id) {
    openProductModal(id);
}

function saveProduct(event) {
    event.preventDefault();
    if (!verificarAdminCredenciales()) return;

    const idInput = document.getElementById('admin-prod-id').value;
    const name = document.getElementById('admin-prod-name').value.trim();
    const price = parseFloat(document.getElementById('admin-prod-price').value);
    const stock = parseInt(document.getElementById('admin-prod-stock').value);
    const desc = document.getElementById('admin-prod-desc').value.trim();
    const img = document.getElementById('admin-prod-img').value.trim();

    if (idInput) {
        const id = parseInt(idInput);
        products = products.map(p => {
            if (p.id === id) {
                return { ...p, id, name, price, stock, desc, img, nombre: name, precio: price, descripcion: desc, imagen: img };
            }
            return p;
        });
    } else {
        const newProd = {
            id: Date.now(),
            name,
            nombre: name,
            price,
            precio: price,
            stock,
            desc,
            descripcion: desc,
            img,
            imagen: img
        };
        products.push(newProd);
    }

    localStorage.setItem('productosDulceria', JSON.stringify(products));
    localStorage.setItem('nathaly_products', JSON.stringify(products));

    closeProductModal();
    renderAdminProducts();
    renderCatalog();
    alert("✅ Producto guardado correctamente.");
}

function eliminarProducto(id) {
    if (!verificarAdminCredenciales()) return;

    if (confirm("¿Estás seguro de eliminar este producto del catálogo?")) {
        products = products.filter(p => p.id !== id);
        localStorage.setItem('productosDulceria', JSON.stringify(products));
        localStorage.setItem('nathaly_products', JSON.stringify(products));

        renderAdminProducts();
        renderCatalog();
        alert("🗑️ Producto eliminado correctamente.");
    }
}

// -------------------------------------------------------------
// 📸 VERIFICACIÓN DE COMPROBANTE Y PAGO
// -------------------------------------------------------------

async function validarComprobanteSubido(event) {
    const file = event.target.files[0];
    const btnProcess = document.getElementById('btn-process-checkout') || document.querySelector('button[onclick*="Checkout"]') || document.getElementById('btn-proceder-pago');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-img');

    if (!file) {
        comprobanteBase64 = null;
        uploadedProofData = null;
        if (previewContainer) previewContainer.classList.add('hidden');
        if (btnProcess) {
            btnProcess.disabled = false;
            btnProcess.innerText = "Proceder al Pago";
            btnProcess.style.opacity = "1";
            btnProcess.style.cursor = "pointer";
        }
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert("Por favor, selecciona un archivo de imagen válido.");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        comprobanteBase64 = e.target.result;
        uploadedProofData = e.target.result;

        if (previewImg) {
            previewImg.src = comprobanteBase64;
        }
        if (previewContainer) previewContainer.classList.remove('hidden');

        const totalPagar = cart.reduce((sum, item) => sum + ((item.price !== undefined ? item.price : item.precio) * (item.qty || item.cantidad || 1)), 0);

        if (window.Tesseract) {
            if (btnProcess) {
                btnProcess.disabled = true;
                btnProcess.innerText = "Verificando comprobante...";
                btnProcess.style.opacity = "0.7";
                btnProcess.style.cursor = "not-allowed";
            }

            try {
                const worker = await Tesseract.createWorker('spa');
                const ret = await worker.recognize(comprobanteBase64);
                await worker.terminate();

                const textoExtraido = ret.data.text;
                const regexMonto = /(?:bs|monto|total|importe)?\s*[:\.]?\s*(\d+[\.,]\d{2})/gi;
                let coincidenciaEncontrada = false;
                let match;

                while ((match = regexMonto.exec(textoExtraido)) !== null) {
                    const montoLectura = parseFloat(match[1].replace(',', '.'));
                    if (Math.abs(montoLectura - totalPagar) < 0.01) {
                        coincidenciaEncontrada = true;
                        break;
                    }
                }

                if (!coincidenciaEncontrada) {
                    alert(`⚠️ Advertencia:\nNo se detectó el monto exacto de Bs. ${totalPagar.toFixed(2)} en el comprobante. Quedará en revisión manual.`);
                } else {
                    alert(`✅ Comprobante validado correctamente.`);
                }
            } catch (error) {
                console.error("Error OCR:", error);
            } finally {
                const btnPagar = document.getElementById('btn-process-checkout') || document.querySelector('button[onclick*="Checkout"]') || document.getElementById('btn-proceder-pago');
                if (btnPagar) {
                    btnPagar.disabled = false;
                    btnPagar.innerText = "Proceder al Pago";
                    btnPagar.style.opacity = "1";
                    btnPagar.style.cursor = "pointer";
                }
            }
        } else {
            if (btnProcess) {
                btnProcess.disabled = false;
                btnProcess.innerText = "Proceder al Pago";
                btnProcess.style.opacity = "1";
                btnProcess.style.cursor = "pointer";
            }
        }
    };
    reader.readAsDataURL(file);
}

function toggleMetodoPago(metodo) {
    const cashBox = document.getElementById('cash-calculator');
    const qrBox = document.getElementById('qr-section');
    const btnProcess = document.getElementById('btn-process-checkout');

    if (metodo === 'EFECTIVO') {
        if (cashBox) cashBox.classList.remove('hidden');
        if (qrBox) qrBox.classList.add('hidden');
        if (btnProcess) {
            btnProcess.disabled = false;
            btnProcess.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    } else if (metodo === 'QR') {
        if (cashBox) cashBox.classList.add('hidden');
        if (qrBox) qrBox.classList.remove('hidden');

        const qrRefCode = document.getElementById('qr-ref-code');
        if (qrRefCode && !qrRefCode.innerText.includes('NATHALY')) {
            qrRefCode.innerText = "NATHALY-" + Math.floor(100000 + Math.random() * 900000);
        }

        if (!comprobanteBase64 && btnProcess) {
            btnProcess.disabled = true;
            btnProcess.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
}

function calculateChange() {
    const totalText = document.getElementById('cart-total')?.textContent.replace('Bs.', '').trim() || '0';
    const total = parseFloat(totalText) || 0;
    const entregadoInput = document.getElementById('monto-entregado');
    const entregado = parseFloat(entregadoInput?.value) || 0;
    const cambio = Math.max(0, entregado - total);

    const cambioSpan = document.getElementById('cambio-devuelto');
    if (cambioSpan) {
        cambioSpan.textContent = `Bs. ${cambio.toFixed(2)}`;
    }
}

// -------------------------------------------------------------
// 💳 PROCESAR CHECKOUT Y VENTAS (Unificado y Resiliente)
// -------------------------------------------------------------

function processCheckout() {
    if (!cart || cart.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    if (!currentUser) {
        alert("Debes iniciar sesión con tu cuenta antes de pagar.");
        closeCartModal();
        openAuthModal();
        return;
    }

    const total = cart.reduce((sum, item) => sum + ((item.price !== undefined ? item.price : item.precio) * (item.qty || item.cantidad || 1)), 0);
    const selectedMethod = document.querySelector('input[name="metodo_pago"]:checked')?.value || 'EFECTIVO';

    let montoEntregado = total;
    let cambioDevuelto = 0;

    if (selectedMethod === 'EFECTIVO') {
        const inputEntregado = document.getElementById('monto-entregado');
        montoEntregado = parseFloat(inputEntregado ? inputEntregado.value : total);

        if (isNaN(montoEntregado) || montoEntregado < total) {
            alert(`El monto ingresado es menor que el total a pagar (Bs. ${total.toFixed(2)}).`);
            return;
        }
        cambioDevuelto = montoEntregado - total;
    } else {
        const comprobanteSubido = comprobanteBase64 || uploadedProofData || document.getElementById('preview-img')?.src;
        if (!comprobanteSubido) {
            alert("Por favor, sube la captura del comprobante de pago por QR antes de continuar.");
            return;
        }
    }

    const idGenerado = 'NATHALY-' + Math.floor(Math.random() * 900000 + 100000);
    const fechaHoraActual = new Date().toLocaleString();
    const comprobanteImagen = comprobanteBase64 || uploadedProofData || (document.getElementById('preview-img')?.src && document.getElementById('preview-img').src.startsWith('data:') ? document.getElementById('preview-img').src : null);

    // Creamos el objeto de pedido unificado con todas las propiedades requeridas
    const nuevoPedido = {
        id: idGenerado,
        id_venta: idGenerado,
        codigo_comprobante: idGenerado,
        email: currentUser.email || currentUser.correo || '',
        correo: currentUser.email || currentUser.correo || '',
        nombre: currentUser.name || currentUser.nombre || 'Cliente',
        cliente_nombre: currentUser.name || currentUser.nombre || 'Cliente',
        cliente_email: currentUser.email || currentUser.correo || '',
        cliente_telefono: currentUser.phone || currentUser.telefono || 'N/A',
        fecha: fechaHoraActual,
        fecha_venta: fechaHoraActual,
        created_at: fechaHoraActual,
        items: cart,
        total: total,
        monto_total: total,
        metodoPago: selectedMethod,
        metodo_pago: selectedMethod,
        estado: 'Pagado',
        montoEntregado: montoEntregado,
        monto_entregado: montoEntregado,
        cambioDevuelto: cambioDevuelto,
        cambio_devuelto: cambioDevuelto,
        direccion: 'Santa Cruz',
        comprobante: comprobanteImagen,
        comprobante_qr: comprobanteImagen
    };

    // Almacenamos en todas las claves de localStorage posibles para máxima compatibilidad
    let ordersList = JSON.parse(localStorage.getItem('nathaly_orders')) || JSON.parse(localStorage.getItem('pedidosDulceria')) || [];
    ordersList.push(nuevoPedido);
    localStorage.setItem('nathaly_orders', JSON.stringify(ordersList));
    localStorage.setItem('pedidosDulceria', JSON.stringify(ordersList));

    // Payload opcional hacia API PHP
    const payload = {
        id_cliente: currentUser.id_cliente || currentUser.id_usuario || currentUser.id || 1,
        cliente_nombre: currentUser.name || currentUser.nombre,
        cliente_email: currentUser.email || currentUser.correo,
        cliente_telefono: currentUser.phone || 'N/A',
        metodo_pago: selectedMethod,
        monto_total: total,
        monto_entregado: montoEntregado,
        cambio_devuelto: cambioDevuelto,
        comprobante_qr: comprobanteImagen,
        items: cart.map(i => ({
            id_producto: i.id,
            cantidad: i.qty || i.cantidad || 1,
            precio: i.price !== undefined ? i.price : i.precio
        }))
    };

    fetch('api/ventas.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(async res => {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            return { status: 'success', codigo: idGenerado };
        }
    })
    .then(data => {
        alert(`¡Pedido procesado con éxito!\nCódigo de Comprobante: ${data.codigo || idGenerado}`);

        cart = [];
        comprobanteBase64 = null;
        uploadedProofData = null;
        
        const fileInput = document.getElementById('input-comprobante');
        if (fileInput) fileInput.value = '';
        document.getElementById('preview-container')?.classList.add('hidden');

        updateCartUI();
        closeCartModal();
        cargarHistorialPedidos();
        switchTab('orders');
    })
    .catch(err => {
        console.error("Error en red:", err);
        alert(`¡Pedido registrado localmente con éxito!\nCódigo: ${idGenerado}`);
        
        cart = [];
        updateCartUI();
        closeCartModal();
        cargarHistorialPedidos();
        switchTab('orders');
    });
}

// -------------------------------------------------------------
// 📄 HISTORIAL DE PEDIDOS Y DESCARGA DE PDF
// -------------------------------------------------------------

function descargarComprobantePDF(idPedido) {
    const ordersData = JSON.parse(localStorage.getItem('nathaly_orders')) || JSON.parse(localStorage.getItem('pedidosDulceria')) || [];
    const pedido = ordersData.find(o => String(o.id || o.id_venta || o.codigo_comprobante) === String(idPedido));

    if (!pedido) {
        alert("No se encontró el comprobante de este pedido.");
        return;
    }

    const codigo = pedido.id || pedido.id_venta || pedido.codigo_comprobante || 'N/A';
    const monto = pedido.total !== undefined ? pedido.total : (pedido.monto_total || 0);
    const metodo = pedido.metodoPago || pedido.metodo_pago || 'EFECTIVO';
    const fecha = pedido.fecha || pedido.fecha_venta || pedido.created_at || 'Fecha reciente';
    const entregado = pedido.montoEntregado !== undefined ? pedido.montoEntregado : (pedido.monto_entregado || monto);
    const cambio = pedido.cambioDevuelto !== undefined ? pedido.cambioDevuelto : (pedido.cambio_devuelto || 0);
    
    const clienteNombre = pedido.cliente_nombre || pedido.nombre || (currentUser ? (currentUser.name || currentUser.nombre || currentUser.email) : 'Cliente');
    const clienteEmail = pedido.email || pedido.correo || pedido.cliente_email || (currentUser ? currentUser.email : 'N/A');
    const clienteTelefono = pedido.telefono || pedido.cliente_telefono || (currentUser ? currentUser.phone : 'N/A');

    if (typeof downloadPDF === 'function') {
        downloadPDF(codigo, Number(monto).toFixed(2), metodo, fecha, Number(entregado).toFixed(2), Number(cambio).toFixed(2), clienteNombre, clienteEmail, clienteTelefono);
    } else {
        // Generador de respaldo nativo en caso de que la función global de PDF esté ausente
        const ventanaImpresion = window.open('', '_blank');
        if (!ventanaImpresion) {
            alert("Por favor, permite las ventanas emergentes para descargar tu PDF.");
            return;
        }
        ventanaImpresion.document.write(`
            <html>
            <head>
                <title>Comprobante #${codigo}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    .header { text-align: center; border-bottom: 2px solid #e11d48; padding-bottom: 10px; margin-bottom: 20px; }
                    .header h2 { color: #e11d48; margin: 0; }
                    .details { margin-bottom: 20px; font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
                    th { background-color: #f3f4f6; }
                    .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 15px; color: #e11d48; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Dulcería Nathaly</h2>
                    <p>Comprobante de Venta</p>
                </div>
                <div class="details">
                    <p><strong>Pedido ID:</strong> ${codigo}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                    <p><strong>Cliente:</strong> ${clienteNombre} (${clienteEmail})</p>
                    <p><strong>Método de Pago:</strong> ${metodo}</p>
                    ${metodo.toUpperCase() === 'EFECTIVO' ? `<p><strong>Monto Entregado:</strong> Bs. ${Number(entregado).toFixed(2)} | <strong>Cambio:</strong> Bs. ${Number(cambio).toFixed(2)}</p>` : ''}
                </div>
                <h3>Productos Adquiridos:</h3>
                <table>
                    <thead>
                        <tr><th>Producto</th><th>Cant.</th><th>Subtotal</th></tr>
                    </thead>
                    <tbody>
                        ${(pedido.items || []).map(i => `
                            <tr>
                                <td>${i.name || i.nombre || 'Producto'}</td>
                                <td>${i.qty || i.cantidad || 1}</td>
                                <td>Bs. ${(((i.price !== undefined ? i.price : i.precio) || 0) * (i.qty || i.cantidad || 1)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="total">Total Pagado: Bs. ${Number(monto).toFixed(2)}</div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        ventanaImpresion.document.close();
    }
}

function cargarHistorialPedidos() {
    const contenedorOrders = document.getElementById('orders-list') || document.getElementById('orders-list-container');
    if (!contenedorOrders) return;

    // Sincronización de usuario activo con todas las posibles variables
    const usuarioActual = currentUser || JSON.parse(localStorage.getItem('nathaly_user')) || JSON.parse(localStorage.getItem('usuarioActual')) || JSON.parse(localStorage.getItem('usuarioLogueado')) || null;
    
    if (!usuarioActual) {
        contenedorOrders.innerHTML = `
            <div class="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-2">
                <i class="fa-solid fa-box-open text-4xl text-slate-300 mb-3"></i>
                <p class="text-xs font-semibold text-slate-500">Inicia sesión para ver tu historial de pedidos.</p>
            </div>
        `;
        return;
    }

    const emailUsuarioActual = (usuarioActual.email || usuarioActual.correo || '').toLowerCase().trim();
    
    const esAdmin = ADMINS_AUTORIZADOS.some(a => a.email.toLowerCase() === emailUsuarioActual) || (emailUsuarioActual === "admin@dulceria.com");

    const todosLosPedidos = JSON.parse(localStorage.getItem('nathaly_orders')) || JSON.parse(localStorage.getItem('pedidosDulceria')) || [];
    
    const pedidosAMostrar = esAdmin 
        ? todosLosPedidos 
        : todosLosPedidos.filter(p => {
            const correoPedido = (p.email || p.correo || p.cliente_email || '').toLowerCase().trim();
            return correoPedido === emailUsuarioActual;
        });

    if (pedidosAMostrar.length === 0) {
        contenedorOrders.innerHTML = `
            <div class="text-center py-10 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <i class="fa-solid fa-box-open text-4xl text-slate-300 mb-3"></i>
                <p class="text-xs font-semibold text-slate-500">No tienes compras registradas aún.</p>
            </div>
        `;
        return;
    }

    contenedorOrders.innerHTML = pedidosAMostrar.map(pedido => {
        const codigoPedido = pedido.id || pedido.id_venta || pedido.codigo_comprobante || 'N/A';
        const esPagado = (pedido.estado || 'PAGADO').toUpperCase() === 'PAGADO';
        const badgeClass = esPagado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
        const estadoTexto = pedido.estado || 'Pagado';
        const metodoPago = pedido.metodoPago || pedido.metodo_pago || 'EFECTIVO';
        const totalPedido = pedido.total !== undefined ? pedido.total : (pedido.monto_total || 0);
        const fechaPedido = pedido.fecha || pedido.fecha_venta || pedido.created_at || 'Fecha reciente';
        const comprobanteQR = pedido.comprobante || pedido.comprobante_qr || null;

        let detallesEfectivoHtml = '';
        if (metodoPago.toUpperCase() === 'EFECTIVO' && (pedido.montoEntregado || pedido.monto_entregado)) {
            const entregadoVal = pedido.montoEntregado !== undefined ? pedido.montoEntregado : pedido.monto_entregado;
            const cambioVal = pedido.cambioDevuelto !== undefined ? pedido.cambioDevuelto : pedido.cambio_devuelto;
            detallesEfectivoHtml = `
                <div class="text-xs text-slate-600 space-y-0.5 border-t border-slate-100 pt-2 mt-2">
                    <p><strong>Monto Entregado:</strong> Bs. ${(entregadoVal || 0).toFixed(2)}</p>
                    <p><strong>Cambio Devuelto:</strong> Bs. ${(cambioVal || 0).toFixed(2)}</p>
                </div>
            `;
        }

        return `
            <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                        <span class="text-xs font-bold text-rose-600 uppercase tracking-wider">Pedido #${codigoPedido}</span>
                        <p class="text-[11px] text-slate-400">Fecha: ${fechaPedido}</p>
                        ${esAdmin ? `<p class="text-[11px] font-semibold text-slate-700">Cliente: ${pedido.nombre || pedido.cliente_nombre || pedido.email || pedido.correo}</p>` : ''}
                    </div>
                    <span class="px-3 py-1 ${badgeClass} rounded-full text-xs font-bold">
                        ${estadoTexto}
                    </span>
                </div>

                <div class="text-xs space-y-1">
                    <p class="text-slate-500"><b>Método de Pago:</b> ${metodoPago}</p>
                    ${detallesEfectivoHtml}
                </div>

                <div class="bg-slate-50 rounded-2xl p-3 space-y-1">
                    <p class="text-[11px] font-bold text-slate-700">Productos:</p>
                    <ul class="list-disc list-inside text-xs text-slate-600 space-y-1">
                        ${(pedido.items || []).map(item => `
                            <li class="flex justify-between">
                                <span>${item.qty || item.cantidad || 1}x ${item.name || item.nombre || 'Producto'}</span>
                                <span>Bs. ${(((item.price !== undefined ? item.price : item.precio) || 0) * (item.qty || item.cantidad || 1)).toFixed(2)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                        <span class="text-xs font-bold text-slate-700">Total: </span>
                        <span class="text-base font-extrabold text-rose-600">Bs. ${Number(totalPedido).toFixed(2)}</span>
                    </div>

                    <div class="flex items-center gap-2">
                        ${comprobanteQR ? `
                            <button onclick="window.open('${comprobanteQR}')" class="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs rounded-xl transition flex items-center gap-1.5">
                                <i class="fa-solid fa-receipt"></i> Ver QR
                            </button>
                        ` : ''}

                        <button onclick="descargarComprobantePDF('${codigoPedido}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                            <i class="fa-solid fa-file-pdf"></i> Descargar PDF
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function loadUserOrders() { cargarHistorialPedidos(); }
function mostrarComprasEnPantalla(listaVentas) { cargarHistorialPedidos(); }

// -------------------------------------------------------------
// 🔀 GESTIÓN DE PESTAÑAS GLOBAL
// -------------------------------------------------------------

const originalSwitchTab = window.switchTab || function(){};
window.switchTab = function(tabName) {
    if (tabName === 'admin') {
        if (!verificarAdminCredenciales()) return;
        renderAdminProducts();
    }

    const tabCatalog = document.getElementById('tab-catalog');
    const tabOrders = document.getElementById('tab-orders');
    const tabAdmin = document.getElementById('tab-admin');

    if (tabCatalog) tabCatalog.classList.add('hidden');
    if (tabOrders) tabOrders.classList.add('hidden');
    if (tabAdmin) tabAdmin.classList.add('hidden');

    if (tabName === 'catalog' && tabCatalog) {
        tabCatalog.classList.remove('hidden');
    } else if (tabName === 'orders' && tabOrders) {
        tabOrders.classList.remove('hidden');
        cargarHistorialPedidos();
    } else if (tabName === 'admin' && tabAdmin) {
        tabAdmin.classList.remove('hidden');
        renderAdminProducts();
    }
};
