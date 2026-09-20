# MyMoney

<p align="center">
  <img src="icons/icon-512.png" width="160" alt="MyMoney">
</p>

<h3 align="center">Il tuo portafoglio digitale.</h3>

<p align="center">
  Tieni traccia di entrate e uscite, tutto salvato sul tuo dispositivo.
</p>

---

## Cos'è

**MyMoney** è una Progressive Web App (PWA) personale per tenere sotto controllo le proprie finanze quotidiane: entrate, uscite e categorie di spesa, in un'interfaccia semplice e veloce da usare ogni giorno.

## Funzionalità principali

- Registrazione rapida di **entrate e uscite**, suddivise per categoria.
- Riepilogo con **grafici** di entrate/uscite e andamento delle spese giornaliere.
- **Movimenti ricorrenti** (ogni giorno, mese o anno) generati da soli all'avvio.
- **Budget mensile per categoria**, con riepilogo di settimana e di mese.
- **Riepilogo abbonamenti**: costo totale al mese, proiezione su un anno, elenco
  dal piu' caro al piu' economico con carta e data del prossimo addebito, e quanto
  pesano sulle entrate medie degli ultimi tre mesi. Trova anche gli *abbonamenti
  sospetti* (stesso importo e stessa nota per almeno tre mesi, ma senza una regola
  ricorrente) e propone di trasformarli in regola con un pulsante.
- **Logo di ogni carta**: dal nome scritto ("Visa Revolut", "la mia postepay"...)
  viene riconosciuto il marchio e disegnato un badge col suo colore. I loghi sono
  SVG disegnati a mano, non immagini scaricate: niente marchi registrati e nessuna
  dipendenza dalla rete.
- **Conversione valuta** integrata, tramite API di cambio gratuita e senza chiave.
- **Backup completo** in JSON: non solo i movimenti, ma anche carte, budget,
  obiettivo di risparmio, movimenti ricorrenti e stato del riepilogo. L'importazione
  legge ancora i backup vecchi, quelli col solo elenco dei movimenti.
- **Conferma prima di eliminare**: togliere una carta o interrompere una
  ricorrenza passa da un foglio di conferma, come cancellare un movimento.
- Installabile come app, con funzionamento offline.

## Privacy e dati

- Nessuna registrazione, nessun account.
- Nessun tracciamento e nessuna raccolta dati personali.
- Tutti i movimenti restano sul dispositivo, salvati in `localStorage`.
- Esportazione manuale in JSON, sempre sotto il tuo controllo: il file contiene tutto quello che serve a rimettere in piedi l'app su un altro telefono.

## Tecnologie

- HTML5, CSS3, JavaScript
- `localStorage` per la persistenza dei dati
- Progressive Web App: manifest + service worker per l'installazione e l'uso offline
- [Frankfurter API](https://www.frankfurter.app/) per il cambio valuta in tempo reale (gratuita, senza chiave)

## Come avviarla in locale

Apri `index.html` con doppio click, oppure servilo con un qualsiasi server statico locale (es. estensione "Live Server" di VS Code) per abilitare l'installazione come PWA e il funzionamento offline via service worker.

## Struttura del progetto

```
index.html              punto di ingresso e logica dell'app
style.css               design system e temi
js/card-brands.js       marchi delle carte e badge SVG disegnati a mano
js/pwa-shell.js         guscio comune (service worker, avvisi, backup)
service-worker.js       service worker (funzionamento offline)
manifest.json           manifest PWA (nome, icone, colori)
icons/                  icone PWA
```

---

Fa parte della famiglia di app **My**, insieme a MyVerse, MyGym, MySchool e MySite.
