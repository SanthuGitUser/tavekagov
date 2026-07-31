# TN DIPR — Press Release PDF downloader (Windows)

This downloads the PDFs shown on:

- `https://dipr.tn.gov.in/press-release1.html`

It uses the same public API the website calls, and saves PDFs under a date folder like:

- `.\2026-07-15\Press Release\...pdf`
- `.\2026-07-15\Press Notes\...pdf` (optional)

---

## Setup (PowerShell)

```powershell
cd D:\GitHub-Projects\tavekagov\TN-DIPR-Press Release
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r .\requirements.txt
```

Or run:

```powershell
cd D:\GitHub-Projects\tavekagov\TN-DIPR-Press Release
.\setup.ps1
```

---

## Run

Download **Press Release** PDFs for **today**:

```powershell
cd D:\GitHub-Projects\tavekagov\TN-DIPR-Press Release
python .\dipr_press_release_download.py
```

Also include the **Press Notes** tab:

```powershell
python .\dipr_press_release_download.py --include-notes
```

Pick a specific date:

```powershell
python .\dipr_press_release_download.py --date 2026-07-15 --include-notes
```

