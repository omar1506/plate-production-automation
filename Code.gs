/**
 * ========================================
 * PLATE PRODUCTION AUTOMATION SYSTEM
 * ========================================
 * 
 * @description Automated system for plate production registry
 * @author Omar Zamora
 * @version 2.0
 * @license Proprietary - Internal Use Only
 * 
 * FEATURES:
 * - Automatic form submission processing
 * - Dual PDF generation (receipt + label)
 * - Sequential numbering system
 * - Conditional formatting based on plate material
 * - Automated file organization
 * 
 * BUSINESS IMPACT:
 * - Eliminates 100% manual entry errors
 * - Saves 10+ hours weekly
 * - Provides real-time production tracking
 * ========================================
 */

/**
 * Main handler triggered on Google Form submission
 * Processes form data and generates two PDF documents:
 * 1. Reception receipt
 * 2. Product label
 * 
 * @param {Object} e - Form submit event object
 */
function onFormSubmit(e) {
  try {
    // ==================== CONFIGURATION ====================
    
    // 🧾 Template IDs for document generation
    const PLANTILLA_RECIBO_ID = '1a-SxNC1tzKv2RMl074w1cE2fib7EMzEbfacWvV_js-8';
    const PLANTILLA_ETIQUETA_ID = '1qijgqyja8hgCigMkvPw6J09MRW0dPYwp81P7-IHER7U';
    
    // 🗂️ Destination folder for generated PDFs
    const CARPETA_DESTINO_ID = '1uvEOXKyNAknY_1vbKhOsTHFUDuQzQBBb';

    // ==================== DATA EXTRACTION ====================
    
    const respuestas = e.namedValues;

    // Debug logging - tracks all form responses
    Logger.log('--- FORM SUBMISSION RECEIVED ---');
    for (const clave in respuestas) {
      Logger.log(`"${clave}" => ${respuestas[clave]}`);
    }

    // ==================== METADATA GENERATION ====================
    
    // 📅 Current timestamp
    const fechaActual = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'dd/MM/yyyy HH:mm:ss'
    );

    // 🔢 Auto-increment consecutive number (persistent across executions)
    const scriptProperties = PropertiesService.getScriptProperties();
    let consecutivo = parseInt(scriptProperties.getProperty('CONSECUTIVO_ACTUAL')) || 0;
    consecutivo++;
    scriptProperties.setProperty('CONSECUTIVO_ACTUAL', consecutivo);

    // ==================== DATA MAPPING ====================
    
    /**
     * Maps form field names to template placeholders
     * Uses optional chaining and fallback to prevent errors
     */
    const datos = {
      '{{CONSECUTIVO}}': consecutivo,
      '{{OP}}': respuestas['#OP']?.[0] || 'NO RESPONDIDO',
      '{{CODIGO_CLIENTE}}': respuestas['CODIGO DEL CLIENTE']?.[0] || 'NO RESPONDIDO',
      '{{CODIGO_EUSA}}': respuestas['CODIGO EUSA']?.[0] || 'NO RESPONDIDO',
      '{{CODIGO_BARRAS}}': respuestas['CODIGO DE BARRAS']?.[0] || 'NO RESPONDIDO',
      '{{NOMBRE_PRODUCTO}}': respuestas['NOMBRE DEL PRODUCTO']?.[0] || 'NO RESPONDIDO',
      '{{NOMBRE_CLIENTE}}': respuestas['NOMBRE DEL CLIENTE']?.[0] || 'NO RESPONDIDO',
      '{{METROS}}': respuestas['METROS']?.[0] || 'NO RESPONDIDO',
      '{{TIPO}}': respuestas['TIPO']?.[0] || 'NO RESPONDIDO',
      '{{MARCA}}': respuestas['MARCA']?.[0] || 'NO RESPONDIDO',
      '{{UBICACION}}': respuestas['UBICACION']?.[0] || '',
      '{{COLORES}}': respuestas['COLORES  A GRABAR']?.[0] || 'NO RESPONDIDO',
      '{{AUTOR}}': respuestas['NOBRE DEL AUTOR']?.[0] || 'NO RESPONDIDO',
      '{{OBSERVACIONES}}': respuestas['OBSERVACIONES']?.[0] || 'NO RESPONDIDO',
      '{{FECHA_ENVIO}}': fechaActual
    };

    // ==================== PDF GENERATION: RECEIPT ====================
    
    const carpetaDestino = DriveApp.getFolderById(CARPETA_DESTINO_ID);
    const plantillaRecibo = DriveApp.getFileById(PLANTILLA_RECIBO_ID);
    
    // Create temporary copy of template
    const copiaRecibo = plantillaRecibo.makeCopy(
      `Recepción_OP_${datos['{{OP}}']}_#${consecutivo}`,
      carpetaDestino
    );

    // Open document for editing
    const docRecibo = DocumentApp.openById(copiaRecibo.getId());
    const cuerpoRecibo = docRecibo.getBody();
    const encabezadoRecibo = docRecibo.getHeader();
    const pieRecibo = docRecibo.getFooter();

    // Replace all placeholders with actual data
    for (const marcador in datos) {
      cuerpoRecibo.replaceText(marcador, datos[marcador]);
      if (encabezadoRecibo) encabezadoRecibo.replaceText(marcador, datos[marcador]);
      if (pieRecibo) pieRecibo.replaceText(marcador, datos[marcador]);
    }

    // Apply conditional formatting based on material brand
    resaltarMarcaEnDocumento(docRecibo, datos['{{MARCA}}']);

    docRecibo.saveAndClose();

    // Convert to PDF and save
    const pdfReciboBlob = copiaRecibo.getAs('application/pdf');
    const archivoPDFRecibo = carpetaDestino.createFile(pdfReciboBlob);
    archivoPDFRecibo.setName(`Recepción_OP_${datos['{{OP}}']}_#${consecutivo}.pdf`);

    // Clean up temporary document
    copiaRecibo.setTrashed(true);

    // ==================== PDF GENERATION: LABEL ====================
    
    const plantillaEtiqueta = DriveApp.getFileById(PLANTILLA_ETIQUETA_ID);
    const copiaEtiqueta = plantillaEtiqueta.makeCopy(
      `Etiqueta_OP_${datos['{{OP}}']}_#${consecutivo}`,
      carpetaDestino
    );

    const docEtiqueta = DocumentApp.openById(copiaEtiqueta.getId());
    const cuerpoEtiqueta = docEtiqueta.getBody();
    const encabezadoEtiqueta = docEtiqueta.getHeader();
    const pieEtiqueta = docEtiqueta.getFooter();

    // Replace all placeholders with actual data
    for (const marcador in datos) {
      cuerpoEtiqueta.replaceText(marcador, datos[marcador]);
      if (encabezadoEtiqueta) encabezadoEtiqueta.replaceText(marcador, datos[marcador]);
      if (pieEtiqueta) pieEtiqueta.replaceText(marcador, datos[marcador]);
    }

    // Apply conditional formatting based on material brand
    resaltarMarcaEnDocumento(docEtiqueta, datos['{{MARCA}}']);

    docEtiqueta.saveAndClose();

    // Convert to PDF and save
    const pdfEtiquetaBlob = copiaEtiqueta.getAs('application/pdf');
    const archivoPDFEtiqueta = carpetaDestino.createFile(pdfEtiquetaBlob);
    archivoPDFEtiqueta.setName(`Etiqueta_OP_${datos['{{OP}}']}_#${consecutivo}.pdf`);

    // Clean up temporary document
    copiaEtiqueta.setTrashed(true);

    // ==================== SUCCESS LOGGING ====================
    
    Logger.log(
      `✅ PDFs generated successfully:
       Receipt:  ${archivoPDFRecibo.getUrl()}
       Label:    ${archivoPDFEtiqueta.getUrl()}
       Sequential Number: ${consecutivo}
       OP Number: ${datos['{{OP}}']}
       Timestamp: ${fechaActual}`
    );

  } catch (error) {
    // ==================== ERROR HANDLING ====================
    Logger.log('❌ ERROR in onFormSubmit: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
    
    // Optional: Send email notification on error
    // MailApp.sendEmail({
    //   to: 'admin@example.com',
    //   subject: 'Error in Plate Production System',
    //   body: `Error: ${error.message}\n\nStack: ${error.stack}`
    // });
  }
}

