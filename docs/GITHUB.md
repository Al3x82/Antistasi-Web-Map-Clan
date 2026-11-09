# Preparazione e caricamento su GitHub

1. Scompatta il pacchetto e usa il contenuto di `antistasi-web-map` come radice del repository.
2. Inserisci screenshot e collega il tuo account donazioni.
3. Scegli la licenza per il codice originale e aggiungi un file LICENSE appropriato. Non estenderla automaticamente a cartografia o dati di terzi.
4. Controlla i file che stai per pubblicare. Le configurazioni d'esempio contengono solo valori fittizi; `config.json`, salvataggi, chiavi e stato generato sono ignorati da Git.

Da terminale nella directory del progetto:

```bash
git init -b main
git add .
git status --short
git diff --cached --stat
git commit -m "Initial release: Antistasi Altis web map"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Crea prima un repository vuoto su GitHub e sostituisci i due segnaposto. In alternativa usa l'interfaccia Upload files; includi anche `.gitignore` e `.github/`, che alcuni file manager nascondono. Non caricare lo ZIP come unico file del repository.

GitHub Pages può servire file statici, ma non esegue l'esportatore Python e non accetta questo caricamento SFTP: gli scenari documentati usano il tuo server web o hosting.

La CI esegue test Python e controlli sintattici JavaScript; non contatta il tuo server. Non mettere chiavi SSH in Git per far funzionare la CI.
