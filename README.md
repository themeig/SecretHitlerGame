# 🎩 Secret Hitler — Multi-Phone & TV Web App

> 🌐 **Live App:** [secret-hitler-pentaversion.netlify.app](https://secret-hitler-pentaversion.netlify.app/)

Web App interattiva (**React + TypeScript + Vite**) per giocare a **Secret Hitler** (5–10 giocatori) attorno a un vero tavolo usando gli smartphone sincronizzati in tempo reale o una **Smart TV**, senza bisogno del tabellone e delle carte fisiche.

---

## 📜 Cosa è e da dove viene

Ispirato al celebre gioco da tavolo di deduzione sociale **Secret Hitler** (2016) di *Max Temkin, Mike Boxleiter, Tommy Maranges* e *Mackenzie Schubert* (rilasciato in *Creative Commons CC BY-NC-SA 4.0*), ambientato nel **Reichstag di Berlino del 1932**:
- **🕊️ Liberali:** devono promulgare **5 Leggi Liberali** o giustiziare **Hitler**.
- **💀 Fascisti & Secret Hitler:** devono promulgare **6 Leggi Fasciste** o far eleggere **Hitler Cancelliere** dopo almeno 3 Leggi Fasciste.

---

## 📱 Come si gioca (Multi-Telefono o TV)

Tutti i dispositivi si collegano alla stessa partita tramite un **Codice Stanza a 4 lettere** o **QR Code** (sincronizzazione istantanea via MQTT over WebSockets):

- **📲 Telefono che Gira (`CONTROLLER`):** passa di mano in mano per aprire le Buste Segrete, nominare il Cancelliere, votare **JA! / NEIN** e scartare le leggi in segreto.
- **📱 Telefono Fisso 1 (`BOARD_LIBERAL`):** mostra la Plancia Liberale, il Mazzo/Scarti e la **Parte 1 dell'animazione** (Firma del Decreto). Durante il voto mostra entrambe le plance compatte.
- **📱 Telefono Fisso 2 (`BOARD_FASCIST`):** mostra la Plancia Fascista, le **Votazioni Live a tutto schermo** e la **Parte 2 dell'animazione** (Timbro a ceralacca + Flip 3D della carta).
- **📺 Modalità TV (`BOARD_TV`):** racchiude entrambe le plance, le votazioni e tutte le animazioni su un unico schermo.

---

## 🎬 Caratteristiche Principali

- **Animazione Legislativa 3 ➔ 2 ➔ 1 Carte & Flip 3D:** distribuzione di 3 carte coperte, scarto animato del Presidente e del Cancelliere, suspense con rullo di tamburi e battito cardiaco, firma a penna, timbro e rivelazione 3D della legge.
- **Audio & Colonna Sonora Adattiva:** musiche d'atmosfera dedicate per ogni fase (*Papers, Please*, *The Last Door OST*, *TF2 Spy Theme*, *Königgrätzer Marsch*), **2 Intro Narrate della Notte** a rotazione e urla istantanee a latenza zero per **JA!** e **NEIN!**.
- **Titoli di Coda 3D in stile Star Wars:** riepilogo finale con statistiche del Parlamento, ruoli segreti svelati, azioni e **Titoli Onorifici** assegnati a ciascun giocatore.

---

## 🚀 Avvio Rapido

```bash
npm install
npm run dev      # Avvia in locale su http://localhost:5173
npm run build    # Genera la cartella dist/ pronta per Netlify
```