/**
 * Applies color highlighting to material brand text in document
 * Implements business rule: different materials have different colors
 * 
 * COLOR MAPPING:
 * - DUPONT ESXR        → Cyan (#00FFFF)
 * - DUPONT ESP2        → Light Green (#00FF7F)
 * - MACDERMID LUX ITP60 → Red (#FF0000)
 * 
 * @param {GoogleAppsScript.Document.Document} doc - Document to modify
 * @param {string} marca - Material brand name
 */
function resaltarMarcaEnDocumento(doc, marca) {
  // Validation: skip if no valid brand provided
  if (!marca || marca === 'NO RESPONDIDO') return;

  const body = doc.getBody();
  const marcaTexto = marca.trim();
  const marcaLower = marcaTexto.toLowerCase();

  // ==================== BRAND-TO-COLOR MAPPING ====================
  
  let color = null;

  if (marcaLower === 'dupont esxr') {
    color = '#00FFFF'; // Cyan - high visibility
  } else if (marcaLower === 'dupont esp2') {
    color = '#00FF7F'; // Light green - medium contrast
  } else if (marcaLower === 'macdermid lux itp60') {
    color = '#FF0000'; // Red - maximum attention
  }

  // If brand doesn't match any known type, skip coloring
  if (!color) return;

  // ==================== TEXT SEARCH AND HIGHLIGHTING ====================
  
  /**
   * Search for exact text matches and apply color
   * Uses Google Apps Script's findText() which returns RangeElement
   */
  let rangeElement = body.findText(marcaTexto);

  while (rangeElement) {
    const element = rangeElement.getElement();
    const startOffset = rangeElement.getStartOffset();
    const endOffset = rangeElement.getEndOffsetInclusive();

    // Apply color to the specific text range
    element.asText().setForegroundColor(startOffset, endOffset, color);

    // Continue searching for next occurrence
    rangeElement = body.findText(marcaTexto, rangeElement);
  }
}

