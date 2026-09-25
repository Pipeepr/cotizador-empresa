/**
 * CotizaPro – Application Logic
 * ─────────────────────────────────────────────
 * Handles navigation, data loading, rendering,
 * client management, and quotation workflow.
 */

// En la nube, frontend y backend corren en el mismo dominio.
// En local, usamos localhost:3000.
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : window.location.origin;

// ═══════════ SVG ICON LIBRARY ═══════════
// Using inline SVGs (Lucide-style) for cross-platform consistency
const Icons = {
    zap:         '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    filePlus:    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>',
    users:       '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    user:        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    package:     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
    receipt:     '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>',
    clipboardList: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
    save:        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
    plus:        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    x:           '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    menu:        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
    checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
    alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
    info:        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    search:      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    building:    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>',
    mail:        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    trash2:      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    hash:        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>',
};

// ═══════════ STATE ═══════════
let productos = [];
let clientes = [];
let lineas = [];
let isLoadingClientes = false;
let isLoadingProductos = false;
let searchClienteQuery = '';

// ═══════════ UTILITY: Escape HTML (XSS Prevention) ═══════════
function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// ═══════════ UTILITY: Format Currency ═══════════
function formatCLP(amount) {
    return '$' + Math.round(Number(amount) || 0).toLocaleString('es-CL');
}

// ═══════════ NAVIGATION ═══════════
function switchSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
        item.setAttribute('aria-selected', item.dataset.section === sectionId);
    });
    document.querySelectorAll('.section').forEach(sec => {
        const isActive = sec.id === `section-${sectionId}`;
        sec.classList.toggle('active', isActive);
        sec.setAttribute('aria-hidden', !isActive);
    });
    // Close mobile sidebar
    closeSidebar();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.toggle('open');
    document.getElementById('mobile-toggle').setAttribute('aria-expanded', isOpen);
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobile-toggle').setAttribute('aria-expanded', 'false');
}

// ═══════════ TOAST NOTIFICATIONS ═══════════
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    const iconMap = {
        success: Icons.checkCircle,
        error:   Icons.alertCircle,
        info:    Icons.info,
    };

    toast.innerHTML = `<span>${iconMap[type] || iconMap.info}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ═══════════ SKELETON LOADING ═══════════
function renderSkeletonRows(count, cols) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<tr><td colspan="${cols}"><div class="skeleton-row">`;
        for (let j = 0; j < cols; j++) {
            html += '<div class="skeleton"></div>';
        }
        html += '</div></td></tr>';
    }
    return html;
}

// ═══════════ DATA LOADING ═══════════
document.addEventListener('DOMContentLoaded', async () => {
    // Set current date automatically
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    document.getElementById('doc-fecha').textContent = `${dd}/${mm}/${yyyy}`;

    await Promise.all([cargarClientes(), cargarProductos()]);
});

async function cargarClientes() {
    isLoadingClientes = true;
    const tbody = document.getElementById('tabla-clientes');
    if (tbody) tbody.innerHTML = renderSkeletonRows(4, 5);

    try {
        const res = await fetch(`${API}/clientes`);
        if (res.status === 401) window.location.href = '/login';
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        clientes = await res.json();
        renderSelectClientes();
        renderTablaClientes();
        renderStatsClientes();
    } catch (e) {
        showToast('Error al conectar con el servidor. ¿Está corriendo el backend?', 'error');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6">
                <div class="empty-state">
                    <div class="empty-icon">${Icons.alertCircle}</div>
                    <p>Error al cargar clientes. Verifica la conexión.</p>
                </div>
            </td></tr>`;
        }
    } finally {
        isLoadingClientes = false;
    }
}

async function cargarProductos() {
    isLoadingProductos = true;
    try {
        const res = await fetch(`${API}/productos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        productos = await res.json();
        renderSelectProductos();
    } catch (e) {
        showToast('Error al cargar productos', 'error');
    } finally {
        isLoadingProductos = false;
    }
}

// ═══════════ RENDER: SELECTS ═══════════
function renderSelectClientes() {
    const select = document.getElementById('select-cliente');
    if (!select) return;
    let options = '<option value="" disabled selected>Seleccione un cliente...</option>';
    clientes.forEach(c => {
        options += `<option value="${c.id}">${escapeHtml(c.nombre)} — ${escapeHtml(c.empresa || 'Sin empresa')}</option>`;
    });
    select.innerHTML = options;
}

