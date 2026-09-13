// Loghi dei marchi delle carte. Script classico (niente moduli ES, come tutto
// il resto dell'app): espone window.CardBrands.
//
// I loghi ufficiali NON si scaricano da internet, di proposito: sono marchi
// registrati, e un'immagine remota sparirebbe proprio quando serve di piu',
// cioe' con l'app aperta offline. Qui ogni marchio e' disegnato a mano in SVG
// inline — un badge quadrato con gli angoli stondati, il colore del marchio e
// una sigla breve — nello stesso stile delle icone gia' presenti in ICONS.
(function(){
  "use strict";

  // L'ordine conta: brandFor() torna il PRIMO marchio che combacia, quindi i
  // nomi delle banche e delle app stanno prima dei circuiti di pagamento.
  // "Visa Revolut" e' una carta Revolut che viaggia sul circuito Visa, e chi
  // la scrive cosi' si aspetta di vedere Revolut.
  var BRANDS = [
    { id:"satispay",   label:"Satispay",         keywords:["satispay"],                         bg:"#F94B4B", fg:"#ffffff", short:"S"   },
    { id:"revolut",    label:"Revolut",          keywords:["revolut"],                          bg:"#0666EB", fg:"#ffffff", short:"R"   },
    { id:"postepay",   label:"Postepay",         keywords:["postepay","posteitaliane","poste"], bg:"#FFCC00", fg:"#003A70", short:"P"   },
    { id:"paypal",     label:"PayPal",           keywords:["paypal"],                           bg:"#003087", fg:"#ffffff", short:"PP"  },
    { id:"hype",       label:"Hype",             keywords:["hype"],                             bg:"#00D084", fg:"#ffffff", short:"H"   },
    { id:"n26",        label:"N26",              keywords:["n26"],                              bg:"#36A18B", fg:"#ffffff", short:"N26" },
    { id:"intesa",     label:"Intesa Sanpaolo",  keywords:["intesa","sanpaolo","isybank"],      bg:"#007A53", fg:"#ffffff", short:"IS"  },
    { id:"unicredit",  label:"UniCredit",        keywords:["unicredit"],                        bg:"#E2001A", fg:"#ffffff", short:"UC"  },
    { id:"bper",       label:"BPER",             keywords:["bper"],                             bg:"#009E9F", fg:"#ffffff", short:"BP"  },
    { id:"illimity",   label:"illimity",         keywords:["illimity"],                         bg:"#E5007D", fg:"#ffffff", short:"IL"  },
    { id:"tinaba",     label:"Tinaba",           keywords:["tinaba"],                           bg:"#1BB3A4", fg:"#ffffff", short:"TN"  },
    { id:"applepay",   label:"Apple Pay",        keywords:["applepay","apple"],                 bg:"#111114", fg:"#ffffff", short:"AP"  },
    { id:"googlepay",  label:"Google Pay",       keywords:["googlepay","gpay","google"],        bg:"#4285F4", fg:"#ffffff", short:"GP"  },
    { id:"amex",       label:"American Express", keywords:["americanexpress","amex"],           bg:"#2E77BC", fg:"#ffffff", short:"AX"  },
    { id:"bancomat",   label:"PagoBancomat",     keywords:["pagobancomat","bancomat"],          bg:"#00A0DF", fg:"#ffffff", short:"B"   },
    { id:"mastercard", label:"Mastercard",       keywords:["mastercard","maestro"],             bg:"#16181D", fg:"#ffffff", short:"MC", shape:"mastercard" },
    { id:"visa",       label:"Visa",             keywords:["visa"],                             bg:"#1A1F71", fg:"#ffffff", short:"V",  shape:"visa" },
    { id:"contanti",   label:"Contanti",         keywords:["contanti","cash","liquidi"],        bg:"#34C759", fg:"#ffffff", short:"€" }
  ];

  // Tavolozza del marchio neutro: sono i colori che l'app usa gia' per le
  // categorie, cosi' una carta sconosciuta non stona con il resto.
  var FALLBACK_COLORS = ["#007AFF","#5856D6","#AF52DE","#FF2D55","#FF9500","#5AC8FA","#34C759","#8E8E93"];

  // I segni diacritici che NFD stacca dalle lettere (la coda di "è" dopo la
  // "e"). Scritti come codici invece che come caratteri veri: sono invisibili,
  // e in mezzo al codice sarebbero illeggibili e facili da perdere.
  var COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

  // Minuscolo, senza accenti, senza spazi ne' punteggiatura: cosi' "La mia
  // PostePay", "poste-pay" e "POSTEPAY" finiscono tutti sulla stessa stringa.
  function normalize(name){
    var s = String(name == null ? "" : name);
    if(s.normalize) s = s.normalize("NFD").replace(COMBINING_MARKS, "");
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Le iniziali delle parole del nome ("Carta di Matteo" -> "CD"), usate sia
  // come sigla sia come seme del colore del marchio neutro.
  function initialsOf(name){
    var words = String(name == null ? "" : name).trim().split(/\s+/).filter(Boolean);
    if(!words.length) return "?";
    var letters = words.map(function(w){
      var n = normalize(w);
      return n ? n.charAt(0).toUpperCase() : "";
    }).join("");
    return (letters || "?").slice(0, 2);
  }

  // Colore ricavato dalle iniziali: stesso nome, stesso colore a ogni apertura.
  function colorFromInitials(initials){
    var sum = 0;
    for(var i=0; i<initials.length; i++) sum += initials.charCodeAt(i) * (i+1);
    return FALLBACK_COLORS[sum % FALLBACK_COLORS.length];
  }

  function brandFor(name){
    var key = normalize(name);
    if(key){
      for(var i=0; i<BRANDS.length; i++){
        var brand = BRANDS[i];
        for(var k=0; k<brand.keywords.length; k++){
          if(key.indexOf(brand.keywords[k]) !== -1) return brand;
        }
      }
    }
    var initials = initialsOf(name);
    return {
      id: "generico",
      label: String(name || "Carta"),
      bg: colorFromInitials(initials),
      fg: "#ffffff",
      short: initials,
      shape: "generic"
    };
  }

  function escapeAttr(s){
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Le sigle lunghe devono rimpicciolirsi, altrimenti "N26" esce dal quadrato.
  function fontSizeFor(short){
    var len = String(short || "").length;
    if(len <= 1) return 16;
    if(len === 2) return 13;
    return 10.5;
  }

  function glyphFor(brand){
    // Mastercard: due cerchi sovrapposti disegnati da me. E' la forma piu'
    // semplice che richiama il circuito senza riprodurre il logo registrato.
    if(brand.shape === "mastercard"){
      return '<circle cx="13" cy="16" r="7.2" fill="#EB001B"></circle>' +
             '<circle cx="19" cy="16" r="7.2" fill="#F79E1B" fill-opacity="0.82"></circle>';
    }
    // Visa: una "V" piena e la riga dorata sotto, anche queste disegnate da me.
    if(brand.shape === "visa"){
      return '<path d="M8 8h4.6l3.4 9.8L19.4 8H24l-5.8 15h-4.4L8 8z" fill="#ffffff"></path>' +
             '<rect x="8" y="25" width="16" height="2.4" rx="1.2" fill="#F7B600"></rect>';
    }
    // Marchio sconosciuto: la stessa icona generica usata finora per le carte
    // (ICONS.card), ridisegnata dentro il quadrato colorato.
    if(brand.shape === "generic"){
      return '<g transform="translate(6,6) scale(0.833)" fill="none" stroke="' + brand.fg +
             '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
             '<rect x="2" y="5" width="20" height="14" rx="2"></rect>' +
             '<line x1="2" y1="10" x2="22" y2="10"></line></g>';
    }
    // dy=".36em" invece di dominant-baseline: centra la sigla anche sui WebKit
    // piu' vecchi, dove dominant-baseline viene ignorato.
    return '<text x="16" y="16" dy=".36em" text-anchor="middle" fill="' + brand.fg +
           '" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"' +
           ' font-size="' + fontSizeFor(brand.short) + '" font-weight="700">' +
           escapeAttr(brand.short) + '</text>';
  }

  // Il badge pronto da incollare nell'HTML. `size` e' il lato in pixel.
  function badge(name, size){
    var brand = brandFor(name);
    var side = size || 30;
    return '<svg class="card-brand-badge" viewBox="0 0 32 32" width="' + side + '" height="' + side +
           '" role="img" aria-label="' + escapeAttr(brand.label) + '">' +
           '<rect x="0" y="0" width="32" height="32" rx="8" fill="' + brand.bg + '"></rect>' +
           glyphFor(brand) + '</svg>';
  }

  window.CardBrands = { brandFor: brandFor, badge: badge, BRANDS: BRANDS };
})();
