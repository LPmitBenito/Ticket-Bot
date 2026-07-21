# 🎫 Discord Support & Ticket Bot

Ein moderner und umfangreicher Discord.js Support-Bot mit interaktiven Modals, automatischer Ticket-Verwaltung, Report-System, Bewerbungs-Formular und Embed-Transcripts.

---

## 🚀 Features

- **📋 Interaktives Ticket-Panel:** Auswahl von Ticket-Themen über ein Dropdown-Menü.
- **📄 Modals für alle Themen:** Benutzer geben wichtige Daten (Minecraft-Name, Grund, Fehlerbeschreibung) direkt in ein Formular ein, bevor der Kanal erstellt wird.
- **🔒 Ticket-Verwaltung & Transcripts:**
  - Schließen von Tickets per Button (`🔒`) oder Befehl (`/close`).
  - Generierung eines übersichtlichen **Embed-Transcripts** inklusive Chatverlauf.
  - Automatischer Versand des Transcripts in den Log-Kanal sowie per Direktnachricht (DM) an den User.
- **➕ Personen hinzufügen / entfernen:** Supporter können mit `/add` und `/remove` Rechte für einzelne User im Ticket anpassen.
- **🚨 Spielermeldung (`/report`):** Ermöglicht Spielern das Melden von Fehlverhalten direkt in einen internen Team-Log-Kanal.
- **📋 Integriertes Bewerbungssystem:** Ein eigener Button *"Jetzt als Supporter bewerben"* öffnet ein Bewerbungsformular, dessen Auswertung direkt im Team-Bewerbungskanal landet.

---

## 🛠️ Anforderungen

- **Node.js** (v16.11.0 oder höher)
- **npm** (wird mit Node.js installiert)
- Ein Discord **Bot Token** mit folgenden **Intents** im Developer Portal aktiviert:
  - `Server Members Intent`
  - `Message Content Intent`

---

## 📥 Installation

1. **Projekt klonen oder Dateien herunterladen**
   Erstelle einen Ordner auf deinem Server/Host und lege die Bot-Dateien ab.

2. **Abhängigkeiten installieren**
   Öffne ein Terminal im Ordner und führe folgenden Befehl aus:
   ```bash
   npm install discord.js dotenv