function renderSelectProductos() {
    const selectProducto = document.getElementById('select-producto');
    if (!selectProducto) return;
    let options = '<option value="" disabled selected>+ Añadir desde base de datos</option>';
    productos.forEach(p => {
        options += `<option value="${p.codigo_sku}">${escapeHtml(p.nombre)} - ${formatCLP(p.precio_base)}</option>`;
    });
    selectProducto.innerHTML = options;
}

// ═══════════ RENDER: TABLE CLIENTES ═══════════
function renderTablaClientes() {
    const tbody = document.getElementById('tabla-clientes');
    if (!tbody) return;

    const filtered = searchClienteQuery
        ? clientes.filter(c => {
            const q = searchClienteQuery.toLowerCase();
            return (c.nombre && c.nombre.toLowerCase().includes(q))
                || (c.rut && c.rut.toLowerCase().includes(q))
                || (c.email && c.email.toLowerCase().includes(q))
                || (c.empresa && c.empresa.toLowerCase().includes(q));
        })
        : clientes;

    if (filtered.length === 0) {
        const msg = searchClienteQuery
            ? `No se encontraron clientes para "${escapeHtml(searchClienteQuery)}"`
            : 'No hay clientes registrados';
        tbody.innerHTML = `<tr><td colspan="6">
            <div class="empty-state">
                <div class="empty-icon">${Icons.users}</div>
                <p>${msg}</p>
            </div>
        </td></tr>`;
        document.getElementById('badge-clientes').textContent = '0';
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr>
            <td><span class="badge badge-info">#${escapeHtml(c.id)}</span></td>
            <td><strong>${escapeHtml(c.nombre)}</strong></td>
            <td>${escapeHtml(c.rut)}</td>
            <td>${c.email ? escapeHtml(c.email) : '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>${c.empresa ? escapeHtml(c.empresa) : '<span style="color:var(--text-muted)">—</span>'}</td>
            <td>
                <button type="button" style="background-color: var(--danger); color: white; border: none; padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer;" onclick="eliminarCliente(${c.id}, '${escapeHtml(c.nombre)}')">
                    Borrar
                </button>
            </td>
        </tr>
    `).join('');

    document.getElementById('badge-clientes').textContent = filtered.length;
}

// ═══════════ SEARCH CLIENTES ═══════════
function onSearchClientes(e) {
    searchClienteQuery = e.target.value;
    renderTablaClientes();
}

// ═══════════ RENDER: STATS CLIENTES ═══════════
function renderStatsClientes() {
    const totalEl = document.getElementById('stat-total-clientes');
    const empEl = document.getElementById('stat-empresas');
    const emailEl = document.getElementById('stat-con-email');
    if (!totalEl) return;

    totalEl.textContent = clientes.length;
    const empresas = new Set(clientes.map(c => c.empresa).filter(Boolean));
    empEl.textContent = empresas.size;
    emailEl.textContent = clientes.filter(c => c.email).length;
}

// ═══════════ MODAL: CLIENTE ═══════════
const modalCliente = {
    el: () => document.getElementById('modal-cliente'),

    open() {
        const overlay = this.el();
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        // Focus trap
        const firstInput = overlay.querySelector('input, select, textarea');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
        document.body.style.overflow = 'hidden';
    },

    close() {
        const overlay = this.el();
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.getElementById('form-cliente').reset();
        document.body.style.overflow = '';
    }
};

// ═══════════ MODAL: CONFIRM (Delete) ═══════════
const modalConfirm = {
    el: () => document.getElementById('modal-confirm'),
    _resolve: null,

    show(message) {
        return new Promise(resolve => {
            this._resolve = resolve;
            const overlay = this.el();
            overlay.querySelector('.confirm-message').textContent = message;
            overlay.classList.add('open');
            overlay.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            overlay.querySelector('.btn-danger').focus();
        });
    },

    confirm() {
        if (this._resolve) this._resolve(true);
        this._close();
    },

    cancel() {
        if (this._resolve) this._resolve(false);
        this._close();
    },

    _close() {
        const overlay = this.el();
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        this._resolve = null;
    }
};

// ═══════════ MODAL: PRODUCTO ═══════════
const modalProducto = {
    el: () => document.getElementById('modal-producto'),

    open() {
        const overlay = this.el();
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        // Focus trap
        const firstInput = overlay.querySelector('input, select, textarea');
        if (firstInput) setTimeout(() => firstInput.focus(), 100);
        document.body.style.overflow = 'hidden';
    },

    close() {
        const overlay = this.el();
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.getElementById('form-producto').reset();
        document.body.style.overflow = '';
    }
};

// ═══════════ GUARDAR CLIENTE ═══════════
async function guardarCliente(event) {
    event.preventDefault();

    const nombre = document.getElementById('cl-nombre').value.trim();
    const rut = document.getElementById('cl-rut').value.trim();
    const email = document.getElementById('cl-email').value.trim();
    const empresa = document.getElementById('cl-empresa').value.trim();
    const contacto = document.getElementById('cl-contacto').value.trim();
    const direccion = document.getElementById('cl-direccion').value.trim();

    if (!nombre || !rut) {
        showToast('Nombre y RUT son obligatorios', 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Guardando...`;

    try {
        const res = await fetch(`${API}/clientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, rut, email, empresa, contacto, direccion }),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text);
        }

        const nuevoCliente = await res.json();
        clientes.push(nuevoCliente);
        renderSelectClientes();
        renderTablaClientes();
        renderStatsClientes();
        modalCliente.close();
        showToast(`Cliente "${escapeHtml(nombre)}" creado exitosamente`, 'success');
    } catch (err) {
        showToast('Error al guardar el cliente. ¿RUT duplicado?', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ═══════════ GUARDAR PRODUCTO ═══════════
async function guardarProducto(event) {
    event.preventDefault();

    const codigo_sku = document.getElementById('prod-codigo').value.trim();
    const nombre = document.getElementById('prod-nombre').value.trim();
    const precio_base = document.getElementById('prod-precio').value;
    const stock = document.getElementById('prod-stock').value || 0;

    if (!codigo_sku || !nombre || !precio_base) {
        showToast('Código, Nombre y Precio son obligatorios', 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Guardando...`;

    try {
        const res = await fetch(`${API}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo_sku, nombre, precio_base, stock }),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(text);
        }

        const nuevoProducto = await res.json();
        productos.push(nuevoProducto);
        renderSelectProductos();
        modalProducto.close();
        showToast(`Producto "${escapeHtml(nombre)}" creado exitosamente`, 'success');
    } catch (err) {
        showToast('Error al guardar el producto. ¿Código duplicado?', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ═══════════ COTIZACIÓN: WYSIWYG EDITOR ═══════════
function actualizarClienteDocs() {
    const clienteId = document.getElementById('select-cliente').value;
    const cliente = clientes.find(c => c.id == clienteId);
    if (!cliente) return;
    
    document.getElementById('doc-client-name').textContent = cliente.empresa || cliente.nombre;
    document.getElementById('doc-client-contacto').textContent = "Atención a: " + (cliente.contacto || (cliente.empresa ? cliente.nombre : ""));
    document.getElementById('doc-client-email').textContent = "Email: " + (cliente.email || 'N/A');
    document.getElementById('doc-client-rut').textContent = "RUT: " + (cliente.rut || 'N/A');
    document.getElementById('doc-client-direccion').textContent = "Dirección: " + (cliente.direccion || 'No especificada');
}

function agregarLineaWysiwyg(sku = null) {
    const tbody = document.getElementById('tabla-cotizacion');
    
    // Quitar estado vacío
    if (tbody.querySelector('.empty-state')) {
        tbody.innerHTML = '';
    }
    
    let nombre = "Nuevo producto";
    let precio = 0;
    
    if (sku) {
        const prod = productos.find(p => p.codigo_sku === sku);
        if (prod) {
            nombre = prod.nombre;
            precio = Number(prod.precio_base) || 0;
        }
        // Reset the select
        document.getElementById('select-producto').value = "";
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align: left;">
            <div style="display:flex; align-items:center; gap: 8px;">
                <button class="btn-remove print-hide" onclick="this.closest('tr').remove(); recalcularTotalesWysiwyg();" title="Eliminar" style="padding: 2px;">
                    ${Icons.x}
                </button>
                <input type="text" class="wysiwyg-input sku-input" placeholder="CÓDIGO" value="${escapeHtml(sku || '')}" style="width: 80px;">
            </div>
        </td>
        <td style="text-align: left;">
            <input type="text" class="wysiwyg-input desc-input" placeholder="Descripción del producto..." value="${escapeHtml(nombre)}">
        </td>
        <td style="text-align: center;">
            <input type="number" class="wysiwyg-input qty-input" value="1" min="1" onchange="recalcularTotalesWysiwyg()" onkeyup="recalcularTotalesWysiwyg()" style="text-align: center;">
        </td>
        <td style="text-align: right;">
            <input type="number" class="wysiwyg-input price-input" value="${precio}" min="0" onchange="recalcularTotalesWysiwyg()" onkeyup="recalcularTotalesWysiwyg()" style="text-align: right;">
        </td>
        <td style="text-align: right; font-weight: bold;" class="row-total">
            ${formatCLP(precio)}
        </td>
    `;
    tbody.appendChild(tr);
    recalcularTotalesWysiwyg();
}

function recalcularTotalesWysiwyg() {
    const tbody = document.getElementById('tabla-cotizacion');
    const rows = tbody.querySelectorAll('tr');
    let neto = 0;
    
    rows.forEach(tr => {
        const qtyInput = tr.querySelector('.qty-input');
        const priceInput = tr.querySelector('.price-input');
        if (!qtyInput || !priceInput) return;
        
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const subtotal = qty * price;
        neto += subtotal;
        
        tr.querySelector('.row-total').textContent = formatCLP(subtotal);
    });
    
    const iva = neto * 0.19;
    const total = neto + iva;
    
    document.getElementById('total-neto').textContent = formatCLP(neto);
    document.getElementById('total-iva').textContent = formatCLP(iva);
    document.getElementById('total-final').textContent = formatCLP(total);
}

// ═══════════ COTIZACIÓN: GUARDAR Y PDF EN BD ═══════════
async function guardarCotizacion() {
    const clienteId = document.getElementById('select-cliente').value;

    if (!clienteId) {
        showToast('Selecciona un cliente de la lista en el documento', 'error');
        return;
    }
    
    const tbody = document.getElementById('tabla-cotizacion');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0 || tbody.querySelector('.empty-state')) {
        showToast('Agrega al menos un producto a la tabla', 'error');
        return;
    }

    const payloadLineas = [];
    let neto = 0;
    
    rows.forEach((tr, index) => {
        const skuInput = tr.querySelector('.sku-input');
        const descInput = tr.querySelector('.desc-input');
        const qtyInput = tr.querySelector('.qty-input');
        const priceInput = tr.querySelector('.price-input');
        
        if (!descInput) return;
        
        const nombre = descInput.value || `Item ${index + 1}`;
        const sku_val = skuInput ? skuInput.value.trim() : '';
        const cantidad = parseFloat(qtyInput.value) || 1;
        const precio_venta = parseFloat(priceInput.value) || 0;
        
        payloadLineas.push({
            producto_sku: sku_val || null,
            nombre,
            cantidad,
            precio_venta
        });
        neto += cantidad * precio_venta;
    });

    const iva = neto * 0.19;
    const total = neto + iva;

    const payload = {
        cliente_id: parseInt(clienteId, 10),
        subtotal: neto,
        iva,
        total,
        detalles: payloadLineas,
    };

    const btn = document.getElementById('btn-guardar-cotizacion');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Guardando...`;

    try {
        const res = await fetch(`${API}/cotizaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error('Error al guardar');

        const data = await res.json();
        
        // Actualiza el numero de COT visualmente
        document.getElementById('doc-id').textContent = `COT-${String(data.id).padStart(4, '0')}`;
        
        showToast(`Cotización #${data.id} guardada. Generando PDF...`, 'success');

        // Disparar PDF
        setTimeout(() => {
            const ot = document.title;
            const docId = document.getElementById('doc-id').textContent;
            document.title = `N°COTIZACION ${docId}`;
            window.print();
            setTimeout(() => document.title = ot, 1000);
        }, 500);

    } catch (err) {
        showToast('Error al guardar la cotización', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ═══════════ EVENT LISTENERS ═══════════

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('mobile-toggle');
    if (window.innerWidth <= 900 && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        closeSidebar();
    }
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        modalCliente.close();
        modalProducto.close();
        modalConfirm.cancel();
    }
});

// Close modals when clicking overlay
document.addEventListener('click', (e) => {
    if (e.target.id === 'modal-cliente') modalCliente.close();
    if (e.target.id === 'modal-producto') modalProducto.close();
    if (e.target.id === 'modal-confirm') modalConfirm.cancel();
});

// ═══════════ ELIMINAR CLIENTE ═══════════
async function eliminarCliente(id, nombre) {
    const confirm = await modalConfirm.show(`¿Estás seguro de que deseas eliminar a ${nombre}? Esta acción no se puede deshacer.`);
    if (!confirm) return;

    try {
        const res = await fetch(`${API}/clientes/${id}`, { method: 'DELETE' });
        if (res.status === 401) {
            window.location.href = '/login';
            return;
        }
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Error al eliminar');
        }
        
        showToast('Cliente eliminado correctamente', 'success');
        await cargarClientes();
    } catch (err) {
        showToast(err.message, 'error');
    }
}
