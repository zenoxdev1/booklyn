# Booklyn on Google Play: listing kit

Use this while filling Play Console. Texts are ready to paste. Check every claim still matches the app before you submit.

## Basics
- App name: Booklyn (max 30 characters)
- Category: Education. Tags: study tools, productivity
- Contact email: tugesautomations@gmail.com (public on the store page)
- Privacy policy URL: https://booklyn.pages.dev/privacy/
- Website: https://booklyn.pages.dev/
- Ads: no. In-app purchases: none (coins are earned by studying; nothing is sold). Target audience: 13+ (or 18+ if you prefer less review work).
- Package ID: choose once, it can never change, e.g. com.booklyn.app

## Short description (max 80 characters)
- en: Keep your study lights on: files, quizzes and deadlines for every module.
- de: Halte deine Lernlichter an: Dateien, Quiz und Fristen für jedes Modul.
- es: Mantén tus luces de estudio: archivos, tests y fechas de cada asignatura.
- fr: Garde tes lumières d'étude allumées : fichiers, quiz et échéances par module.

## Full description (max 4000 characters)
### en
Booklyn turns your semester into a small city. Every module is a house, every week (or topic, or chapter) is a floor, and a floor stays lit as long as you keep up with it.

- Add your course files to the Port. Booklyn suggests the module and week from the file name, you decide.
- Practice questions are made on your device from your own material. An optional AI setting writes better ones from short excerpts.
- See what is fading, what is due and what to study today.
- Keep deadlines, notes and goals per module.
- Works without a connection once installed.
- Share files from Drive, Files or WhatsApp straight to Booklyn.

Your files never leave your device. Only your progress can sync between your devices, with a passkey or a sync code you create yourself. No ads, no tracking.

Made for students at any university, school or institute: you create your own modules and weeks. HSLU students can also use an optional desktop browser extension to fetch files from ILIAS.

### de
Booklyn macht aus deinem Semester eine kleine Stadt. Jedes Modul ist ein Haus, jede Woche (oder jedes Thema, jedes Kapitel) ein Stockwerk, und das Licht bleibt an, solange du dranbleibst.

- Lege deine Kursdateien im Hafen ab. Booklyn schlägt Modul und Woche anhand des Dateinamens vor, du entscheidest.
- Übungsfragen entstehen auf deinem Gerät aus deinem eigenen Material. Eine optionale KI-Einstellung schreibt bessere Fragen aus kurzen Auszügen.
- Sieh, was ausgeht, was fällig ist und was heute dran ist.
- Fristen, Notizen und Ziele pro Modul.
- Funktioniert nach der Installation auch ohne Verbindung.
- Teile Dateien aus Drive, Dateien oder WhatsApp direkt mit Booklyn.

Deine Dateien verlassen dein Gerät nie. Nur dein Fortschritt kann zwischen deinen Geräten synchronisiert werden, mit einem Passkey oder einem selbst erstellten Sync-Code. Keine Werbung, kein Tracking.

Für Studierende jeder Hochschule oder Schule: Du legst deine Module und Wochen selbst an. HSLU-Studierende können zusätzlich eine optionale Browser-Erweiterung am Computer nutzen, um Dateien aus ILIAS zu holen.

### es
Booklyn convierte tu semestre en una pequeña ciudad. Cada asignatura es una casa, cada semana (o tema, o capítulo) es una planta, y la luz sigue encendida mientras vas al día.

- Añade los archivos de tus cursos al Puerto. Booklyn sugiere la asignatura y la semana por el nombre del archivo, tú decides.
- Las preguntas de práctica se crean en tu dispositivo con tu propio material. Un ajuste opcional de IA escribe mejores preguntas a partir de fragmentos cortos.
- Mira qué se está apagando, qué vence y qué estudiar hoy.
- Fechas límite, notas y objetivos por asignatura.
- Funciona sin conexión una vez instalada.
- Comparte archivos desde Drive, Archivos o WhatsApp directamente a Booklyn.

Tus archivos nunca salen de tu dispositivo. Solo tu progreso puede sincronizarse entre tus dispositivos, con una passkey o un código de sincronización que creas tú. Sin anuncios, sin seguimiento.

Pensada para estudiantes de cualquier universidad, colegio o instituto: creas tus propias asignaturas y semanas. Los estudiantes de HSLU pueden usar además una extensión opcional de navegador de escritorio para traer archivos de ILIAS.

### fr
Booklyn transforme ton semestre en une petite ville. Chaque module est une maison, chaque semaine (ou thème, ou chapitre) un étage, et la lumière reste allumée tant que tu es à jour.

- Ajoute tes fichiers de cours au Port. Booklyn propose le module et la semaine d'après le nom du fichier, tu décides.
- Les questions d'entraînement sont créées sur ton appareil à partir de ton propre matériel. Un réglage IA optionnel écrit de meilleures questions à partir de courts extraits.
- Vois ce qui s'éteint, ce qui est dû et quoi étudier aujourd'hui.
- Échéances, notes et objectifs par module.
- Fonctionne hors ligne une fois installée.
- Partage des fichiers depuis Drive, Fichiers ou WhatsApp directement vers Booklyn.

Tes fichiers ne quittent jamais ton appareil. Seule ta progression peut être synchronisée entre tes appareils, avec une passkey ou un code de synchronisation que tu crées toi-même. Pas de publicité, pas de suivi.

Pour les étudiants de toute université ou école : tu crées tes propres modules et semaines. Les étudiants de la HSLU peuvent aussi utiliser une extension de navigateur optionnelle sur ordinateur pour récupérer des fichiers d'ILIAS.

## Graphics to prepare
- Icon 512x512 PNG: app/icon-512.png
- Feature graphic 1024x500 PNG/JPG (needed; not made yet)
- Phone screenshots: at least 2, 16:9 or 9:16, 320 to 3840 px. Take them from the installed app on the phone.

## Data safety form (draft, confirm in the console)
- Does the app collect or share user data? Yes (only if the person turns on sync or AI).
- Data in transit encrypted: yes (HTTPS only).
- Can users ask for deletion: yes. In the app: Settings > Account > delete cloud data. Say so in the console and link https://booklyn.pages.dev/privacy/.
- Collected, optional, for app functionality, not shared: App activity or user content (study progress, notes, module names) stored on the server when sync is on, linked to an anonymous account ID.
- Account identifiers: a sync code hash or passkey id. If the email sign-in (functions/api/auth) is still reachable in the app, also declare Email address (optional, account management).
- Optional AI: short text excerpts are sent to Cloudflare Workers AI to write questions and are not stored. Declare this as data processed by a service provider acting for you, not stored. Confirm the wording with Play's help text.
- Not collected: location, contacts, photos, files (files stay on the device), advertising ID, financial info, health.

## Steps
1. Push the code. Open https://pwabuilder.com, enter https://booklyn.pages.dev/app/, run the check, choose Android > Google Play.
2. Set package ID (permanent), name Booklyn, version 1, signing key: "Create new" and SAVE the keystore file and its passwords somewhere safe (a lost key means no more updates).
3. Download the package, you get an .aab file.
4. Play Console > Create app > Production or testing track > upload the .aab. In Setup > App signing, copy the "SHA-256 certificate fingerprint" of the app signing key.
5. Send me that fingerprint. I add `.well-known/assetlinks.json`; without it the app opens with a browser bar on top.
6. Fill the store listing, content rating, target audience, Data safety, ads declaration, then submit for review.
7. If Play asks for a closed test with 12 testers for 14 days, it applies to your account type: follow what the Console shows.
