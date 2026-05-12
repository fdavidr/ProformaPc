# Proforma AppWeb

Sistema web para gestión de cotizaciones y notas de venta con roles de usuario.

## Características

✅ **Sistema de Login con Roles**

### Administrador
- Usuario: `CiamP25`
- Contraseña: `CiamP25`
- Acceso completo: Configuración, Historial y todas las funciones

### Vendedor
- Usuario: `VendedorX25`
- Contraseña: `VendedorX25`
- Acceso limitado: Solo cotizaciones y notas de venta (sin Configuración ni Historial)

✅ **Gestión de Empresa**
- Configuración de nombre, eslogan y logo
- Numeración automática de cotizaciones (inicia en 100000)

✅ **Gestión de Clientes**
- Agregar, editar y seleccionar clientes
- Datos: Nombre, Teléfono, CI/NIT, Empresa
- Filtrado en tiempo real
- Validación visual (fondo verde al seleccionar)

✅ **Gestión de Vendedores**
- Agregar, editar y seleccionar vendedores
- Datos: Nombre, Celular
- Filtrado en tiempo real
- Validación visual

✅ **Gestión de Productos**
- Agregar, modificar y seleccionar productos
- Datos: Código, Descripción, Precio, Imagen
- Filtrado en tiempo real
- Soporte para imágenes de productos

✅ **Sistema de Cotización/Nota de Venta**
- Agregar productos con cantidad, precio y descuento (% o Bs)
- Cálculo automático de subtotales y totales
- Vista previa de productos en tabla
- Imágenes de productos (25x25px)

✅ **Términos y Condiciones**
- 4 términos personalizables
- Diferentes términos para cotizaciones y notas de venta

✅ **Generación de PDF**
- Diseño profesional
- Paginación automática (ej: Página 1 de 2)
- Incluye todos los datos del documento

✅ **Almacenamiento Local**
- Todos los datos se guardan en localStorage del navegador
- Persistencia de información entre sesiones

## Cómo Usar

1. **Iniciar Sesión**
   - Usuario: CiamP25
   - Contraseña: CiamP25

2. **Configurar Empresa**
   - Clic en "⚙️ Configuración"
   - Ingresar nombre, eslogan y cargar logo

3. **Agregar Clientes y Vendedores**
   - Usar los botones "Agregar Cliente" y "Agregar Vendedor"
   - Completar datos obligatorios (Nombre)

4. **Agregar Productos**
   - Clic en "Nuevo Producto"
   - Ingresar descripción, código, precio e imagen

5. **Crear Cotización**
   - Seleccionar tipo: Cotización o Nota de Venta
   - Seleccionar cliente y vendedor
   - Agregar productos con cantidad y descuento
   - Personalizar términos y condiciones
   - Generar PDF

## Despliegue en Render.com

### Pasos

1. **Crear cuenta en Render.com**:
   - Ir a https://render.com
   - Registrarse con GitHub

2. **Conectar repositorio**:
   - Subir tu código a GitHub
   - En Render, clic en "New +" → "Static Site"
   - Conectar tu repositorio

3. **Configuración automática**:
   - Render detectará el archivo `render.yaml`
   - Se configurará automáticamente como sitio estático

4. **Desplegar**:
   - Clic en "Create Static Site"
   - Render desplegará automáticamente

5. **Acceder a tu aplicación**:
   - URL: `https://tu-app.onrender.com`

### Alternativa: Firebase Hosting

1. **Instalar Firebase CLI**:
```bash
npm install -g firebase-tools
```

2. **Iniciar sesión y desplegar**:
```bash
firebase login
firebase deploy --only hosting
```

## Tecnologías Utilizadas

- **HTML5**: Estructura
- **CSS3**: Diseño responsive y amigable
- **JavaScript (Vanilla)**: Lógica de la aplicación
- **localStorage**: Almacenamiento de datos
- **jsPDF**: Generación de PDFs
- **Firebase Hosting**: Despliegue gratuito

## Características Técnicas

- **Sin dependencias de backend**: Todo funciona en el navegador
- **Sin base de datos externa**: Datos en localStorage
- **100% gratuito**: Hosting gratuito en Firebase
- **Responsive**: Funciona en móviles y tablets
- **Intuitivo**: Interfaz amigable con colores claros
- **Validación visual**: Fondos verdes para selecciones válidas
- **Filtros en tiempo real**: Búsqueda rápida de clientes, vendedores y productos

## Soporte

Para cualquier consulta o mejora, editar directamente el archivo `index.html`.

---

**Versión**: 1.0.0  
**Fecha**: Noviembre 2025
