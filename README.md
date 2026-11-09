# Antistasi Web Map — Altis

Mappa web della campagna Arma 3 Antistasi, aggiornata dal salvataggio del server dedicato. Mostra proprietà delle postazioni, guarnigioni, risorse e un fronte stimato. Progetto nato per la community **Drunken Reapers Veterans** e predisposto per altre community.

## Funzionalità

- Mappa Altis con colori delle tre fazioni, ricerca e filtri per categoria.
- Città, aeroporti, avamposti, risorse, fabbriche, porti, campi e posti di blocco.
- Riepilogo per categoria, soldi, risorse umane e livello addestramento.
- Aree d'influenza, fronti morbidi con tratti sfalsati e divisioni interne opzionali.
- Pubblicazione oraria, controllo dei dati dal browser ogni minuto.
- Trasferimento **SFTP tra due server** oppure pubblicazione **sullo stesso server**.
- Frontend statico: non richiede PHP, Node.js, database o build npm.

## Screenshot

[Panoramica della campagna](docs/screenshots/overview.png)

[Fronti e aree delle fazioni](docs/screenshots/frontlines.png)

[Filtri e riepilogo categorie](docs/screenshots/categories.png)

## Compatibilità e limiti

Questa versione è stata verificata su un salvataggio **Altis / Antistasi 3.11.1.6e4226d**. Il catalogo dei marker è vincolato a questa versione; altre mappe, fork e versioni richiedono una verifica del formato e dei marker. Non basta cambiare `expected_version` per garantire compatibilità.

L'esportatore legge un oggetto JSON incorporato nel file binario `server.vars.Arma3Profile`. Non modifica il salvataggio e non esegue SQF. Servono un salvataggio già creato e accesso in lettura al file da parte dell'utente `arma`.

Il fronte è una **stima geometrica**, non una meccanica ufficiale Antistasi: raggio base per categoria + 25 metri per soldato, massimo 4 km. Non considera terreno, costa, pattuglie o combattimenti in corso. Le aree possono estendersi sul mare e rimanere disconnesse. I confini seguono anche il limite verso le zone senza influenza. Risoluzione 160 metri, con raccordo delle linee; piccoli scarti dal riempimento a griglia sono possibili.

Il sito rende pubblici i dati esportati, comprese le guarnigioni. HQ disattivato per impostazione predefinita. Nomi/ID Steam e dati personali del salvataggio non vengono esportati. Non caricare mai il profilo originale nel repository o nella directory web.

## Installazione

Guida completa: **[INSTALLAZIONE.md](docs/INSTALLAZIONE.md)**.

| Scenario | Server gioco | Server web |
| --- | --- | --- |
| Due server | Legge il salvataggio, genera JSON, invia via SFTP | Serve `web/` e riceve `data/campaign.json` |
| Stesso server | Legge il salvataggio e copia atomicamente il JSON nella directory web | Apache serve la pagina e il JSON locale |

Prerequisiti: Linux con Python 3.10+, systemd, server Arma 3 già installato; OpenSSH client per SFTP. Apache o altro hosting statico per la pagina. Il browser usa Leaflet 1.9.4 da unpkg e le tile esterne di Arma3Map: serve connettività Internet.

## Personalizzazione e manutenzione

- [`docs/PERSONALIZZAZIONE.md`](docs/PERSONALIZZAZIONE.md): logo, testi, colori, alfa, raggi e screenshot.
- [`docs/GITHUB.md`](docs/GITHUB.md): pubblicazione del repository e attivazione donazioni.
- [`THIRD_PARTY.md`](THIRD_PARTY.md): provenienza dei dati e componenti esterni.
- `exporter/config.json`: configurazione privata locale, esclusa da Git.
- `web/`: unica directory destinata al server HTTP.

Per testare senza contattare un server:

```bash
python3 -m unittest discover -s tests -v
node --check web/app.js
node --check web/front.js
```

Node è usato soltanto per il controllo sintattico in sviluppo/CI, non è necessario in produzione. I test non avviano Arma 3 né provano le credenziali SFTP.

## Fonti e ringraziamenti

- [Antistasi Community](https://github.com/official-antistasi-community/A3-Antistasi): progetto di gioco e riferimento per il formato dei salvataggi; catalogo Altis basato sul commit `6e4226d`.
- [Arma3Map di jetelain](https://github.com/jetelain/Arma3Map): cartografia web, coordinate delle città e parametri di proiezione.
- [Leaflet](https://leafletjs.com/): libreria per la mappa interattiva; versione utilizzata 1.9.4.
- [Bohemia Interactive](https://www.bohemia.net/): Arma 3 e terreno Altis.
- **Drunken Reapers Veterans**, per l'idea, le prove e il feedback sul progetto.
- Sviluppo assistito da strumenti IA, con verifica dei dati e dei calcoli.

Progetto indipendente, non ufficiale e non affiliato a Bohemia Interactive o Antistasi. I diritti delle risorse di terzi restano ai rispettivi titolari.

## Offri un caffè o qualche token IA

Se il progetto ti è utile, puoi sostenere il tempo di sviluppo e i costi degli strumenti IA. Le donazioni sono volontarie e non sbloccano funzioni di gioco.

[![Offri un caffè o token IA](docs/assets/donate.svg)](https://ko-fi.com)
