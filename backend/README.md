# Real Estate Purchase Agreement Extractor — Backend

FastAPI backend that takes a purchase agreement PDF and returns structured deal data: parties, property address, price, key dates, and contingencies.

Powered by **Google Gemini** (gemini-2.0-flash) for structured data extraction.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Edit .env with your GEMINI_API_KEY (pre-filled with your key)
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | /health | Liveness check |
| POST   | /extract | Upload 1 PDF → structured JSON |
| POST   | /extract/csv | Upload 1 PDF → single-row CSV download |
| POST   | /extract/batch/csv | Upload multiple PDFs → one combined CSV |

## Example

```bash
curl -X POST http://localhost:8000/extract -F "file=@sample_contract.pdf"
```

## How it works

1. `pdf_utils.py` extracts text from the PDF using pdfplumber
2. `extractor.py` sends text to Google Gemini using structured output (response_schema)
3. `csv_utils.py` flattens nested results for CSV export

## Notes for production

- CORS is wide open — lock to your frontend domain
- No auth/rate-limiting — add before public deployment
- Scanned PDFs fail cleanly — add OCR fallback (Tesseract/Textract) if needed
- Results are not stored — add a DB for deal history
# Rebuild trigger
