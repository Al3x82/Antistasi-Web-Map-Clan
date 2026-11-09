# Personalizzazione

## Logo e testi

Modifica `web/index.html`: sostituisci ANTISTASI WEB MAP con il nome della community. Per il logo inserisci nella `.badge`:

```html
<img class="drv-logo" src="logo.png" alt="Logo della community">
```

Carica `logo.png` accanto all'HTML e aggiungi **fuori dal blocco @media**, in fondo a `style.css`:

```css
.brand .badge { display:flex; align-items:center; justify-content:center; padding:6px; }
.brand .badge .drv-logo { display:block; width:30px; height:30px; object-fit:contain; }
```

## Fronti e colori

In `front.js`, funzione `drawFront`, `opacity` regola l'alfa (0–1), `weight` lo spessore. Valori iniziali: 0.45, linea 1.5 px e tratti 1 px. In `staggeredTicks`, i tratti alternano lato ogni 11 pixel e sono lunghi 7 pixel. Le divisioni interne usano `dashArray:'7 7'`. I colori delle fazioni sono in `app.js`, oggetto `sides`; il riempimento delle aree usa opacità 0.24 in `front.js`.

Le aree sono indipendenti dalla ricerca e dai filtri dei punti. Nascondere una fazione non trasferisce il suo territorio alle altre. Il fronte ha un interruttore indipendente.

## Raggi

Aggiungi o modifica `front` in `exporter/config.json` senza cancellare le altre proprietà:

```json
"front": {
  "meters_per_soldier": 25,
  "max_radius_m": 4000,
  "base_m": {"city": 900, "outpost": 1200, "roadblock": 350}
}
```

Basi predefinite in metri: città 900, avamposto 1200, aeroporto 2200, risorse 800, fabbrica 1000, porto 1300, HQ 1000, avamposto ribelle 700, posto di blocco 350, campo 500. Dato guarnigione assente: solo base. Sito distrutto: raggio zero. `publish_hq` abilita o esclude l'HQ; non nasconde automaticamente gli altri avamposti ribelli.

## Applicare le modifiche

HTML/CSS/JS: carica i file aggiornati sul web server e ricarica con Ctrl+F5. Per aggiornamenti destinati a tutti i visitatori modifica anche la query dei riferimenti HTML, per esempio `front.js?v=2`. Configurazione raggi: esegui `sudo systemctl start antistasi-map.service`. Conserva le personalizzazioni nella tua copia di lavoro prima di aggiornare il codice.
