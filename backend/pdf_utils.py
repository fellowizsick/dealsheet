import io
import pdfplumber


class PDFTextExtractionError(Exception):
    pass


def extract_text_from_pdf(raw_bytes: bytes) -> str:
    """Extract all text from a PDF byte stream. Raises PDFTextExtractionError on failure."""
    try:
        with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            full = "\n\n".join(pages)
    except Exception as exc:
        raise PDFTextExtractionError(f"Failed to read PDF: {exc}") from exc

    if not full.strip():
        raise PDFTextExtractionError(
            "No extractable text found. This PDF may be scanned (image-only). "
            "OCR is not included in this MVP."
        )
    return full.strip()