/**
 * ========================================
 * OPTIONAL UTILITY FUNCTIONS
 * (Can be added for enhanced functionality)
 * ========================================
 */

/**
 * Manually reset the sequential counter (admin function)
 * USE WITH CAUTION - only for maintenance purposes
 */
function resetConsecutivo() {
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('CONSECUTIVO_ACTUAL', '0');
  Logger.log('✅ Sequential counter has been reset to 0');
}

/**
 * Get current sequential number without incrementing
 * Useful for debugging or reporting
 * 
 * @returns {number} Current consecutive number
 */
function getConsecutivoActual() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const consecutivo = parseInt(scriptProperties.getProperty('CONSECUTIVO_ACTUAL')) || 0;
  Logger.log(`Current sequential number: ${consecutivo}`);
  return consecutivo;
}

/**
 * Test function to verify template IDs and folder access
 * Run this before deploying to production
 */
function testConfiguration() {
  try {
    const PLANTILLA_RECIBO_ID = '1a-SxNC1tzKv2RMl074w1cE2fib7EMzEbfacWvV_js-8';
    const PLANTILLA_ETIQUETA_ID = '1qijgqyja8hgCigMkvPw6J09MRW0dPYwp81P7-IHER7U';
    const CARPETA_DESTINO_ID = '1uvEOXKyNAknY_1vbKhOsTHFUDuQzQBBb';
    
    Logger.log('Testing configuration...');
    
    DriveApp.getFileById(PLANTILLA_RECIBO_ID);
    Logger.log('✅ Receipt template accessible');
    
    DriveApp.getFileById(PLANTILLA_ETIQUETA_ID);
    Logger.log('✅ Label template accessible');
    
    DriveApp.getFolderById(CARPETA_DESTINO_ID);
    Logger.log('✅ Destination folder accessible');
    
    Logger.log('✅ All configuration tests passed');
  } catch (error) {
    Logger.log('❌ Configuration test failed: ' + error.message);
  }
}
