# Installazione su server dedicato Linux

Guida per Ubuntu/Debian con systemd e Apache. Il server Arma 3 e la campagna Antistasi devono essere già funzionanti. Adatta utente, percorsi e dominio prima di eseguire i comandi. Gli esempi usano l'utente del gioco `arma` e il dominio fittizio `map.example.org`.

## 1. Preparazione sul server gioco

Scompatta il repository nella home e apri la sua directory, quella contenente README.md.

```bash
sudo apt update
sudo apt install python3 openssh-client
id arma
sudo install -d -m 755 /opt/antistasi-map
sudo cp -a exporter web systemd /opt/antistasi-map/
sudo chown -R root:root /opt/antistasi-map
sudo install -d -o arma -g arma -m 750 /opt/antistasi-map/exporter/state
```

Se il gioco usa un altro utente, sostituisci `arma` in tutti i comandi e nel servizio. Non creare un secondo utente solo per adattarti all'esempio. Individua il profilo effettivo nel percorso configurato dal parametro `-profiles` del server Arma 3.

## 2A. Server gioco e server web separati — SFTP

### Sul server web

Se hai un hosting classico, crea il sito e un account SFTP con accesso alla sola directory del sito dal pannello del provider. Riutilizza quella directory al posto di `/var/www/antistasi`. Non installare Apache sull'hosting gestito.

Per un server web dedicato nuovo:

```bash
sudo apt update
sudo apt install apache2 openssh-server
sudo adduser mapupload
sudo install -d -o mapupload -g mapupload -m 755 /var/www/antistasi
sudo install -d -o mapupload -g mapupload -m 755 /var/www/antistasi/data
```

Configura il virtual host descritto nella sezione 3 sul server web. L'account deve poter scrivere nella directory del sito. Su sistemi condivisi configura un account SFTP confinato secondo le regole del tuo amministratore/provider.

### Sul server gioco

```bash
sudo -u arma mkdir -p /home/arma/.ssh
sudo chmod 700 /home/arma/.ssh
sudo -u arma ssh-keygen -t ed25519 -f /home/arma/.ssh/antistasi_map -N ''
sudo -u arma ssh-copy-id -i /home/arma/.ssh/antistasi_map.pub mapupload@web.example.org
sudo -u arma sftp -i /home/arma/.ssh/antistasi_map mapupload@web.example.org
```

Verifica l'impronta del server tramite il provider/amministratore prima di accettarla. La prima connessione registra la chiave host per l'utente `arma`; i trasferimenti automatici rifiutano host sconosciuti o modificati. Se il provider consente solo SFTP, usa `ssh-copy-id -s` oppure il caricamento della chiave pubblica dal pannello. Non sovrascrivere una chiave già in uso. Per porte personalizzate usa `-p PORTA` con ssh-copy-id e `-P PORTA` con sftp.

Al prompt `sftp>` carica il frontend (una sola volta o quando aggiorni la grafica):

```text
cd /var/www/antistasi
mkdir data
put /opt/antistasi-map/web/index.html index.html
put /opt/antistasi-map/web/style.css style.css
put /opt/antistasi-map/web/app.js app.js
put /opt/antistasi-map/web/front.js front.js
bye
```

Se la directory `data` esiste già, salta `mkdir data`.

Su un sito già esistente salva una copia dei quattro file prima di sostituirli. Logo e altri asset personalizzati vanno caricati separatamente. Copia soltanto il contenuto di `web/`, mai la directory `exporter/`.

```bash
sudo cp /opt/antistasi-map/exporter/config.sftp.example.json /opt/antistasi-map/exporter/config.json
sudo chown root:arma /opt/antistasi-map/exporter/config.json
sudo chmod 640 /opt/antistasi-map/exporter/config.json
sudo nano /opt/antistasi-map/exporter/config.json
```

Imposta `source`, `campaign_name`, host, porta, utente, chiave e `remote_dir`. Il percorso remoto è quello visto da SFTP: con un account confinato potrebbe essere diverso dal percorso Linux del server web. Non serve aprire porte in ingresso sul server gioco per questa sincronizzazione; il server gioco avvia una connessione in uscita verso SFTP.

## 2B. Gioco e sito sullo stesso server

In alternativa alla sezione 2A:

```bash
sudo apt update
sudo apt install apache2
sudo install -d -o root -g root -m 755 /var/www/antistasi
sudo cp /opt/antistasi-map/web/index.html /opt/antistasi-map/web/style.css /opt/antistasi-map/web/app.js /opt/antistasi-map/web/front.js /var/www/antistasi/
sudo install -d -o arma -g arma -m 755 /var/www/antistasi/data
sudo cp /opt/antistasi-map/exporter/config.local.example.json /opt/antistasi-map/exporter/config.json
sudo chown root:arma /opt/antistasi-map/exporter/config.json
sudo chmod 640 /opt/antistasi-map/exporter/config.json
sudo nano /opt/antistasi-map/exporter/config.json
```

