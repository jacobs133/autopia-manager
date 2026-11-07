/**
 * AUTOPIA MANAGER - SERVIZIO CATALOGO RICAMBI CONSIGLIATI & GENERAZIONE BOZZE
 * 
 * Gestisce l'elenco predefinito e completamente personalizzabile dei ricambi recuperabili da un'auto demolita.
 * Le categorie e le voci personalizzate vengono salvate in modo persistente in localStorage,
 * garantendo che le modifiche del demolitore rimangano sempre disponibili tra aggiornamenti e sessioni.
 */

export interface RecommendedPartItem {
  id: string;
  name: string;
  defaultSide?: string;
  isCustom?: boolean;
}

export interface RecommendedCategoryGroup {
  id: string;
  categoryName: string;
  items: RecommendedPartItem[];
}

const STORAGE_KEY = 'autopia_recommended_parts_catalog_v2';

/**
 * Elenco predefinito esaustivo organizzato per le categorie standard richieste:
 * Carrozzeria, Meccanica, Elettronica, Interni, Illuminazione.
 */
export const DEFAULT_RECOMMENDED_CATEGORIES: RecommendedCategoryGroup[] = [
  {
    id: 'cat-carrozzeria',
    categoryName: 'Carrozzeria',
    items: [
      { id: 'c-1', name: 'Paraurti anteriore', defaultSide: 'Anteriore' },
      { id: 'c-2', name: 'Paraurti posteriore', defaultSide: 'Posteriore' },
      { id: 'c-3', name: 'Cofano anteriore', defaultSide: 'Anteriore' },
      { id: 'c-4', name: 'Portiera anteriore destra', defaultSide: 'Anteriore Destro (DX)' },
      { id: 'c-5', name: 'Portiera anteriore sinistra', defaultSide: 'Anteriore Sinistro (SX)' },
      { id: 'c-6', name: 'Portiera posteriore destra', defaultSide: 'Posteriore Destro (DX)' },
      { id: 'c-7', name: 'Portiera posteriore sinistra', defaultSide: 'Posteriore Sinistro (SX)' },
      { id: 'c-8', name: 'Parafango anteriore destro', defaultSide: 'Anteriore Destro (DX)' },
      { id: 'c-9', name: 'Parafango anteriore sinistro', defaultSide: 'Anteriore Sinistro (SX)' },
      { id: 'c-10', name: 'Portellone posteriore / Baule', defaultSide: 'Posteriore' },
      { id: 'c-11', name: 'Calandra / Griglia anteriore', defaultSide: 'Anteriore' },
      { id: 'c-12', name: 'Specchietto retrovisore destro', defaultSide: 'Anteriore Destro (DX)' },
      { id: 'c-13', name: 'Specchietto retrovisore sinistro', defaultSide: 'Anteriore Sinistro (SX)' },
      { id: 'c-14', name: 'Cristallo anteriore (Parabrezza)', defaultSide: 'Anteriore' },
      { id: 'c-15', name: 'Lunotto posteriore termico', defaultSide: 'Posteriore' },
      { id: 'c-16', name: 'Traversa anteriore batticofano', defaultSide: 'Anteriore' },
    ],
  },
  {
    id: 'cat-meccanica',
    categoryName: 'Meccanica',
    items: [
      { id: 'm-1', name: 'Motore completo', defaultSide: 'Centrale / Universale' },
      { id: 'm-2', name: 'Cambio manuale / automatico', defaultSide: 'Centrale / Universale' },
      { id: 'm-3', name: 'Alternatore', defaultSide: 'Centrale / Universale' },
      { id: 'm-4', name: 'Motorino di avviamento', defaultSide: 'Centrale / Universale' },
      { id: 'm-5', name: 'Turbina / Turbocompressore', defaultSide: 'Centrale / Universale' },
      { id: 'm-6', name: 'Compressore aria condizionata (A/C)', defaultSide: 'Centrale / Universale' },
      { id: 'm-7', name: 'Radiatore acqua raffreddamento', defaultSide: 'Anteriore' },
      { id: 'm-8', name: 'Radiatore intercooler', defaultSide: 'Anteriore' },
      { id: 'm-9', name: 'Pompa iniezione alta pressione', defaultSide: 'Centrale / Universale' },
      { id: 'm-10', name: 'Scatola guida / Servosterzo', defaultSide: 'Anteriore' },
      { id: 'm-11', name: 'Semiasse anteriore destro', defaultSide: 'Anteriore Destro (DX)' },
      { id: 'm-12', name: 'Semiasse anteriore sinistro', defaultSide: 'Anteriore Sinistro (SX)' },
      { id: 'm-13', name: 'Coppia ammortizzatori anteriori', defaultSide: 'Anteriore' },
      { id: 'm-14', name: 'Coppia ammortizzatori posteriori', defaultSide: 'Posteriore' },
      { id: 'm-15', name: 'Pinze freno anteriori', defaultSide: 'Anteriore' },
      { id: 'm-16', name: 'Pompa carburante serbatoio', defaultSide: 'Posteriore' },
      { id: 'm-17', name: 'Valvola EGR', defaultSide: 'Centrale / Universale' },
    ],
  },
  {
    id: 'cat-elettronica',
    categoryName: 'Elettronica',
    items: [
      { id: 'e-1', name: 'Centralina motore (ECU)', defaultSide: 'Centrale / Universale' },
      { id: 'e-2', name: 'Centralina ABS / ESP', defaultSide: 'Centrale / Universale' },
      { id: 'e-3', name: 'Quadro strumenti (Tachimetro)', defaultSide: 'Anteriore' },
      { id: 'e-4', name: 'Autoradio / Navigatore satellitare', defaultSide: 'Anteriore' },
      { id: 'e-5', name: 'Display centrale multifunzione', defaultSide: 'Anteriore' },
      { id: 'e-6', name: 'Devioguida / Blocco comandi volante', defaultSide: 'Anteriore' },
      { id: 'e-7', name: 'Body computer / Centralina comfort (BSI)', defaultSide: 'Centrale / Universale' },
      { id: 'e-8', name: 'Motorino tergicristallo anteriore', defaultSide: 'Anteriore' },
      { id: 'e-9', name: 'Sensore debimetro / Flusso aria', defaultSide: 'Centrale / Universale' },
      { id: 'e-10', name: 'Sonda lambda', defaultSide: 'Centrale / Universale' },
    ],
  },
  {
    id: 'cat-interni',
    categoryName: 'Interni',
    items: [
      { id: 'i-1', name: 'Set sedili completi (anteriori + posteriori)', defaultSide: 'Centrale / Universale' },
      { id: 'i-2', name: 'Volante in pelle / multifunzione', defaultSide: 'Anteriore' },
      { id: 'i-3', name: 'Cruscotto / Plancia completa', defaultSide: 'Anteriore' },
      { id: 'i-4', name: 'Kit Airbag completo (volante, passeggero, centralina)', defaultSide: 'Anteriore' },
      { id: 'i-5', name: 'Set cinture di sicurezza anteriori e posteriori', defaultSide: 'Centrale / Universale' },
      { id: 'i-6', name: 'Pannelli porta (set 4 pezzi)', defaultSide: 'Centrale / Universale' },
      { id: 'i-7', name: 'Tunnel centrale con bracciolo', defaultSide: 'Centrale / Universale' },
      { id: 'i-8', name: 'Cappelliera / Tendalino bagagliaio', defaultSide: 'Posteriore' },
      { id: 'i-9', name: 'Alette parasole (coppia)', defaultSide: 'Anteriore' },
      { id: 'i-10', name: 'Pulsantiera alzacristalli lato guida', defaultSide: 'Anteriore Sinistro (SX)' },
    ],
  },
  {
    id: 'cat-illuminazione',
    categoryName: 'Illuminazione',
    items: [
      { id: 'l-1', name: 'Faro anteriore destro', defaultSide: 'Anteriore Destro (DX)' },
      { id: 'l-2', name: 'Faro anteriore sinistro', defaultSide: 'Anteriore Sinistro (SX)' },
      { id: 'l-3', name: 'Fanale posteriore destro', defaultSide: 'Posteriore Destro (DX)' },
      { id: 'l-4', name: 'Fanale posteriore sinistro', defaultSide: 'Posteriore Sinistro (SX)' },
      { id: 'l-5', name: 'Fendinebbia anteriore destro', defaultSide: 'Anteriore Destro (DX)' },
      { id: 'l-6', name: 'Fendinebbia anteriore sinistro', defaultSide: 'Anteriore Sinistro (SX)' },
      { id: 'l-7', name: 'Terzo stop a LED', defaultSide: 'Posteriore' },
      { id: 'l-8', name: 'Frecce laterali specchietto (coppia)', defaultSide: 'Centrale / Universale' },
    ],
  },
];

