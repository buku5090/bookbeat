## 📣 BookBeat Platform – README

### 🔍 Descriere
Aplicație web care conectează artiști (DJ, trupe, etc.) cu locații (cluburi, puburi, cafenele) printr-un sistem de anunțuri și profiluri publice. Include autentificare, sistem de rating, upload poze, genuri muzicale și multe funcționalități moderne.

---

## 🔄 Update 2025-08-05 – Profil user & Avatar Crop

### 👤 Pagina de profil (artist / locație)

- 🧠 Detectare automată dacă **profilul este complet**:
  - ✅ Notificare verde dacă toate câmpurile sunt completate
  - ⚠️ Notificare galbenă altfel (cu progres %)
- ✏️ Editare câmpuri:
  - Nume de scenă / locație
  - Nume real (italic, gri)
  - Bio
  - Tarif (cu opțiune „Gratis”)
  - Unde a pus muzică, lucrări, etc.
- 🔒 Confirmare modificare prin **modal modern**

### 🖼️ Upload și crop avatar

- ✅ Inel de progres SVG colorat dinamic
- ✅ Preview imagine
- ✅ Crop cu zoom și mutare (1:1)
- ☁️ Upload imagine finală direct în Firebase

---

## 🔄 Update 2025-07-25 – Formular creare anunț

### 🎛️ Formulare avansate

- Validare dinamică pentru:
  - Titluri (max. 35 caractere)
  - Adrese (max. 50)
  - Descrieri (max. 500)
  - Cifre only pentru capacitate/buget
- Upload imagini cu preview (max. 6)

---

## 🎧 Genuri muzicale

- Selectare genuri (max. 5)
- Autocomplete din `genres.js`
- UI tip „bule” interactive ✕
- Validare globală

---

## 🔍 Căutare

- Căutare live cu autocomplete
- Suport pentru `@user`
- Responsive + performant

---

## ⚙️ Tehnologii

- React 18
- Firebase (Auth, Firestore, Storage)
- TailwindCSS
- react-easy-crop

---

## 🧪 Setup local

```bash
git clone https://github.com/username/bookbeat.git
cd bookbeat
npm install
npm run dev
