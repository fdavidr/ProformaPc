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

    const company = entry.company || {};
    const client = typeof entry.client === 'object' ? entry.client : { name: entry.client };
    const seller = typeof entry.seller === 'object' ? entry.seller : { name: entry.seller };
    const items = Array.isArray(entry.items) ? entry.items : [];

    // Regenerar PDF con los datos guardados
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    let yPos = margin;
    let docTitle = 'COTIZACIÓN';
    if (entry.type === 'notaventa') {
        docTitle = 'NOTA DE VENTA';
    } else if (entry.type === 'notaentrega') {
        docTitle = 'NOTA DE ENTREGA';
    }

    const drawHeader = () => {
        doc.setTextColor(0, 0, 0);
        if (company.logo) {
            try {
                doc.addImage(company.logo, 'PNG', margin, yPos - 4, 30, 30);
            } catch (e) {
                // Logo no disponible
            }
        }

        const infoX = margin + (company.logo ? 35 : 0);
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text((company.name || '').toUpperCase(), infoX, yPos + 6);

        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.text((company.slogan || '').toUpperCase(), infoX, yPos + 13);

        if (company.nit) {
            doc.setFont(undefined, 'normal');
            const nitText = 'NIT: ' + company.nit.toUpperCase();
            doc.setTextColor(0, 0, 0);
            doc.text(nitText, infoX, yPos + 20);
        }

        let headerHeight = 12;
        if (company.logo) {
            headerHeight = company.nit ? 30 : 28;
        } else if (company.nit) {
            headerHeight = 24;
        }

        return headerHeight;
    };

    const headerHeight = drawHeader();
    yPos += headerHeight;

    // Tipo de documento y número
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(docTitle, pageWidth - margin, 20, { align: 'right' });
    doc.setFontSize(12);
    doc.text('Nº ' + entry.number, pageWidth - margin, 27, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text('Fecha: ' + entry.date, pageWidth - margin, 34, { align: 'right' });
    
    // Nombre del inventario debajo de la fecha
    if (entry.city) {
        const inventory = appData.inventories.find(inv => inv.id === entry.city);
        const cityName = inventory ? inventory.name.toUpperCase() : entry.city.toUpperCase();
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(cityName, pageWidth - margin, 41, { align: 'right' });
    }

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Información del cliente
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text((client.name || '').toUpperCase(), margin + 25, yPos);
    
    // CI/NIT en la misma fila, alineado a la derecha
    if (client.ci) {
        doc.setFont(undefined, 'bold');
        const ciNitText = 'CI/NIT: ';
        const ciValue = client.ci.toUpperCase();
        const ciNitWidth = doc.getTextWidth(ciNitText);
        doc.text(ciNitText, pageWidth - margin - doc.getTextWidth(ciValue) - ciNitWidth, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(ciValue, pageWidth - margin, yPos, { align: 'right' });
    }
    
    yPos += 6;

    if (client.company) {
        doc.setFont(undefined, 'bold');
        doc.text('Empresa:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(client.company.toUpperCase(), margin + 25, yPos);
        yPos += 6;
    }

    if (client.phone) {
        doc.setFont(undefined, 'bold');
        doc.text('Teléfono:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(client.phone.toUpperCase(), margin + 25, yPos);
        yPos += 6;
    }

    yPos += 3;

    // Información del vendedor
    doc.setFont(undefined, 'bold');
    doc.text('VENDEDOR:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text((seller.name || '').toUpperCase(), margin + 25, yPos);
    
    if (seller.phone) {
        doc.text('Tel: ' + seller.phone.toUpperCase(), margin + 80, yPos);
    }
    yPos += 8;

    // Tabla de productos
    doc.setFont(undefined, 'bold');
    doc.setFillColor(112, 55, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'FD');
    
    doc.setTextColor(255, 255, 255);
    
    // Header diferente para nota de entrega
    if (entry.type === 'notaentrega') {
        doc.text('#', margin + 2, yPos + 5);
        doc.text('Código', margin + 10, yPos + 5);
        doc.text('Descripción', margin + 45, yPos + 5);
        doc.text('Cantidad', pageWidth - margin - 25, yPos + 5, { align: 'right' });
    } else {
        doc.text('#', margin + 2, yPos + 5);
        doc.text('Código', margin + 8, yPos + 5);
        doc.text('IMG', margin + 28, yPos + 5);
        doc.text('Descripción', margin + 52, yPos + 5);
        doc.text('Cant.', margin + 108, yPos + 5);
        doc.text('P.Unit.', margin + 122, yPos + 5);
        doc.text('Desc.', margin + 147, yPos + 5);
        doc.text('Subtotal', pageWidth - margin - 2, yPos + 5, { align: 'right' });
    }
    
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    const tableLeft = margin;
    const tableRight = pageWidth - margin;

    items.forEach((item, index) => {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin;
        }

        // Tabla simplificada para nota de entrega
        if (entry.type === 'notaentrega') {
            const description = doc.splitTextToSize((item.product.description || '').toUpperCase(), 120);
            const rowHeight = Math.max(7, description.length * 5);
            const textYCenter = yPos + (rowHeight / 2);

            doc.text((index + 1).toString(), margin + 2, textYCenter);
            doc.text((item.product.code || '-').toUpperCase(), margin + 10, textYCenter);
            
            const descHeight = description.length * 5;
            const descYCenter = yPos + (rowHeight / 2) - (descHeight / 2) + 2;
            doc.text(description, margin + 45, descYCenter);
            
            doc.text(item.quantity.toString(), pageWidth - margin - 25, textYCenter, { align: 'right' });
            
            // Bordes de la fila
            doc.setDrawColor(200, 200, 200);
            doc.line(tableLeft, yPos + rowHeight - 3, tableRight, yPos + rowHeight - 3);
            doc.line(tableLeft, yPos - 3, tableLeft, yPos + rowHeight - 3);
            doc.line(tableRight, yPos - 3, tableRight, yPos + rowHeight - 3);
            
            // Líneas verticales entre columnas
            doc.line(margin + 8, yPos - 3, margin + 8, yPos + rowHeight - 3);
            doc.line(margin + 40, yPos - 3, margin + 40, yPos + rowHeight - 3);
            
            yPos += rowHeight;
        } else {
            // Tabla completa para cotización y nota de venta
            const description = doc.splitTextToSize((item.product.description || '').toUpperCase(), 56);
            const rowHeight = Math.max(7, description.length * 5, item.product.image ? 26 : 7);
            const textYCenter = yPos + (rowHeight / 2);

            doc.text((index + 1).toString(), margin + 2, textYCenter);
            doc.text((item.product.code || '-').toUpperCase(), margin + 8, textYCenter);
            
            // Imagen del producto
            if (item.product.image) {
                try {
                    const imgHeight = 24;
                    const imgY = yPos + (rowHeight / 2) - (imgHeight / 2) - 3;
                    doc.addImage(item.product.image, 'PNG', margin + 26, imgY, 24, imgHeight);
                } catch(e) {
                    // Imagen del producto no disponible
                }
            }
            
            const descHeight = description.length * 5;
            const descYCenter = yPos + (rowHeight / 2) - (descHeight / 2) + 2;
            doc.text(description, margin + 52, descYCenter);
            
            doc.text(item.quantity.toString(), margin + 108, textYCenter);
            doc.text('Bs ' + item.price.toFixed(2), margin + 122, textYCenter);
            doc.text(item.discount + ' ' + item.discountType, margin + 147, textYCenter);
            doc.text('Bs ' + item.subtotal.toFixed(2), pageWidth - margin - 2, textYCenter, { align: 'right' });
            
            // Bordes de la fila
            doc.setDrawColor(200, 200, 200);
            doc.line(tableLeft, yPos + rowHeight - 3, tableRight, yPos + rowHeight - 3);
            doc.line(tableLeft, yPos - 3, tableLeft, yPos + rowHeight - 3);
            doc.line(tableRight, yPos - 3, tableRight, yPos + rowHeight - 3);
            
            // Líneas verticales
            doc.line(margin + 6, yPos - 3, margin + 6, yPos + rowHeight - 3);
            doc.line(margin + 25, yPos - 3, margin + 25, yPos + rowHeight - 3);
            doc.line(margin + 51, yPos - 3, margin + 51, yPos + rowHeight - 3);
            doc.line(margin + 107, yPos - 3, margin + 107, yPos + rowHeight - 3);
            doc.line(margin + 120, yPos - 3, margin + 120, yPos + rowHeight - 3);
            doc.line(margin + 145, yPos - 3, margin + 145, yPos + rowHeight - 3);
            doc.line(margin + 160, yPos - 3, margin + 160, yPos + rowHeight - 3);
            
            yPos += rowHeight;
        }
    });

    // Borde inferior de la tabla
    doc.setDrawColor(0, 0, 0);
    doc.line(tableLeft, yPos - 3, tableRight, yPos - 3);

    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);

    const pagesAfterTable = doc.internal.getNumberOfPages();
    if (items.length >= 7 && pagesAfterTable === 1) {
        doc.addPage();
        yPos = margin;
        const nextHeaderHeight = drawHeader();
        yPos += nextHeaderHeight;
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(docTitle, pageWidth - margin, 20, { align: 'right' });
        doc.setFontSize(12);
        doc.text('Nº ' + entry.number, pageWidth - margin, 27, { align: 'right' });
        doc.setFontSize(10);
        doc.text('Fecha: ' + entry.date, pageWidth - margin, 34, { align: 'right' });
        
        // Nombre del inventario debajo de la fecha
        if (entry.city) {
            const inventory = appData.inventories.find(inv => inv.id === entry.city);
            const cityName = inventory ? inventory.name.toUpperCase() : entry.city.toUpperCase();
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(cityName, pageWidth - margin, 41, { align: 'right' });
        }
        
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
    }

    yPos += 8;

    // Totales (solo para cotización y nota de venta)
    if (entry.type !== 'notaentrega') {
        const totalsX = pageWidth - margin - 60;
        doc.setFont(undefined, 'normal');
        doc.text('Subtotal:', totalsX, yPos);
        doc.text('Bs ' + entry.subtotal.toFixed(2), totalsX + 40, yPos, { align: 'right' });
        yPos += 6;

        doc.text('Descuento:', totalsX, yPos);
        doc.text('Bs ' + entry.totalDiscount.toFixed(2), totalsX + 40, yPos, { align: 'right' });
        yPos += 8;

        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text('TOTAL:', totalsX, yPos);
        doc.text('Bs ' + entry.total.toFixed(2), totalsX + 40, yPos, { align: 'right' });
        yPos += 10;
    }

    // Términos y condiciones
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Términos y Condiciones:', margin, yPos);
    yPos += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    entry.terms.forEach((term, index) => {
        if (term.trim()) {
            const termText = `${index + 1}. ${term}`;
            const lines = doc.splitTextToSize(termText, pageWidth - 2 * margin);
            lines.forEach(line => {
                if (yPos > pageHeight - 20) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.text(line, margin, yPos);
                yPos += 5;
            });
        }
    });
    
    // Firmas (solo para nota de entrega)
    if (entry.type === 'notaentrega') {
        // Verificar si hay espacio suficiente
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = margin + 20;
        }
        
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        
        const centerX = pageWidth / 2;
        const signatureWidth = 60;
        const signatureY = yPos;
        
        // Firma del Entregador (Izquierda)
        const leftSignatureX = margin + 20;
        doc.line(leftSignatureX, signatureY, leftSignatureX + signatureWidth, signatureY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text('ENTREGADO POR:', leftSignatureX, signatureY + 6);
        doc.text('Nombre:', leftSignatureX, signatureY + 12);
        doc.text('CI:', leftSignatureX, signatureY + 18);
        doc.text('Fecha:', leftSignatureX, signatureY + 24);
        
        // Firma del Receptor (Derecha)
        const rightSignatureX = pageWidth - margin - signatureWidth - 20;
        doc.line(rightSignatureX, signatureY, rightSignatureX + signatureWidth, signatureY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text('RECIBIDO POR:', rightSignatureX, signatureY + 6);
        doc.text('Nombre:', rightSignatureX, signatureY + 12);
        doc.text('CI:', rightSignatureX, signatureY + 18);
        doc.text('Fecha:', rightSignatureX, signatureY + 24);
    }

    // Numeración de páginas
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // ===== MARCA DE AGUA (dibujada AL FINAL para quedar ENCIMA de imágenes y contenido) =====
    if (entry.type === 'notaventa' && (entry.cancelled === true || entry.invoiced === true)) {
        const wmText = entry.cancelled === true ? 'ANULADO' : 'FACTURADO';
        const wmColorR = entry.cancelled === true ? 220 : 30;
        const wmColorG = entry.cancelled === true ? 30 : 160;
        const wmColorB = 30;
        const totalPages = doc.internal.getNumberOfPages();
        const { GState: JsPDFGState } = window.jspdf;
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.saveGraphicsState();
            try {
                const gState = new JsPDFGState({ opacity: 0.3 });
                doc.setGState(gState);
            } catch (e) { /* GState no disponible */ }
            doc.setTextColor(wmColorR, wmColorG, wmColorB);
            doc.setFontSize(70);
            doc.setFont(undefined, 'bold');
            doc.text(wmText, pageWidth / 2 + 20, pageHeight / 2, { align: 'center', angle: 45 });
            doc.restoreGraphicsState();
            doc.setTextColor(0, 0, 0);
        }
    }

    // Guardar PDF
    doc.save(entry.fileName);
}

// Exponer funciones globalmente
window.openHistory = openHistory;
window.setHistoryTypeFilter = setHistoryTypeFilter;
window.renderHistory = renderHistory;
window.deleteHistoryEntry = deleteHistoryEntry;
window.redownloadPDF = redownloadPDF;
