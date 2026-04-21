import 'dotenv/config';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

if (!STRAPI_TOKEN) {
  console.error('❌ ERRO: STRAPI_API_TOKEN não está definido. A operação foi abortada.');
  process.exit(1);
}

async function fetchPage(endpoint, page) {
  const res = await fetch(`${STRAPI_URL}/api${endpoint}?pagination[page]=${page}&pagination[pageSize]=100`, {
    headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Falha no GET ${endpoint}: ${res.status}`);
  return res.json();
}

async function markAsUntrusted(endpoint, id, reason) {
  const res = await fetch(`${STRAPI_URL}/api${endpoint}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({
      data: {
        legacyUntrusted: true,
        invalidationReason: reason,
        updatedAt: new Date().toISOString()
      }
    })
  });
  if (!res.ok) throw new Error(`Falha no PUT ${endpoint}/${id}: ${res.status}`);
  return res.json();
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function sanitizeSimulations() {
  console.log('--- Iniciando Purga de Simulações (Scores Cliente-Side) ---');
  let page = 1;
  let totalPurged = 0;

  while (true) {
    console.log(`Buscando página ${page}...`);
    const json = await fetchPage('/tentativas', page);
    const records = json.data;
    
    if (!records || records.length === 0) break;

    for (const record of records) {
      // Regra E2E Canónica: Se não tem metadados G15 (Hesitation Index), o score é legacy/untrusted.
      const lacksMetadata = !record.metadata || record.metadata.hesitationIndex === undefined;
      
      if (lacksMetadata) {
        try {
          await markAsUntrusted('/tentativas', record.documentId || record.id, 'Saneamento G15: Ausência de DNA Biomecânico');
          totalPurged++;
          console.log(`✅ Registo ${record.id} marcado como Untrusted.`);
          await delay(100); // Rate Limiting (10 requests por segundo máx) para proteger a BD Neon e o Strapi.
        } catch (err) {
          console.error(`❌ Falha ao purgar ${record.id}:`, err.message);
        }
      }
    }
    
    if (page >= json.meta.pagination.pageCount) break;
    page++;
    await delay(500); // Pausa entre páginas
  }
  
  console.log(`--- Purga de Simulações Concluída. Total: ${totalPurged} registos invalidados. ---`);
}

async function run() {
  try {
    await sanitizeSimulations();
    // Outros métodos de purga (ex: feed-entries antigas) podem ser adicionados aqui
    console.log('✅ Saneamento Soberano Concluído.');
  } catch (err) {
    console.error('❌ Falha Crítica no Saneamento:', err);
    process.exit(1);
  }
}

run();
