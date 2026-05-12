// ==================== GENERACIÓN DE PDF ====================

// Convierte una URL de Storage a base64, la guarda en cache y la asigna al producto.
async function resolveStorageImagesForPDF(items) {
    for (const item of items) {
        if (!item.product || !item.product.image) continue;
        if (!item.product.image.startsWith('http')) continue;

        // Intentar cache primero
        const cached = getProductImageFromCache(item.product.id);
        if (cached) {
            item.product.image = cached;
            // Actualizar en appData también para que quede en memoria
            const p = appData.products.find(p => p.id === item.product.id);
            if (p) p.image = cached;
            continue;
        }

        // Descargar desde Storage y cachear
        try {
            const response = await fetch(item.product.image);
            const blob = await response.blob();
            const base64 = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            saveProductImageToCache(item.product.id, base64);
            item.product.image = base64;
            const p = appData.products.find(p => p.id === item.product.id);
            if (p) p.image = base64;
        } catch (e) {
            // Si falla la descarga, quitar la imagen para no romper el PDF
            item.product.image = '';
        }
    }
}

// Función para obtener la fecha seleccionada o actual
function getSelectedPdfDate() {
    const dateInput = document.getElementById('pdfDate');
    if (dateInput && dateInput.value) {
        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        return selectedDate.toLocaleDateString('es-BO');
    }
    return new Date().toLocaleDateString('es-BO');
}

// Función para obtener fecha completa con hora
function getSelectedPdfDateTime() {
    const dateInput = document.getElementById('pdfDate');
    if (dateInput && dateInput.value) {
        const selectedDate = new Date(dateInput.value + 'T00:00:00');
        const dateStr = selectedDate.toLocaleDateString('es-BO');
        const timeStr = new Date().toLocaleTimeString('es-BO');
        return `${dateStr}, ${timeStr}`;
    }
    return new Date().toLocaleString('es-BO');
}

let isGeneratingPDF = false;

