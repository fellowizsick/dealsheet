import csv, io
from typing import List, Dict, Any
from schemas import ExtractionResponse


def result_to_csv_row(result: ExtractionResponse, filename: str) -> Dict[str, Any]:
    """Flatten an ExtractionResponse into a single CSV row dict."""
    row: Dict[str, Any] = {}
    row["source_file"] = filename
    row["document_type"] = result.document_type.value if result.document_type else ""
    row["property_address"] = _fmt_property(result.property)
    row["property_city"] = result.property.city if result.property else ""
    row["property_state"] = result.property.state if result.property else ""
    row["property_zip"] = result.property.zip_code if result.property else ""
    row["property_parcel"] = result.property.parcel_number if result.property else ""
    row["purchase_price"] = result.financial_terms.purchase_price if result.financial_terms else ""
    row["earnest_money"] = result.financial_terms.earnest_money_deposit if result.financial_terms else ""
    row["down_payment"] = result.financial_terms.down_payment if result.financial_terms else ""
    row["loan_amount"] = result.financial_terms.loan_amount if result.financial_terms else ""
    row["contract_date"] = result.key_dates.contract_date if result.key_dates else ""
    row["inspection_deadline"] = result.key_dates.inspection_deadline if result.key_dates else ""
    row["financing_deadline"] = result.key_dates.financing_contingency_deadline if result.key_dates else ""
    row["appraisal_deadline"] = result.key_dates.appraisal_deadline if result.key_dates else ""
    row["title_deadline"] = result.key_dates.title_review_deadline if result.key_dates else ""
    row["closing_date"] = result.key_dates.closing_date if result.key_dates else ""
    row["possession_date"] = result.key_dates.possession_date if result.key_dates else ""
    row["buyer_names"] = "; ".join(p.name or "" for p in result.parties if p.role and p.role.value == "buyer")
    row["seller_names"] = "; ".join(p.name or "" for p in result.parties if p.role and p.role.value == "seller")
    row["contingencies"] = "; ".join(f"{c.type}: {c.description}" for c in result.contingencies)
    row["extraction_notes"] = result.extraction_notes or ""
    return row


def results_to_csv_bytes(rows: List[Dict[str, Any]]) -> bytes:
    """Convert a list of CSV-row dicts into a UTF-8 CSV byte string."""
    if not rows:
        return b""
    fieldnames = list(rows[0].keys())
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue().encode("utf-8")


def _fmt_property(prop) -> str:
    if prop is None:
        return ""
    parts = [prop.street_address, prop.city, prop.state, prop.zip_code]
    return ", ".join(p for p in parts if p)