/**
 * Carica l'elenco delle categorie e ricambi consigliati salvato in localStorage,
 * con fallback sui valori predefiniti in caso di primo avvio.
 */
export function getRecommendedPartsCatalog(): RecommendedCategoryGroup[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_RECOMMENDED_CATEGORIES;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveRecommendedPartsCatalog(DEFAULT_RECOMMENDED_CATEGORIES);
      return DEFAULT_RECOMMENDED_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (e) {
    console.warn('[recommendedPartsService] Errore lettura catalogo consigliato da localStorage:', e);
  }

  return DEFAULT_RECOMMENDED_CATEGORIES;
}

/**
 * Salva in modo permanente l'elenco personalizzato in localStorage.
 */
export function saveRecommendedPartsCatalog(catalog: RecommendedCategoryGroup[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch (e) {
    console.error('[recommendedPartsService] Impossibile salvare catalogo in localStorage:', e);
  }
}

/**
 * Ripristina l'elenco originale di fabbrica.
 */
export function resetRecommendedPartsCatalogToDefault(): RecommendedCategoryGroup[] {
  saveRecommendedPartsCatalog(DEFAULT_RECOMMENDED_CATEGORIES);
  return DEFAULT_RECOMMENDED_CATEGORIES;
}

/**
 * Aggiunge un nuovo ricambio a una categoria esistente.
 */
export function addPartToCategory(
  categoryId: string,
  partName: string,
  defaultSide?: string
): RecommendedCategoryGroup[] {
  const current = getRecommendedPartsCatalog();
  const cleanName = partName.trim();
  if (!cleanName) return current;

  const targetCategory = current.find((c) => c.id === categoryId);
  if (targetCategory) {
    const newItem: RecommendedPartItem = {
      id: `custom-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      defaultSide: defaultSide || detectSideFromName(cleanName) || 'Centrale / Universale',
      isCustom: true,
    };
    targetCategory.items.push(newItem);
    saveRecommendedPartsCatalog(current);
  }
  return current;
}

/**
 * Rinomina un ricambio esistente.
 */
export function updatePartName(
  itemId: string,
  newName: string
): RecommendedCategoryGroup[] {
  const current = getRecommendedPartsCatalog();
  const clean = newName.trim();
  if (!clean) return current;

  for (const cat of current) {
    const item = cat.items.find((i) => i.id === itemId);
    if (item) {
      item.name = clean;
      item.defaultSide = detectSideFromName(clean) || item.defaultSide;
      break;
    }
  }
  saveRecommendedPartsCatalog(current);
  return current;
}

/**
 * Rimuove un ricambio da una categoria.
 */
export function removePartFromCategory(itemId: string): RecommendedCategoryGroup[] {
  const current = getRecommendedPartsCatalog();
  for (const cat of current) {
    cat.items = cat.items.filter((i) => i.id !== itemId);
  }
  saveRecommendedPartsCatalog(current);
  return current;
}

/**
 * Aggiunge una nuova categoria personalizzata.
 */
export function addNewCategory(categoryName: string): RecommendedCategoryGroup[] {
  const current = getRecommendedPartsCatalog();
  const clean = categoryName.trim();
  if (!clean) return current;

  const existing = current.find((c) => c.categoryName.toLowerCase() === clean.toLowerCase());
  if (existing) return current;

  const newCat: RecommendedCategoryGroup = {
    id: `cat-custom-${Date.now()}`,
    categoryName: clean,
    items: [],
  };
  current.push(newCat);
  saveRecommendedPartsCatalog(current);
  return current;
}

/**
 * Rimuove una categoria personalizzata.
 */
export function removeCategory(categoryId: string): RecommendedCategoryGroup[] {
  let current = getRecommendedPartsCatalog();
  current = current.filter((c) => c.id !== categoryId);
  saveRecommendedPartsCatalog(current);
  return current;
}

/**
 * Riconosce automaticamente il lato (destro/sinistro/anteriore/posteriore)
 * a partire dal nome dell'articolo.
 */
export function detectSideFromName(name: string): string | null {
  const n = name.toLowerCase();

  const isAnt = n.includes('anteriore') || n.includes('ant.');
  const isPost = n.includes('posteriore') || n.includes('post.');
  const isDx = n.includes('destr') || n.includes('dx');
  const isSx = n.includes('sinistr') || n.includes('sx');

  if (isAnt && isDx) return 'Anteriore Destro (DX)';
  if (isAnt && isSx) return 'Anteriore Sinistro (SX)';
  if (isPost && isDx) return 'Posteriore Destro (DX)';
  if (isPost && isSx) return 'Posteriore Sinistro (SX)';

  if (isDx) return 'Anteriore Destro (DX)';
  if (isSx) return 'Anteriore Sinistro (SX)';
  if (isAnt) return 'Anteriore';
  if (isPost) return 'Posteriore';

  return 'Centrale / Universale';
}

export interface VehicleIdentificationData {
  make: string;
  model: string;
  version?: string | null;
  generation?: string | null;
  engine?: string | null;
  fuel_type?: string | null;
  power?: string | null;
  year?: number | string | null;
  plate?: string | null;
  vin?: string | null;
  mileage?: string | number | null;
  oem_code?: string | null;
  displacement?: string | null;
}

/**
 * Genera automaticamente una descrizione leggibile, fluida e professionale
 * specifica per il ricambio e il veicolo di appartenenza.
 * 
 * Esempio:
 * "Portiera anteriore destra per Volkswagen Golf 7, motorizzazione 2.0 TDI, anno 2016. Ricambio originale usato proveniente da veicolo demolito."
 */
export function generateSmartPartDescription(
  partName: string,
  vehicle?: Partial<VehicleIdentificationData> | null
): string {
  const cleanPart = partName.trim();
  const make = vehicle?.make?.trim() || '';
  const model = vehicle?.model?.trim() || '';
  const version = vehicle?.version?.trim() || '';
  const engine = vehicle?.engine?.trim() || '';
  const fuel = vehicle?.fuel_type?.trim() || '';
  const power = vehicle?.power?.trim() || '';
  const year = vehicle?.year ? String(vehicle.year).trim() : '';

  // 1. Frase principale contestuale
  let mainLine = make && model ? `${cleanPart} per ${make} ${model}` : cleanPart;
  if (version && !mainLine.toLowerCase().includes(version.toLowerCase())) {
    mainLine += ` ${version}`;
  }

  const specs: string[] = [];
  if (engine) specs.push(`motorizzazione ${engine}`);
  if (fuel && !engine.toLowerCase().includes(fuel.toLowerCase())) specs.push(`alimentazione ${fuel}`);
  if (power) specs.push(`potenza ${power}`);
  if (year) specs.push(`anno ${year}`);

  if (specs.length > 0) {
    mainLine += `, ${specs.join(', ')}.`;
  } else {
    mainLine += '.';
  }

  // 2. Paragrafo descrittivo dello stato e provenienza
  const originLine = 'Ricambio originale usato accuratamente controllato e recuperato da veicolo destinato a demolizione.';
  
  // 3. Informazioni tecniche di verifica montaggio
  const technicalLine = 'Stato del componente: Integrità strutturale e meccanica verificata prima dello smontaggio. Per garantire la perfetta compatibilità sul vostro veicolo si raccomanda di confrontare forma, attacchi fisici e codici di riferimento con il ricambio da sostituire.';

  return `${mainLine} ${originLine}\n\n${technicalLine}`;
}
