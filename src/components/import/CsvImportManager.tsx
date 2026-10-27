import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Layers,
  ArrowRight,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { CsvPartRow } from '../../types/inventory';
import {
  batchImportInventory,
  BatchImportResult,
} from '../../services/partsService';

export const CsvImportManager: React.FC = () => {
  const { sellerProfile, effectiveSellerProfile } = useAuth();
  const currentSeller = effectiveSellerProfile || sellerProfile;
  const sellerId = currentSeller?.id;

  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<CsvPartRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);
  const [uiAlert, setUiAlert] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [expandedSection, setExpandedSection] = useState<'errors' | 'ignored' | 'duplicates' | null>(null);

  // Template CSV Autopia di esempio
  const downloadSampleCsv = () => {
    const sampleHeaders = [
      'title',
      'oem_code',
      'internal_code',
      'price',
      'quantity',
      'condition',
      'side',
      'position_note',
      'description',
      'category_name',
      'shipping_cost',
    ];

    const sampleRows = [
      [
        'Alternatore 120A',
        '03L903023B',
        'RIC-ALT-01',
        '65.00',
        '1',
        'buono',
        'anteriore',
        'Corsia 2 - Scaffale A-04',
        'Alternatore originale perfettamente testato al banco prova',
        'Elettrico',
        '12.00',
      ],
      [
        'Faro Anteriore Sinistro LED',
        '51984210',
        'RIC-FAR-12',
        '140.00',
        '2',
        'ottimo',
        'anteriore_sx',
        'Corsia 1 - Scaffale B-10',
        'Faro completo ganci integri lente trasparente',
        'Illuminazione',
        '15.00',
      ],
      [
        'Compressore Clima A/C',
        '1K0820803S',
        'RIC-CLI-09',
        '95.00',
        '1',
        'buono',
        'anteriore',
        'Corsia 3 - Scaffale C-02',
        'Compressore aria condizionata spina 2 pin',
        'Climatizzazione',
        '12.00',
      ],
      [
        'Specchietto Retrovisore Destro Elettrico',
        '735517045',
        'RIC-SPE-44',
        '40.00',
        '1',
        'buono',
        'anteriore_dx',
        'Corsia 4 - Scaffale D-01',
        'Calotta colore nero regolazione elettrica',
        'Carrozzeria',
        '10.00',
      ],
    ];

    const csvText = [
      sampleHeaders.join(','),
      ...sampleRows.map((row) =>
        row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modello_import_ricambi_autopia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Funzione di utilità per il parsing numerico e valute italiane (es. 65,50 o € 65,50 o 1.250,00)
  const parseItalianDecimal = (raw: string | undefined): number => {
    if (!raw) return 0;
    let s = raw.trim().replace(/[€$£\s]/g, '');
    if (!s) return 0;
    const lastDot = s.lastIndexOf('.');
    const lastComma = s.lastIndexOf(',');
    if (lastDot !== -1 && lastComma !== -1) {
      if (lastComma > lastDot) {
        // Formato italiano: 1.250,50 -> 1250.50
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato internazionale: 1,250.50 -> 1250.50
        s = s.replace(/,/g, '');
      }
    } else if (lastComma !== -1) {
      // Formato con sola virgola: 65,50 -> 65.50
      s = s.replace(',', '.');
    }
    const val = parseFloat(s);
    return isNaN(val) ? 0 : val;
  };

  // Parser RFC 4180 conforme che supporta virgola, punto e virgola, tabulazioni, virgolette e ritorni a capo
  const parseCsvTable = (text: string): { headers: string[]; rows: string[][] } => {
    const clean = text.replace(/^\uFEFF/, '');
    if (!clean.trim()) return { headers: [], rows: [] };

    // Rileva delimitatore analizzando la prima riga al di fuori delle virgolette
    let firstLine = '';
    let inQ = false;
    for (let i = 0; i < clean.length; i++) {
      const c = clean[i];
      if (c === '"') inQ = !inQ;
      if ((c === '\n' || c === '\r') && !inQ) {
        firstLine = clean.slice(0, i);
        break;
      }
    }
    if (!firstLine) firstLine = clean;

    let semicolons = 0;
    let commas = 0;
    let tabs = 0;
    let inQuoteDelim = false;
    for (let i = 0; i < firstLine.length; i++) {
      const c = firstLine[i];
      if (c === '"') inQuoteDelim = !inQuoteDelim;
      else if (!inQuoteDelim) {
        if (c === ';') semicolons++;
        else if (c === ',') commas++;
        else if (c === '\t') tabs++;
      }
    }
    const delimiter = tabs > semicolons && tabs > commas ? '\t' : semicolons >= commas ? ';' : ',';

    const allRows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let insideQuotes = false;

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      const nextChar = clean[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // salta virgoletta di escape
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // salta \n in \r\n
        }
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((f) => f.length > 0)) {
          allRows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentField += char;
      }
    }

    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        allRows.push(currentRow);
      }
    }

    if (allRows.length === 0) return { headers: [], rows: [] };
    const headers = allRows[0].map((h) => h.toLowerCase().replace(/^["']|["']$/g, '').trim());
    const rows = allRows.slice(1);
    return { headers, rows };
  };

  // Parser CSV pulito con rilevamento automatico del separatore e supporto caratteri italiani
  const parseCsvText = (text: string) => {
    setParseErrors([]);
    setImportResult(null);
    setUiAlert(null);

    const { headers: header, rows: rawRows } = parseCsvTable(text);

    if (header.length === 0 || rawRows.length === 0) {
      setParseErrors(['Il file CSV deve contenere almeno una riga di intestazione e una riga di dati.']);
      setParsedRows([]);
      return;
    }

    const titleIdx = header.indexOf('title') !== -1 ? header.indexOf('title') : header.indexOf('nome');
    const oemIdx = header.indexOf('oem_code') !== -1 ? header.indexOf('oem_code') : header.indexOf('oem');
    const intCodeIdx = header.indexOf('internal_code') !== -1 ? header.indexOf('internal_code') : header.indexOf('codice');
    const priceIdx = header.indexOf('price') !== -1 ? header.indexOf('price') : header.indexOf('prezzo');
    const qtyIdx = header.indexOf('quantity') !== -1 ? header.indexOf('quantity') : header.indexOf('quantita');
    const condIdx = header.indexOf('condition') !== -1 ? header.indexOf('condition') : header.indexOf('condizione');
    const sideIdx = header.indexOf('side') !== -1 ? header.indexOf('side') : header.indexOf('lato');
    const posIdx = header.indexOf('position_note') !== -1 ? header.indexOf('position_note') : header.indexOf('scaffale');
    const descIdx = header.indexOf('description') !== -1 ? header.indexOf('description') : header.indexOf('descrizione');
    const catIdx = header.indexOf('category_name') !== -1 ? header.indexOf('category_name') : header.indexOf('categoria');
    const shipIdx = header.indexOf('shipping_cost') !== -1 ? header.indexOf('shipping_cost') : header.indexOf('spedizione');

    if (titleIdx === -1) {
      setParseErrors([
        'Colonna obbligatoria "title" (o "nome") non trovata nell\'intestazione CSV. Scarica il file di esempio per visualizzare la struttura corretta.',
      ]);
      setParsedRows([]);
      return;
    }

    const rows: CsvPartRow[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const cols = rawRows[i].map((c) => c.replace(/^["']|["']$/g, '').trim());

      const rawTitle = cols[titleIdx];
      if (!rawTitle) {
        errors.push(`Riga ${i + 2}: titolo mancante (riga ignorata)`);
        continue;
      }

      const rawPrice = priceIdx !== -1 ? parseItalianDecimal(cols[priceIdx]) : 0;
      const rawQty = qtyIdx !== -1 ? parseInt(cols[qtyIdx], 10) : 1;
      const rawCond = condIdx !== -1 ? cols[condIdx]?.toLowerCase() : 'buono';

      let condition: CsvPartRow['condition'] = 'buono';
      if (['ottimo', 'buono', 'discreto', 'da_revisionare'].includes(rawCond)) {
        condition = rawCond as CsvPartRow['condition'];
      }

      rows.push({
        title: rawTitle,
        oem_code: oemIdx !== -1 && cols[oemIdx] ? cols[oemIdx] : undefined,
        internal_code: intCodeIdx !== -1 && cols[intCodeIdx] ? cols[intCodeIdx] : undefined,
        price: isNaN(rawPrice) ? 0 : rawPrice,
        quantity: isNaN(rawQty) || rawQty < 1 ? 1 : rawQty,
        condition,
        side: sideIdx !== -1 && cols[sideIdx] ? cols[sideIdx] : undefined,
        position_note: posIdx !== -1 && cols[posIdx] ? cols[posIdx] : undefined,
        description: descIdx !== -1 && cols[descIdx] ? cols[descIdx] : undefined,
        category_name: catIdx !== -1 && cols[catIdx] ? cols[catIdx] : undefined,
        shipping_cost: shipIdx !== -1 ? parseItalianDecimal(cols[shipIdx]) : 0,
        pickup_available: true,
        shipping_available: true,
      });
    }

    setParsedRows(rows);
    setParseErrors(errors);
  };

  // Caricamento file da disco
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      parseCsvText(content);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Esecuzione importazione
  const handleExecuteImport = async () => {
    if (!sellerId) {
      setUiAlert({ type: 'error', message: 'Nessun profilo venditore selezionato o autorizzato per l\'importazione.' });
      return;
    }

    if (parsedRows.length === 0) {
      setUiAlert({ type: 'warning', message: 'Nessuna riga valida da importare. Seleziona un file CSV o incolla il testo dei ricambi.' });
      return;
    }

    setIsImporting(true);
    setUiAlert(null);
    try {
      const result = await batchImportInventory(sellerId, parsedRows);
      setImportResult(result);
      if (result.insertedCount > 0) {
        setParsedRows([]);
        setCsvContent('');
        setFileName(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Eccezione durante l\'importazione';
      setImportResult({
        insertedCount: 0,
        ignoredCount: 0,
        duplicateCount: 0,
        errors: [msg],
        ignoredDetails: [],
        duplicateDetails: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 font-sans text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Fase 2 • Importazione Dati
              </span>
              <span className="text-xs text-slate-400">
                {currentSeller?.business_name || 'Autodemolitore'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-1 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              <span>Importazione Massiva Ricambi (CSV)</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Carica le giacenze del tuo magazzino da file Excel/CSV con mappatura automatica categorie e codici OEM.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Scarica File CSV Esempio</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Avviso Interfaccia Locale */}
        {uiAlert && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
              uiAlert.type === 'error'
                ? 'bg-red-950/60 border-red-800 text-red-200'
                : uiAlert.type === 'warning'
                ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                : 'bg-blue-950/60 border-blue-800 text-blue-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{uiAlert.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setUiAlert(null)}
              className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        )}

        {/* Esito Importazione Dettagliato a 4 Metriche */}
        {importResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-sm font-bold text-slate-100">
                  Riepilogo Elaborazione Importazione CSV
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setImportResult(null)}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Chiudi Riepilogo
              </button>
            </div>

            {/* 4 Quadranti Statistici */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* 1. Righe Importate Correttamente */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-lg p-3 text-emerald-300">
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                  Importati con Successo
                </div>
                <div className="text-xl font-extrabold mt-1">{importResult.insertedCount}</div>
                <div className="text-[10px] text-emerald-400/80 mt-0.5">Ricambi a magazzino</div>
              </div>

              {/* 2. Righe Ignorate */}
              <div
                onClick={() =>
                  setExpandedSection(expandedSection === 'ignored' ? null : 'ignored')
                }
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  importResult.ignoredCount > 0
                    ? 'bg-slate-950 border-slate-700 hover:border-slate-500 text-slate-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Righe Ignorate</span>
                  {importResult.ignoredCount > 0 && <span className="text-[9px] underline">Dettagli</span>}
                </div>
                <div className="text-xl font-extrabold mt-1">{importResult.ignoredCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Titoli assenti o vuoti</div>
              </div>

              {/* 3. Duplicati Rilevati */}
              <div
                onClick={() =>
                  setExpandedSection(expandedSection === 'duplicates' ? null : 'duplicates')
                }
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  importResult.duplicateCount > 0
                    ? 'bg-amber-950/40 border-amber-800/80 hover:border-amber-600 text-amber-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center justify-between">
                  <span>Duplicati Rilevati</span>
                  {importResult.duplicateCount > 0 && <span className="text-[9px] underline">Dettagli</span>}
                </div>
                <div className="text-xl font-extrabold mt-1">{importResult.duplicateCount}</div>
                <div className="text-[10px] text-amber-400/80 mt-0.5">Codici OEM o interni duplicati</div>
              </div>

              {/* 4. Righe con Errori */}
              <div
                onClick={() =>
                  setExpandedSection(expandedSection === 'errors' ? null : 'errors')
                }
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  importResult.errors.length > 0
                    ? 'bg-red-950/40 border-red-800/80 hover:border-red-600 text-red-300'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-red-400 flex items-center justify-between">
                  <span>Errori Riscontrati</span>
                  {importResult.errors.length > 0 && <span className="text-[9px] underline">Dettagli</span>}
                </div>
                <div className="text-xl font-extrabold mt-1">{importResult.errors.length}</div>
                <div className="text-[10px] text-red-400/80 mt-0.5">Scartati durante il salvataggio</div>
              </div>
            </div>

            {/* Dettagli Sezione Espansa */}
            {expandedSection === 'ignored' && importResult.ignoredDetails.length > 0 && (
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-slate-300">Dettaglio righe ignorate:</div>
                <ul className="list-disc list-inside max-h-40 overflow-y-auto space-y-1 text-slate-400 font-mono text-[11px]">
                  {importResult.ignoredDetails.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {expandedSection === 'duplicates' && importResult.duplicateDetails.length > 0 && (
              <div className="bg-amber-950/30 p-3.5 rounded-lg border border-amber-800/60 text-xs space-y-1">
                <div className="font-bold text-amber-300">Dettaglio codici duplicati scartati:</div>
                <ul className="list-disc list-inside max-h-40 overflow-y-auto space-y-1 text-amber-200/90 font-mono text-[11px]">
                  {importResult.duplicateDetails.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {expandedSection === 'errors' && importResult.errors.length > 0 && (
              <div className="bg-red-950/30 p-3.5 rounded-lg border border-red-800/60 text-xs space-y-1">
                <div className="font-bold text-red-300">Dettaglio errori di salvataggio:</div>
                <ul className="list-disc list-inside max-h-40 overflow-y-auto space-y-1 text-red-200/90 font-mono text-[11px]">
                  {importResult.errors.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Box Upload e Istruzioni */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Carica il tuo file CSV o incolla i dati</span>
              </div>

              {/* Area Drag & Drop / File Input */}
              <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  {fileName ? fileName : 'Seleziona un file CSV dal tuo computer'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Separatore virgola o punto e virgola, codifica UTF-8
                </span>
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Textarea alternativa per incollare CSV da blocco note */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium block">
                  Oppure incolla direttamente il testo CSV qui:
                </label>
                <textarea
                  rows={4}
                  value={csvContent}
                  onChange={(e) => {
                    setCsvContent(e.target.value);
                    parseCsvText(e.target.value);
                  }}
                  placeholder="title,oem_code,price,quantity,condition,position_note&#10;Motorino Avviamento,02M911023,70.00,1,ottimo,Scaffale A-02"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Istruzioni e Standard Colonne */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 text-xs text-slate-300">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-4 h-4" />
              <span>Standard Colonne CSV</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Il parser riconosce automaticamente i seguenti campi nell'intestazione:
            </p>
            <div className="space-y-2 text-[11px]">
              <div>
                <strong className="text-slate-100">title</strong> <span className="text-red-400">*</span>: Nome del ricambio
              </div>
              <div>
                <strong className="text-slate-100">oem_code</strong>: Codice originale costruttore
              </div>
              <div>
                <strong className="text-slate-100">price</strong>: Prezzo in Euro (es. 45.00)
              </div>
              <div>
                <strong className="text-slate-100">quantity</strong>: Giacenza pezzi (es. 1)
              </div>
              <div>
                <strong className="text-slate-100">condition</strong>: ottimo, buono, discreto, da_revisionare
              </div>
              <div>
                <strong className="text-slate-100">position_note</strong>: Posizione scaffale officina
              </div>
              <div>
                <strong className="text-slate-100">category_name</strong>: Categoria Autopia (es. Elettrico)
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="w-full py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[11px] font-semibold text-center transition-colors"
              >
                Scarica Template Ufficiale (.csv)
              </button>
            </div>
          </div>
        </div>

        {/* Errori di Parsing */}
        {parseErrors.length > 0 && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs space-y-1">
            <div className="font-bold flex items-center space-x-1.5 text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Segnalazioni sul file CSV:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5">
              {parseErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tabella Anteprima Righe Riconosciute */}
        {parsedRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Anteprima Righe Riconosciute ({parsedRows.length} ricambi pronti)</span>
              </div>

              <button
                type="button"
                disabled={isImporting}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center space-x-2 transition-colors shadow-lg shadow-emerald-600/20"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importazione in corso...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Conferma e Importa nel Magazzino ({parsedRows.length})</span>
                  </>
                )}
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60 max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold sticky top-0">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Titolo Ricambio</th>
                    <th className="py-2.5 px-3">Codice OEM</th>
                    <th className="py-2.5 px-3">Prezzo</th>
                    <th className="py-2.5 px-3">Qtà</th>
                    <th className="py-2.5 px-3">Condizione</th>
                    <th className="py-2.5 px-3">Scaffale</th>
                    <th className="py-2.5 px-3">Categoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parsedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-100">{row.title}</td>
                      <td className="py-2 px-3 font-mono text-slate-300">{row.oem_code || '—'}</td>
                      <td className="py-2 px-3 text-amber-400 font-bold">€ {row.price.toFixed(2)}</td>
                      <td className="py-2 px-3 font-bold">{row.quantity}</td>
                      <td className="py-2 px-3 capitalize text-slate-300">{row.condition}</td>
                      <td className="py-2 px-3 text-amber-300">{row.position_note || '—'}</td>
                      <td className="py-2 px-3 text-slate-400">{row.category_name || 'Generica'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
