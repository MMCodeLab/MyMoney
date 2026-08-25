// Cloudflare Worker "proxy" per Groq AI.
//
// Perche' serve: MyMoney e' un sito statico senza backend. Una chiave API
// messa direttamente nel codice del sito e' visibile a chiunque (sia su
// GitHub, che viene scansionato automaticamente e fa revocare la chiave, sia
// nel sito pubblicato, dove basta "Ispeziona" per leggerla). Questo Worker
// gira sui server di Cloudflare, non nel browser: tiene la chiave Groq come
// "secret" lato server, mai visibile a nessuno, e fa lui le richieste a
// Groq per conto del sito.
//
// ────────────────────────────────────────────────────────────────────────
// COME PUBBLICARLO (una tantum, ~10 minuti, gratis, nessuna carta richiesta)
// ────────────────────────────────────────────────────────────────────────
// 1. Vai su https://dash.cloudflare.com e registrati (o accedi).
// 2. Nel menu a sinistra: "Workers e Pages" → "Crea" → "Crea Worker".
// 3. Dai un nome al Worker (es. "mymoney-groq-proxy") → "Esegui il deploy".
// 4. Clicca "Modifica codice" e SOSTITUISCI tutto il contenuto con questo
//    file (cloudflare-worker/groq-proxy.js), poi "Esegui il deploy" di nuovo.
// 5. Vai su "Impostazioni" del Worker → "Variabili e Secret" → "Aggiungi":
//      - Nome: GROQ_API_KEY
//      - Valore: la tua chiave Groq (creala su console.groq.com — se ne usi
//        gia' una per MySchool puoi riusare la stessa, oppure creane una
//        nuova dedicata a MyMoney, come preferisci)
//      - Tipo: Secret (cripta il valore, non piu' leggibile da nessuno)
//    Salva.
// 6. Copia l'URL del Worker (in alto, tipo
//    https://mymoney-groq-proxy.<tuo-nome>.workers.dev) e comunicalo a
//    Claude: verra' messo nel codice di MyMoney al posto della chiamata AI.
//
// Questo file NON contiene nessun segreto: puo' stare tranquillamente su
// GitHub, anche in un repository pubblico.

const ALLOWED_MODEL = 'openai/gpt-oss-120b';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Metodo non consentito, usa POST.' }, 405);
    }
    if (!env.GROQ_API_KEY) {
      return jsonResponse({ error: 'GROQ_API_KEY non configurata nei secret del Worker.' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return jsonResponse({ error: 'JSON non valido.' }, 400);
    }

    if (!Array.isArray(body.messages)) {
      return jsonResponse({ error: 'Campo "messages" mancante o non valido.' }, 400);
    }

    const payload = {
      model: ALLOWED_MODEL,
      messages: body.messages,
      seed: body.seed,
    };
    // Passthrough opzionale: usato per chiedere una risposta in JSON puro
    // (es. { "importo": 12.5, "categoria": "cibo", "data": "2026-08-26" }
    // quando si interpreta il testo di uno scontrino).
    if (body.response_format) payload.response_format = body.response_format;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await groqRes.text();
    return new Response(data, {
      status: groqRes.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  },
};
