// ==================== GESTIÓN DE HISTORIAL ====================

let historyTypeFilter = 'all';

function openHistory() {
    historyTypeFilter = 'all';
    openSales();
    switchMovimientosTab('historial');
    setActiveMenuButton('salesBtn');
}

function setHistoryTypeFilter(type) {
    historyTypeFilter = type;
    // Actualizar botones activos
    document.querySelectorAll('.history-type-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById('historyTypeBtn_' + type);
    if (activeBtn) activeBtn.classList.add('active');
    renderHistory();
}

function renderHistory() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';

    // Obtener todos los registros relevantes (cotizaciones y notas de entrega)
    // Las notas de venta están en la sección Movimientos
    let entries = appData.pdfHistory.filter(entry => {
        if (historyTypeFilter === 'cotizacion') return entry.type === 'cotizacion';
        if (historyTypeFilter === 'notaentrega') return entry.type === 'notaentrega';
        // 'all': cotizaciones y notas de entrega
        return entry.type === 'cotizacion' || entry.type === 'notaentrega';
    });

    // Filtrar por vendedor si es rol vendedor
    if (appData.userRole === 'vendedor' && appData.loggedSeller) {
        entries = entries.filter(entry =>
            entry.seller && entry.seller.name === appData.loggedSeller.name
        );
    }

    // Filtro de búsqueda
    const searchInput = document.getElementById('historySearch');
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (searchTerm) {
        entries = entries.filter(entry => {
            const clientName = (entry.client && (entry.client.name || entry.client) || '').toLowerCase();
            const sellerName = (entry.seller && (entry.seller.name || entry.seller) || '').toLowerCase();
            const number = String(entry.number || '').toLowerCase();
            return clientName.includes(searchTerm) || sellerName.includes(searchTerm) || number.includes(searchTerm);
        });
    }

    if (entries.length === 0) {
        const label = historyTypeFilter === 'cotizacion' ? 'cotizaciones' :
                      historyTypeFilter === 'notaentrega' ? 'notas de entrega' :
                      'registros';
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #7f8c8d;">No hay ${label} en el historial</td></tr>`;
        return;
    }

    // Ordenar por fecha más reciente primero
    entries.sort((a, b) => b.id - a.id);

    entries.forEach((entry, index) => {
        const tr = document.createElement('tr');
        const typeName = entry.type === 'cotizacion' ? '📋 Cotización' :
                         entry.type === 'notaentrega' ? '📦 Nota de Entrega' : '🧾 Nota de Venta';
        const totalText = entry.type === 'notaentrega' ? '—' : `Bs ${(entry.total || 0).toFixed(2)}`;

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${typeName}</td>
            <td>${entry.number}</td>
            <td>${entry.client.name || entry.client}</td>
            <td>${entry.seller.name || entry.seller}</td>
            <td>${totalText}</td>
            <td>${entry.date}</td>
            <td style="white-space: nowrap;">
                <button class="btn-action-icon btn-action-primary" onclick="redownloadPDF(${entry.id})" title="Descargar PDF">📄</button>
                <button class="btn-action-icon btn-action-danger" onclick="deleteHistoryEntry(${entry.id})" title="Eliminar">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteHistoryEntry(entryId) {
    if (confirm('¿Está seguro de eliminar este registro del historial?')) {
        appData.pdfHistory = appData.pdfHistory.filter(entry => entry.id !== entryId);
        await saveData();
        renderHistory();
    }
}

function redownloadPDF(entryId) {
    const entry = appData.pdfHistory.find(e => e.id === entryId);
    if (!entry) {
        alert('No se encontró el registro en el historial');
        return;
    }

    // Guardar estado actual
    const savedDocType        = appData.documentType;
    const savedClient         = appData.currentClient;
    const savedSeller         = appData.currentSeller;
    const savedItems          = appData.currentQuoteItems;
    const savedCompany        = appData.company;
    const savedTerms          = appData.terms;
    const savedCity           = appData.selectedSaleCity;
    const savedQuoteNum       = appData.currentQuoteNumber;
    const savedDeliveryNum    = appData.currentDeliveryNumber;
    const savedSaleNum        = appData.currentSaleNumber;
    const savedSaleNumbers    = appData.currentSaleNumbers ? { ...appData.currentSaleNumbers } : {};
    const dateInput = document.getElementById('pdfDate');
    const savedDate = dateInput ? dateInput.value : '';
    const pmEl = document.getElementById('salePaymentMethod');
    const savedPm = pmEl ? pmEl.value : '';

    try {
        appData.documentType      = entry.type;
        appData.currentClient     = typeof entry.client === 'object' ? entry.client : { name: entry.client };
        appData.currentSeller     = typeof entry.seller === 'object' ? entry.seller : { name: entry.seller };
        appData.currentQuoteItems = Array.isArray(entry.items) ? entry.items : [];
        appData.company           = { ...appData.company, ...(entry.company || {}) };
        appData.terms             = { ...appData.terms, [entry.type]: entry.terms || [] };
        appData.selectedSaleCity  = entry.city;

        if (entry.type === 'cotizacion') {
            appData.currentQuoteNumber = entry.number;
        } else if (entry.type === 'notaentrega') {
            appData.currentDeliveryNumber = entry.number;
        } else if (entry.type === 'notaventa') {
            setEffectiveSaleNumber(entry.city, entry.number);
        }

        if (dateInput && entry.date) {
            const datePart = entry.date.split(',')[0].trim();
            const [d, m, y] = datePart.split('/');
            if (d && m && y) {
                dateInput.value = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }
        if (pmEl) pmEl.value = entry.paymentMethod || '';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth  = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        let yPos = margin;

        const headerHeight = addPDFHeader(doc, margin, yPos, pageWidth);
        yPos += headerHeight;
        addPDFDocumentInfo(doc, margin, pageWidth);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        yPos = addPDFClientInfo(doc, margin, yPos, pageWidth);
        yPos = addPDFSellerInfo(doc, margin, yPos);

        if (entry.type === 'notaentrega') {
            yPos = addPDFProductsTableDelivery(doc, margin, yPos, pageWidth, pageHeight);
        } else {
            yPos = addPDFProductsTable(doc, margin, yPos, pageWidth, pageHeight);
        }

        const pagesAfterTable = doc.internal.getNumberOfPages();
        if (appData.currentQuoteItems.length >= 7 && pagesAfterTable === 1) {
            doc.addPage();
            yPos = margin;
            const newHeaderHeight = addPDFHeader(doc, margin, yPos, pageWidth);
            yPos += newHeaderHeight;
            addPDFDocumentInfo(doc, margin, pageWidth);
            doc.setLineWidth(0.5);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 8;
        }

        if (entry.type !== 'notaentrega') {
            yPos = addPDFTotals(doc, margin, yPos, pageWidth);
        }

        yPos = addPDFTerms(doc, margin, yPos, pageWidth, pageHeight);

        if (entry.type === 'notaentrega') {
            addPDFSignatures(doc, margin, yPos, pageWidth, pageHeight);
        }

        addPDFPageNumbers(doc, pageWidth, pageHeight);

        if (entry.type === 'notaventa' && (entry.cancelled === true || entry.invoiced === true)) {
            const wmText   = entry.cancelled === true ? 'ANULADO' : 'FACTURADO';
            const wmColorR = entry.cancelled === true ? 220 : 30;
            const wmColorG = entry.cancelled === true ? 30  : 160;
            const wmColorB = 30;
            const totalPages = doc.internal.getNumberOfPages();
            const { GState: JsPDFGState } = window.jspdf;
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.saveGraphicsState();
                try {
                    const gState = new JsPDFGState({ opacity: 0.3 });
                    doc.setGState(gState);
                } catch (e) {}
                doc.setTextColor(wmColorR, wmColorG, wmColorB);
                doc.setFontSize(70);
                doc.setFont(undefined, 'bold');
                doc.text(wmText, pageWidth / 2 + 20, pageHeight / 2, { align: 'center', angle: 45 });
                doc.restoreGraphicsState();
                doc.setTextColor(0, 0, 0);
            }
        }

        doc.save(entry.fileName);

    } finally {
        appData.documentType          = savedDocType;
        appData.currentClient         = savedClient;
        appData.currentSeller         = savedSeller;
        appData.currentQuoteItems     = savedItems;
        appData.company               = savedCompany;
        appData.terms                 = savedTerms;
        appData.selectedSaleCity      = savedCity;
        appData.currentQuoteNumber    = savedQuoteNum;
        appData.currentDeliveryNumber = savedDeliveryNum;
        appData.currentSaleNumber     = savedSaleNum;
        appData.currentSaleNumbers    = savedSaleNumbers;
        if (dateInput) dateInput.value = savedDate;
        if (pmEl) pmEl.value = savedPm;
    }
}

// Exponer funciones globalmente
window.openHistory = openHistory;
window.setHistoryTypeFilter = setHistoryTypeFilter;
window.renderHistory = renderHistory;
window.deleteHistoryEntry = deleteHistoryEntry;
window.redownloadPDF = redownloadPDF;
