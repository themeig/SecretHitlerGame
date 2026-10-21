# 🎩 Secret Hitler — Multi-Phone & TV Companion Web App (Berlino 1932)

Un'applicazione web interattiva in **React + TypeScript + Vite** progettata per giocare a **Secret Hitler** attorno a un vero tavolo con gli amici (da **5 a 10 giocatori**), utilizzando gli smartphone come tabelloni interattivi sincronizzati in tempo reale e un telefono "che gira" per le azioni segrete, oppure un'unica schermata **Modalità TV**.

---

## 📜 Cosa è e da dove viene

### L'origine: il gioco da tavolo *Secret Hitler* (2016)
Questo progetto nasce come trasposizione digitale da tavolo di **Secret Hitler**, il celebre gioco di deduzione sociale e intrigo politico creato nel 2016 da **Max Temkin**, **Mike Boxleiter** e **Tommy Maranges** (*Goat, Wolf, & Cabbage*) con la direzione artistica originale di **Mackenzie Schubert**, rilasciato sotto licenza aperta *Creative Commons (CC BY-NC-SA 4.0)*.

Ambientato nel **Reichstag di Berlino del 1932**, in una Repubblica di Weimar fragile e sull'orlo del collasso, il gioco divide segretamente i giocatori in due fazioni:
- **🕊️ I Liberali (la maggioranza):** non conoscono i ruoli altrui e devono promulgare **5 Leggi Liberali** oppure smascherare e **giustiziare Secret Hitler**.
- **💀 I Fascisti (la minoranza infiltrata):** conoscono l'identità dei propri complici e chi è **Hitler** (mentre Hitler gioca all'oscuro e non sa chi siano i suoi alleati). Vincono promulgando **6 Leggi Fasciste** oppure facendo eleggere **Hitler come Cancelliere** dopo che almeno 3 Leggi Fasciste sono state approvate.

### Perché nasce questa Web App
L'idea del progetto è sostituire le plance, le buste, le tessere di voto e il mazzo cartaceo mantenendo però **l'esperienza fisica del gioco faccia a faccia al tavolo**, arricchendola con:
- Sincronizzazione istantanea multi-telefono via **WebSockets/MQTT** (senza bisogno di backend proprietario, compatibile al 100% con **Netlify**).
- Regia cinematografica delle sessioni legislative (carte coperte, scarti animati, firma del decreto, timbro a ceralacca e ribaltamento 3D).
- Colonna sonora adattiva per ogni fase della partita ed effetti vocali istantanei.
- Titoli di coda 3D in stile **Star Wars** a fine partita con statistiche dettagliate e medaglie per ogni giocatore.

---

## 📱 Architettura Multi-Dispositivo al Tavolo

L'app permette di collegare più dispositivi nella stessa stanza tramite un **Codice Stanza a 4 lettere** o **QR Code**:

1. **📲 Telefono che Gira (`CONTROLLER` — Pass-and-Play):**
   - Passa di mano in mano tra i giocatori.
   - Gestisce l'apertura protetta delle **Buste Segrete** iniziali (dove i Fascisti vedono direttamente il nome di Hitler e dei compagni senza rischiare di tradirsi ad occhi chiusi).
   - Permette al Candidato Presidente di nominare il Cancelliere.
   - Raccoglie il voto pubblico **JA! / NEIN** di tutti i giocatori in senso orario.
   - Gestisce in segreto lo scarto delle carte durante la **Sessione Legislativa** (Presidente pesca 3 e scarta 1 ➔ Cancelliere riceve 2 e promulga 1) e i **Poteri Esecutivi Presidenziali**.
2. **📱 Telefono Fisso 1 (`BOARD_LIBERAL` — Plancia Liberale & Mazzo):**
   - Posizionato fisso sul tavolo in orientamento orizzontale (con pulsante **⛶ Schermo Intero**).
   - Mostra la Plancia Liberale (`5 slot`), il Mazzo di Pesca, la Pila degli Scarti e il Contatore delle Elezioni Fallite (`0 ➔ 3 = Caos`).
   - Durante le **votazioni del governo**, si divide automaticamente per mostrare **entrambe le plance (Liberale + Fascista)** in formato compatto.
   - Durante la promulgazione di una legge, mostra la **Parte 1 dell'animazione** (il Decreto del Reichstag firmato a penna da Presidente e Cancelliere).