async function generatePDF() {
    if (!appData.currentClient) {
        alert('Debe seleccionar un cliente');
        return;
    }
    if (!appData.currentSeller) {
        alert('Debe seleccionar un vendedor');
        return;
    }
    if (appData.currentQuoteItems.length === 0) {
        alert('Debe agregar al menos un producto');
        return;
    }

    if (isGeneratingPDF) {
        alert('Ya se está generando el PDF. Espere un momento.');
        return;
    }

    isGeneratingPDF = true;
    try {
        // Asegurar que las imágenes de productos estén en base64 (jsPDF no acepta URLs HTTP)
        await resolveStorageImagesForPDF(appData.currentQuoteItems);

        const reservedNumber = typeof reserveDocumentNumber === 'function'
            ? await reserveDocumentNumber(appData.documentType, appData.documentType === 'notaventa' ? appData.selectedSaleCity : null)
            : null;

        if (reservedNumber) {
            if (appData.documentType === 'cotizacion') {
                appData.currentQuoteNumber = reservedNumber.number;
            } else if (appData.documentType === 'notaventa') {
                setEffectiveSaleNumber(appData.selectedSaleCity, reservedNumber.number);
            } else if (appData.documentType === 'notaentrega') {
                appData.currentDeliveryNumber = reservedNumber.number;
            }
        }

        saveTerms();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;
        let yPos = margin;

        // Logo y Header
        const headerHeight = addPDFHeader(doc, margin, yPos, pageWidth);
        yPos += headerHeight;

        // Tipo de documento y número
        addPDFDocumentInfo(doc, margin, pageWidth);

        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // Información del cliente
        yPos = addPDFClientInfo(doc, margin, yPos, pageWidth);

        // Información del vendedor
        yPos = addPDFSellerInfo(doc, margin, yPos);

        // Tabla de productos
        if (appData.documentType === 'notaentrega') {
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

        // Totales (solo para cotización y nota de venta)
        if (appData.documentType !== 'notaentrega') {
            yPos = addPDFTotals(doc, margin, yPos, pageWidth);
        }

        // Términos y condiciones
        yPos = addPDFTerms(doc, margin, yPos, pageWidth, pageHeight);

        // Firmas (solo para nota de entrega)
        if (appData.documentType === 'notaentrega') {
            addPDFSignatures(doc, margin, yPos, pageWidth, pageHeight);
        }

        // Numeración de páginas
        addPDFPageNumbers(doc, pageWidth, pageHeight);

        // Guardar PDF
        let docTitle = 'COTIZACIÓN';
        let docNumber = appData.currentQuoteNumber;
        if (appData.documentType === 'notaventa') {
            docTitle = 'NOTA_DE_VENTA';
            docNumber = getEffectiveSaleNumber();
        } else if (appData.documentType === 'notaentrega') {
            docTitle = 'NOTA_DE_ENTREGA';
            docNumber = appData.currentDeliveryNumber;
        }
        const fileName = `${docTitle}_${docNumber}_${appData.currentClient.name.toUpperCase().replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);

        // Guardar en historial ANTES de limpiar (usa currentQuoteItems)
        saveToHistory(fileName);

        // Si es nota de venta, descontar del stock
        if (appData.documentType === 'notaventa') {
            const cityId = appData.selectedSaleCity;
            appData.currentQuoteItems.forEach(item => {
                const product = appData.products.find(p => p.id === item.id);
                if (product) {
                    if (!product.stock) product.stock = {};
                    const previousStock = product.stock[cityId] || 0;
                    product.stock[cityId] = Math.max(0, previousStock - item.quantity);
                }
            });
        }

        // Actualizar contador local al siguiente número reservado
        if (reservedNumber) {
            if (appData.documentType === 'cotizacion') {
                appData.currentQuoteNumber = reservedNumber.next;
            } else if (appData.documentType === 'notaventa') {
                setEffectiveSaleNumber(appData.selectedSaleCity, reservedNumber.next);
            } else if (appData.documentType === 'notaentrega') {
                appData.currentDeliveryNumber = reservedNumber.next;
            }
        } else {
            if (appData.documentType === 'cotizacion') {
                appData.currentQuoteNumber++;
            } else if (appData.documentType === 'notaventa') {
                setEffectiveSaleNumber(appData.selectedSaleCity, getEffectiveSaleNumber() + 1);
            } else if (appData.documentType === 'notaentrega') {
                appData.currentDeliveryNumber++;
            }
        }
        
        // Guardar datos (esperar a que termine)
        await saveData();
        
        // Actualizar UI y número de documento
        updateUI();
        updateDocumentNumber();
        
        // Mostrar alerta de éxito
        let successMsg = 'Cotización generada exitosamente.';
        if (appData.documentType === 'notaventa') {
            successMsg = 'Nota de venta generada exitosamente. Stock actualizado.';
        } else if (appData.documentType === 'notaentrega') {
            successMsg = 'Nota de entrega generada exitosamente.';
        }
        alert(successMsg + ' Use el botón "Nueva Cotización" para limpiar los datos.');
    } finally {
        isGeneratingPDF = false;
    }
}

// ==================== FUNCIONES AUXILIARES DE PDF ====================

function addPDFHeader(doc, margin, yPos, pageWidth) {
    doc.setTextColor(0, 0, 0);
    if (appData.company.logo) {
        try {
            doc.addImage(appData.company.logo, 'PNG', margin, yPos - 4, 30, 30);
        } catch (e) {
            // Logo no disponible
        }
    }
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    const infoX = margin + (appData.company.logo ? 35 : 0);
    doc.text(appData.company.name.toUpperCase(), infoX, yPos + 6);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text((appData.company.slogan || '').toUpperCase(), infoX, yPos + 13);

    if (appData.company.nit) {
        doc.setFont(undefined, 'normal');
        const nitText = 'NIT: ' + appData.company.nit.toUpperCase();
        doc.setTextColor(0, 0, 0);
        doc.text(nitText, infoX, yPos + 20);
    }

    let headerHeight = 12;
    if (appData.company.logo) {
        // Logo + name + slogan (+ optional NIT)
        headerHeight = appData.company.nit ? 30 : 28;
    } else if (appData.company.nit) {
        // No logo but has NIT
        headerHeight = 24;
    }

    return headerHeight;
}

function addPDFDocumentInfo(doc, margin, pageWidth) {
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    let docTitle = 'COTIZACIÓN';
    if (appData.documentType === 'notaventa') {
        docTitle = 'NOTA DE VENTA';
    } else if (appData.documentType === 'notaentrega') {
        docTitle = 'NOTA DE ENTREGA';
    }
    doc.text(docTitle, pageWidth - margin, 20, { align: 'right' });
    doc.setFontSize(12);
    let docNumber = appData.currentQuoteNumber;
    if (appData.documentType === 'notaventa') {
        docNumber = getEffectiveSaleNumber();
    } else if (appData.documentType === 'notaentrega') {
        docNumber = appData.currentDeliveryNumber;
    }
    doc.text('Nº ' + docNumber, pageWidth - margin, 27, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text('Fecha: ' + getSelectedPdfDate(), pageWidth - margin, 34, { align: 'right' });
    
    // Nombre del inventario y método de pago en la misma fila
    const inventory = appData.inventories.find(inv => inv.id === appData.selectedSaleCity);
    const cityName = inventory ? inventory.name.toUpperCase() : '';

    if (appData.documentType === 'notaventa') {
        const pmEl = document.getElementById('salePaymentMethod');
        const pm = pmEl ? pmEl.value : '';

        // Ciudad a la derecha, método de pago centrado — misma fila (y=41)
        if (cityName) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(cityName, pageWidth - margin, 41, { align: 'right' });
        }
        if (pm) {
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text('PAGO: ' + pm, pageWidth / 2, 41, { align: 'center' });
        }
    } else {
        if (cityName) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text(cityName, pageWidth - margin, 41, { align: 'right' });
        }
    }
}

function addPDFClientInfo(doc, margin, yPos, pageWidth) {
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(appData.currentClient.name.toUpperCase(), margin + 25, yPos);
    
    // CI/NIT en la misma fila, alineado a la derecha
    if (appData.currentClient.ci) {
        doc.setFont(undefined, 'bold');
        const ciNitText = 'CI/NIT: ';
        const ciValue = appData.currentClient.ci.toUpperCase();
        const ciNitWidth = doc.getTextWidth(ciNitText);
        doc.text(ciNitText, pageWidth - margin - doc.getTextWidth(ciValue) - ciNitWidth, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(ciValue, pageWidth - margin, yPos, { align: 'right' });
    }
    
    yPos += 6;

    if (appData.currentClient.company) {
        doc.setFont(undefined, 'bold');
        doc.text('Empresa:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(appData.currentClient.company.toUpperCase(), margin + 25, yPos);
        yPos += 6;
    }

    if (appData.currentClient.phone) {
        doc.setFont(undefined, 'bold');
        doc.text('Teléfono:', margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(appData.currentClient.phone.toUpperCase(), margin + 25, yPos);
        yPos += 6;
    }

    return yPos + 3;
}

function addPDFSellerInfo(doc, margin, yPos) {
    doc.setFont(undefined, 'bold');
    doc.text('VENDEDOR:', margin, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(appData.currentSeller.name.toUpperCase(), margin + 25, yPos);
    
    if (appData.currentSeller.phone) {
        doc.text('Tel: ' + appData.currentSeller.phone.toUpperCase(), margin + 80, yPos);
    }
    
    return yPos + 8;
}

function addPDFProductsTable(doc, margin, yPos, pageWidth, pageHeight) {
    // Columnas: # | Código | IMG | Descripción | Cant. | Descuento | Precio U. | Subtotal
    // Separadores (offset desde margin): 6, 24, 50, 98, 110, 130, 152, 180(=pageRight)
    doc.setFont(undefined, 'bold');
    doc.setFillColor(112, 55, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'FD');

    doc.setTextColor(255, 255, 255);
    doc.text('#',           margin + 2,   yPos + 5);
    doc.text('Código',      margin + 7,   yPos + 5);
    doc.text('IMG',         margin + 33,  yPos + 5);
    doc.text('Descripción', margin + 52,  yPos + 5);
    doc.text('Cant.',       margin + 99,  yPos + 5);
    doc.text('Descuento',   margin + 111, yPos + 5);
    doc.text('Precio U.',   margin + 131, yPos + 5);
    doc.text('Subtotal',    pageWidth - margin - 2, yPos + 5, { align: 'right' });

    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    const tableLeft  = margin;
    const tableRight = pageWidth - margin;

    // Filas de productos
    appData.currentQuoteItems.forEach((item, index) => {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin;
        }

        // Calcular altura de la fila
        const description = doc.splitTextToSize(item.product.description.toUpperCase(), 46);
        const rowHeight   = Math.max(7, description.length * 5, item.product.image ? 26 : 7);
        const textYCenter = yPos + (rowHeight / 2);

        // #
        doc.text((index + 1).toString(), margin + 2, textYCenter);

        // Código
        doc.text((item.product.code || '-').toUpperCase(), margin + 7, textYCenter);

        // Imagen del producto
        if (item.product.image) {
            try {
                const imgHeight = 24;
                const imgY = yPos + (rowHeight / 2) - (imgHeight / 2) - 3;
                doc.addImage(item.product.image, 'PNG', margin + 25, imgY, 24, imgHeight);
            } catch(e) {
                // Imagen del producto no disponible
            }
        }

        // Descripción centrada verticalmente
        const descHeight  = description.length * 5;
        const descYCenter = yPos + (rowHeight / 2) - (descHeight / 2) + 2;
        doc.text(description, margin + 52, descYCenter);

        // Cantidad
        doc.text(item.quantity.toString(), margin + 99, textYCenter);

        // Descuento
        const discountText = (item.discount && item.discount > 0)
            ? item.discount + ' ' + item.discountType
            : '-';
        doc.text(discountText, margin + 111, textYCenter);

        // Precio unitario: con descuento aplicado si corresponde
        const displayPrice = (item.discount && item.discount > 0 && item.quantity > 0)
            ? item.subtotal / item.quantity
            : item.price;
        doc.text('Bs ' + displayPrice.toFixed(2), margin + 131, textYCenter);

        // Subtotal
        doc.text('Bs ' + item.subtotal.toFixed(2), pageWidth - margin - 2, textYCenter, { align: 'right' });

        // Bordes de la fila
        doc.setDrawColor(200, 200, 200);
        doc.line(tableLeft,  yPos + rowHeight - 3, tableRight, yPos + rowHeight - 3);
        doc.line(tableLeft,  yPos - 3, tableLeft,  yPos + rowHeight - 3);
        doc.line(tableRight, yPos - 3, tableRight, yPos + rowHeight - 3);

        // Líneas verticales entre columnas
        doc.line(margin +   6, yPos - 3, margin +   6, yPos + rowHeight - 3); // # | Código
        doc.line(margin +  24, yPos - 3, margin +  24, yPos + rowHeight - 3); // Código | IMG
        doc.line(margin +  50, yPos - 3, margin +  50, yPos + rowHeight - 3); // IMG | Desc
        doc.line(margin +  98, yPos - 3, margin +  98, yPos + rowHeight - 3); // Desc | Cant
        doc.line(margin + 110, yPos - 3, margin + 110, yPos + rowHeight - 3); // Cant | Desc
        doc.line(margin + 130, yPos - 3, margin + 130, yPos + rowHeight - 3); // Desc | PU
        doc.line(margin + 152, yPos - 3, margin + 152, yPos + rowHeight - 3); // PU | Sub

        yPos += rowHeight;
    });

    // Borde inferior de la tabla
    doc.setDrawColor(0, 0, 0);
    doc.line(tableLeft, yPos - 3, tableRight, yPos - 3);

    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    return yPos + 8;
}

function addPDFProductsTableDelivery(doc, margin, yPos, pageWidth, pageHeight) {
    // Header de la tabla para nota de entrega con columna de imagen
    doc.setFont(undefined, 'bold');
    doc.setFillColor(112, 55, 205);
    doc.rect(margin, yPos, pageWidth - 2 * margin, 7, 'FD');
    
    doc.setTextColor(255, 255, 255);
    doc.text('#', margin + 2, yPos + 5);
    doc.text('Código', margin + 10, yPos + 5);
    doc.text('IMG', margin + 33, yPos + 5);
    doc.text('Descripción', margin + 58, yPos + 5);
    doc.text('Cantidad', pageWidth - margin - 2, yPos + 5, { align: 'right' });
    
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');

    const tableLeft = margin;
    const tableRight = pageWidth - margin;

    // Filas de productos
    appData.currentQuoteItems.forEach((item, index) => {
        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = margin;
        }

        // Calcular altura de la fila considerando imagen
        const description = doc.splitTextToSize(item.product.description.toUpperCase(), 93);
        const rowHeight = Math.max(7, description.length * 5, item.product.image ? 26 : 7);
        const textYCenter = yPos + (rowHeight / 2);

        // Textos
        doc.text((index + 1).toString(), margin + 2, textYCenter);
        doc.text((item.product.code || '-').toUpperCase(), margin + 10, textYCenter);

        // Imagen del producto
        if (item.product.image) {
            try {
                const imgHeight = 24;
                const imgY = yPos + (rowHeight / 2) - (imgHeight / 2) - 3;
                doc.addImage(item.product.image, 'PNG', margin + 31, imgY, 24, imgHeight);
            } catch(e) {
                // Imagen del producto no disponible
            }
        }
        
        const descHeight = description.length * 5;
        const descYCenter = yPos + (rowHeight / 2) - (descHeight / 2) + 2;
        doc.text(description, margin + 58, descYCenter);
        
        doc.text(item.quantity.toString(), pageWidth - margin - 2, textYCenter, { align: 'right' });
        
        // Bordes de la fila
        doc.setDrawColor(200, 200, 200);
        doc.line(tableLeft, yPos + rowHeight - 3, tableRight, yPos + rowHeight - 3);
        doc.line(tableLeft, yPos - 3, tableLeft, yPos + rowHeight - 3);
        doc.line(tableRight, yPos - 3, tableRight, yPos + rowHeight - 3);
        
        // Líneas verticales entre columnas
        doc.line(margin + 8, yPos - 3, margin + 8, yPos + rowHeight - 3);
        doc.line(margin + 30, yPos - 3, margin + 30, yPos + rowHeight - 3);
        doc.line(margin + 56, yPos - 3, margin + 56, yPos + rowHeight - 3);
        doc.line(pageWidth - margin - 25, yPos - 3, pageWidth - margin - 25, yPos + rowHeight - 3);
        
        yPos += rowHeight;
    });

    // Borde inferior de la tabla
    doc.setDrawColor(0, 0, 0);
    doc.line(tableLeft, yPos - 3, tableRight, yPos - 3);

    yPos += 5;
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    return yPos + 8;
}

function addPDFTotals(doc, margin, yPos, pageWidth) {
    const subtotal = appData.currentQuoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = appData.currentQuoteItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const total = subtotal - totalDiscount;

    const totalsX = pageWidth - margin - 60;
    doc.setFont(undefined, 'normal');
    doc.text('Subtotal:', totalsX, yPos);
    doc.text('Bs ' + subtotal.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    yPos += 6;

    doc.text('Descuento:', totalsX, yPos);
    doc.text('Bs ' + totalDiscount.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    yPos += 8;

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', totalsX, yPos);
    doc.text('Bs ' + total.toFixed(2), totalsX + 40, yPos, { align: 'right' });
    
    return yPos + 10;
}

function addPDFTerms(doc, margin, yPos, pageWidth, pageHeight) {
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Términos y Condiciones:', margin, yPos);
    yPos += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const terms = appData.terms[appData.documentType];
    terms.forEach((term, index) => {
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
    
    return yPos + 10;
}

function addPDFSignatures(doc, margin, yPos, pageWidth, pageHeight) {
    // Verificar si hay espacio suficiente, si no, agregar nueva página
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

function addPDFPageNumbers(doc, pageWidth, pageHeight) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
}

function saveToHistory(fileName) {
    const subtotal = appData.currentQuoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = appData.currentQuoteItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const total = subtotal - totalDiscount;

    let docNumber = appData.currentQuoteNumber;
    if (appData.documentType === 'notaventa') {
        docNumber = getEffectiveSaleNumber();
    } else if (appData.documentType === 'notaentrega') {
        docNumber = appData.currentDeliveryNumber;
    }

    const paymentMethodEl = document.getElementById('salePaymentMethod');
    const paymentMethod = (appData.documentType === 'notaventa' && paymentMethodEl) ? paymentMethodEl.value : '';

    const historyEntry = {
        id: Date.now(),
        type: appData.documentType,
        number: docNumber,
        city: appData.selectedSaleCity,
        paymentMethod: paymentMethod,
        client: JSON.parse(JSON.stringify({
            name: appData.currentClient.name,
            phone: appData.currentClient.phone || '',
            ci: appData.currentClient.ci || '',
            company: appData.currentClient.company || ''
        })),
        seller: JSON.parse(JSON.stringify({
            name: appData.currentSeller.name,
            phone: appData.currentSeller.phone || ''
        })),
        items: JSON.parse(JSON.stringify(appData.currentQuoteItems)),
        subtotal: subtotal,
        totalDiscount: totalDiscount,
        total: total,
        date: getSelectedPdfDateTime(),
        terms: JSON.parse(JSON.stringify(appData.terms[appData.documentType])),
        company: JSON.parse(JSON.stringify({
            name: appData.company.name,
            slogan: appData.company.slogan,
            nit: appData.company.nit || '',
            logo: appData.company.logo
        })),
        fileName: fileName
    };
    
    appData.pdfHistory.unshift(historyEntry);
}

// Exponer funciones globalmente para eventos onclick
window.generatePDF = generatePDF;
