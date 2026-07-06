from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class DocumentType(str, Enum):
    residential_purchase_agreement = "Residential Purchase Agreement"
    commercial_purchase_agreement = "Commercial Purchase Agreement"
    unknown = "Unknown"


class PartyRole(str, Enum):
    buyer = "buyer"
    seller = "seller"
    agent = "agent"
    other = "other"


class Party(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the party")
    role: Optional[PartyRole] = Field(None, description="Role in the transaction")
    company: Optional[str] = Field(None, description="Company or entity name, if applicable")


class Property(BaseModel):
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    parcel_number: Optional[str] = Field(None, description="APN / parcel ID")


class FinancialTerms(BaseModel):
    purchase_price: Optional[float] = None
    earnest_money_deposit: Optional[float] = None
    down_payment: Optional[float] = None
    loan_amount: Optional[float] = None


class KeyDates(BaseModel):
    contract_date: Optional[str] = Field(None, description="Date the contract was signed (YYYY-MM-DD)")
    inspection_deadline: Optional[str] = Field(None, description="Inspection contingency deadline (YYYY-MM-DD)")
    financing_contingency_deadline: Optional[str] = Field(None, description="Financing contingency deadline (YYYY-MM-DD)")
    appraisal_deadline: Optional[str] = Field(None, description="Appraisal deadline (YYYY-MM-DD)")
    title_review_deadline: Optional[str] = Field(None, description="Title review deadline (YYYY-MM-DD)")
    closing_date: Optional[str] = Field(None, description="Scheduled closing / settlement date (YYYY-MM-DD)")
    possession_date: Optional[str] = Field(None, description="Date buyer takes possession (YYYY-MM-DD)")


class Contingency(BaseModel):
    type: Optional[str] = Field(None, description="Type of contingency (e.g., inspection, financing, appraisal, sale of existing home)")
    deadline: Optional[str] = Field(None, description="Deadline for this contingency (YYYY-MM-DD)")
    description: Optional[str] = Field(None, description="Details or conditions of the contingency")
    status: Optional[str] = Field("active", description="active, waived, or removed")


class ExtractionResponse(BaseModel):
    document_type: DocumentType = DocumentType.unknown
    parties: List[Party] = Field(default_factory=list)
    property: Optional[Property] = None
    financial_terms: Optional[FinancialTerms] = None
    key_dates: Optional[KeyDates] = None
    contingencies: List[Contingency] = Field(default_factory=list)
    extraction_notes: Optional[str] = Field(None, description="Any caveats, assumptions, or warnings about the extraction")


# ---------------------------------------------------------------------------
# Underwriting / Deal Analysis
# ---------------------------------------------------------------------------
class UnderwritingInput(BaseModel):
    """User-provided assumptions for deal analysis."""
    purchase_price: float = Field(..., description="Purchase price of the property")
    monthly_rent: Optional[float] = Field(None, description="Expected monthly rent (for income properties)")
    annual_expenses: Optional[float] = Field(None, description="Annual operating expenses (taxes, insurance, HOA, etc.)")
    down_payment_percent: float = Field(20.0, description="Down payment percentage (e.g. 20 = 20%)")
    interest_rate: float = Field(6.5, description="Annual interest rate on loan")
    loan_term_years: int = Field(30, description="Loan term in years")
    rehab_cost: Optional[float] = Field(None, description="Estimated rehab/repair costs (for flips)")
    after_repair_value: Optional[float] = Field(None, description="Estimated ARV after repairs (for flips)")
    closing_costs: float = Field(0.0, description="Estimated closing costs")


class UnderwritingResult(BaseModel):
    cap_rate: Optional[float] = Field(None, description="Net Operating Income / Purchase Price")
    cash_on_cash_return: Optional[float] = Field(None, description="Annual pre-tax cash flow / total cash invested")
    monthly_cash_flow: Optional[float] = Field(None, description="Monthly cash flow after mortgage")
    total_cash_invested: Optional[float] = Field(None, description="Down payment + closing costs")
    debt_service: Optional[float] = Field(None, description="Monthly mortgage payment")
    noi: Optional[float] = Field(None, description="Net Operating Income (annual)")
    flip_margin: Optional[float] = Field(None, description="(ARV - Purchase - Rehab) / ARV")
    flip_profit: Optional[float] = Field(None, description="Dollar profit on flip")
    assumptions: UnderwritingInput = Field(..., description="Assumptions used for the calculation")