Imposta `source` e `campaign_name`; `local_dir` punta alla directory pubblica, senza aggiungere `/data`. Il file temporaneo viene creato nella stessa directory di destinazione e rinominato atomicamente. Non servono chiavi SSH, password o un server SFTP.

## 3. Apache sul server che ospita il sito

Salta questa sezione se il provider gestisce già il sito web. Crea `/etc/apache2/sites-available/antistasi-map.conf`:

```apache
<VirtualHost *:80>
    ServerName map.example.org
    DocumentRoot /var/www/antistasi
    <Directory /var/www/antistasi>
        Options -Indexes
        AllowOverride None
        Require all granted
    </Directory>
    <Directory /var/www/antistasi/data>
        <FilesMatch "^\.">
            Require all denied
        </FilesMatch>
    </Directory>
    ErrorLog ${APACHE_LOG_DIR}/antistasi-map-error.log
    CustomLog ${APACHE_LOG_DIR}/antistasi-map-access.log combined
</VirtualHost>
```

```bash
sudo a2ensite antistasi-map.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Punta il DNS del tuo dominio all'IP del server web. Consenti le porte 80/443 nel firewall del sistema e del provider mantenendo le regole di accesso amministrativo già presenti. Per un dominio pubblico con DNS corretto e porta 80 raggiungibile puoi installare HTTPS:

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d map.example.org
```

Su hosting gestito attiva invece il certificato dal pannello. In caso di CDN/cache, escludi `data/campaign.json` dalla cache. Non esporre `/opt/antistasi-map` come DocumentRoot.

## 4. Prima esportazione e pubblicazione

Esegui sul server gioco in entrambi gli scenari:

```bash
sudo -u arma test -r /srv/arma3/profiles/server/server.vars.Arma3Profile
sudo -u arma python3 /opt/antistasi-map/exporter/sync.py
sudo -u arma python3 /opt/antistasi-map/exporter/sync.py --publish
```

Adatta il percorso del primo comando al tuo `source`. Il primo avvio genera soltanto `exporter/state/campaign.json`; `--publish` lo invia o copia. Verifica sul sito il timestamp del salvataggio e della sincronizzazione. Una sincronizzazione nuova può contenere un salvataggio vecchio se la campagna non ha salvato di recente.

## 5. Aggiornamento orario con systemd

```bash
sudo cp /opt/antistasi-map/systemd/antistasi-map.service /etc/systemd/system/
sudo cp /opt/antistasi-map/systemd/antistasi-map.timer /etc/systemd/system/
```

**Solo per la modalità sullo stesso server**, aggiungi il permesso di scrittura alla directory pubblica nel sandbox systemd:

```bash
sudo mkdir -p /etc/systemd/system/antistasi-map.service.d
sudo tee /etc/systemd/system/antistasi-map.service.d/local.conf > /dev/null <<'EOF'
[Service]
ReadWritePaths=/var/www/antistasi/data
EOF
```

Se `local_dir` è diverso, modifica anche il percorso nel drop-in. Quindi, per entrambe le modalità:

```bash
sudo systemctl daemon-reload
sudo systemctl start antistasi-map.service
sudo systemctl enable --now antistasi-map.timer
systemctl list-timers antistasi-map.timer
sudo journalctl -u antistasi-map.service -n 50 --no-pager
```

La pubblicazione avviene ogni ora al minuto 05 con un ritardo casuale massimo di 30 secondi. La pagina controlla il JSON ogni minuto. Nessun riavvio di Arma 3 è necessario.

## Diagnostica e aggiornamenti

| Problema | Controllo |
| --- | --- |
| Versione diversa | Verifica formato del salvataggio e catalogo prima di modificare `expected_version` |
| Zero o più salvataggi trovati | Controlla profilo e nome esatto della campagna in `campaign_name` |
| Permesso negato sul profilo | Concedi lettura/traversal all'utente del servizio; non rendere il profilo pubblico |
| Funziona a mano ma non da timer | Verifica User/Group, ReadWritePaths e journal del servizio |
| SFTP fallisce | Prova come `arma`, con la stessa chiave, porta e directory remota |
| Punti presenti, cartografia assente | Verifica accesso alle tile Arma3Map e a unpkg dal browser |
| Dati vecchi | Confronta orario salvataggio, sincronizzazione e log del timer |

Per aggiornare: ferma `antistasi-map.timer`, attendi la fine del servizio, salva una copia di codice/configurazione/web, copia i nuovi file preservando `config.json`, `state/` e personalizzazioni. Esegui un'esportazione senza pubblicare, poi `--publish`, infine riattiva il timer. In caso di errore ripristina la copia precedente.

Questa distribuzione generica usa `/opt/antistasi-map` e il servizio `antistasi-map`: non è un aggiornamento automatico della precedente installazione `/opt/drv-altis`. Se migri un'installazione esistente, disattiva il vecchio timer soltanto quando la nuova pubblicazione è verificata, evitando due esportatori sullo stesso sito.
