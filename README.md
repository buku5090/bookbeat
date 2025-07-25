# 25 IULIE 2025 - VINERI
🎛️ Formular creare anunț
✅ Autentificare verificată: redirect automat dacă userul nu e logat.
🎭 Selectare tip anunț: ARTIST sau LOCAȚIE, cu UI animat.
🧠 Validare dinamică pe câmpuri:
announcementTitle, realName, stageName, locationName: max. 35 caractere
address: max. 50 caractere
description: max. 500 caractere, cu contor live (ex: 123/500)
capacity și budget: doar cifre (regex)
🧠 Validare globală la handleChange + frontend maxLength
📷 Limitare încărcare poze: max. 6 imagini (cu preview)
☁️ Upload imagini pe Firebase Storage
🎧 Genuri muzicale & stiluri
🎵 Selectare multiplă de genuri muzicale (max. 5), afișate ca bule interactive.
🪄 Autocomplete inteligent pentru genuri – din listă predefinită genres.js.
🧼 Poți șterge bulele prin click ✕.
🎯 Aceeași funcționalitate pentru câmpul „stiluri dorite” la locații (cu listă separată styles.js dacă dorești).
✅ Validare ca toate genurile/stilurile selectate să fie valide (inclusiv la handleSubmit).
🔍 Search și filtrare
🆕 Suport pentru @ în căutare → filtrează doar useri
🧠 Autocomplete live pentru titluri de anunțuri și utilizatori
🎨 UI responsive pentru listare rezultate
📦 Organizare & scalabilitate
📁 Mutare lista de genuri într-un fișier extern: src/data/genres.js
✅ Importabil în orice componentă
🔧 Structură ușor de extins și reutilizat pentru stiluri