3. **📱 Telefono Fisso 2 (`BOARD_FASCIST` — Plancia Fascista & Votazioni Live):**
   - Posizionato accanto al Telefono 1 in orientamento orizzontale.
   - Mostra la Plancia Fascista (`6 slot` + icone dei Poteri Presidenziali e Zona Hitler) e la barra dei giocatori seduti al tavolo.
   - Durante le **votazioni del governo**, si trasforma nel **Tabellone Elettorale a Tutto Schermo** mostrando in diretta chi vota *JA!* e chi *NEIN*.
   - Durante la promulgazione di una legge, mostra la **Parte 2 dell'animazione** (il timbro a ceralacca *"PROMULGATA!"* e il ribaltamento 3D della carta con lo svelamento della fazione).
4. **📺 Modalità TV (`BOARD_TV` — Tutto su 1 Schermo):**
   - Pensata per collegare un PC o una Smart TV al centro della stanza: mostra contemporaneamente entrambe le plance affiancate, le votazioni in diretta, i giocatori e l'intera sequenza animata di promulgazione su un unico schermo.

---

## 🎬 Animazioni, Effetti Sonori & Colonna Sonora

- **Sequenza Legislativa 3 ➔ 2 ➔ 1 Carte Coperte:**
  1. Quando il Presidente pesca 3 carte, su entrambi gli schermi compaiono **3 carte Legge coperte** distribuite sul tavolo con suono realistico di scorrimento.
  2. Quando il Presidente ne scarta una, si vede la **1ª carta timbrata e scartata** volare via, lasciando **2 carte coperte** davanti al Cancelliere.
  3. Quando il Cancelliere effettua la scelta finale, lamusica di sottofondo si interrompe, la **2ª carta viene scartata** e rimane **1 sola carta coperta** al centro che vibra con rullo di tamburi e battito cardiaco, seguita dalla firma a penna stilografica, dal colpo di timbro a ceralacca e dal **Flip 3D a 180°** che svela **LIBERAL POLICY 🕊️** (con fanfara allegra di trombe) o **FASCIST POLICY 💀** (con il tema sinistro originale).
- **Colonna Sonora Adattiva & Intro Vocali:**
  - **2 Intro Narrate della Notte** (`intro1_sv.mp3` e `intro2_en.mp3`) che ruotano automaticamente a turno a inizio partita.
  - **Lobby & Buste Segrete:** *Papers, Please — Main Theme*.
  - **Nomina Cancelliere & Dibattito:** *An Unveiled Path* (Carlos Viola).
  - **Votazione del Governo (Ja / Nein):** *A Secret Deep Buried* (Carlos Viola) + urla istantanee a latenza zero (**"JA!"** / **"NEIN!"**) pre-decodificate in RAM tramite Web Audio API.
  - **Sessione Legislativa Segreta:** *Right Behind You* (Team Fortress 2 Spy Theme).
  - **Zona Hitler (3+ Leggi Fasciste) & Poteri Presidenziali:** *Malum in Se* (Carlos Viola).
  - **Fine Partita:** *Königgrätzer Marsch*.
- **Titoli di Coda 3D in stile Star Wars (`GameOverScreen`):**
  - A fine partita scorre un riepilogo prospettico 3D in stile *Star Wars* con il racconto della vittoria, le statistiche globali del Parlamento, i ruoli segreti svelati, le statistiche individuali di voto/governo/azioni di ogni giocatore, un **Titolo Onorifico personalizzato** (es. *Il Giustiziere del Führer*, *L'Utile Idiota del Regime*, *Il Doppiogiochista Perfetto*, *Il Signor "NEIN!"*) e la cronistoria completa turno per turno.

---

## 🚀 Avvio Rapido in Locale

### Prerequisiti
- **Node.js** (v18 o superiore)

### Installazione e Sviluppo
```bash
npm install
npm run dev
```
- Apri `http://localhost:5173/` per giocare.
- Apri `http://localhost:5173/?demo=credits` per visualizzare direttamente l'anteprima dei **Titoli di Coda 3D in stile Star Wars**.

### Test e Build di Produzione (per Netlify)
```bash
npx vitest run
npm run build
```
Il comando `npm run build` genera la cartella `dist/` completa di codice e tracce audio, pronta per essere caricata su **Netlify Drop** o distribuita automaticamente tramite collegamento GitHub su Netlify.
