# Test Fixture Set v3 — "Data Exists, But It Must Resolve to Null"

This batch is different from v1 and v2. Every previous conflict case had a clean winner
(CSV beats resume by source-priority, full stop). This batch specifically engineers
situations where applying that simple rule blindly produces a WRONG, overconfident
answer — and the honest output for the contested field is null (or a very-low-confidence
flagged value), even though real data technically exists on multiple sides.

This is the hardest, most "wrong-but-confident"-prone batch yet. Use it last, after v1
and v2 are both clean.

## The six candidates

| Ref | Name | Why a simple priority rule fails here | What forces the null |
|---|---|---|---|
| E001 | Karthik Reddy | THREE different titles: CSV title="Senior Engineer", CSV's own recruiter_note="Staff Engineer", resume="Principal Engineer". The conflict is partly INSIDE the CSV itself, before resume even enters the picture | No source-priority rule applies when a source disagrees with itself. `title` should be null with all 3 candidates logged, not a forced pick of column-vs-note |
| E002 | Sunita Rao | Email matches (identity confirmed), but name ("Sunita Rao" vs "S. Rao"), phone, AND title all disagree simultaneously | Identity is confirmed via email, but that doesn't mean every field should inherit high confidence. `title` specifically should reflect that almost nothing else corroborates the CSV's claim |
| E003 | Imran Patel | CSV says current_company="Ola" (present tense). Resume explicitly states the role ended in April 2026 and says "I am currently unemployed" | This isn't stale data (like Sahil Verma in v2) — it's an EXPLICIT, written contradiction. current_company should be null/flagged, not silently set to "Ola" |
| E004 | Bhavna Iyer | CSV's phone field literally contains the string "NULL" (a broken-export placeholder, not real data). Resume has a clean, valid phone number | Tests whether your pipeline validates the WINNING value before trusting it. A source-priority winner that fails basic format validation must be discarded, not output as-is |
| E005 | Deepak Nair | THREE different titles, no two matching: CSV="Lead Consultant", resume header="Principal Consultant", resume's own Experience section="Engagement Manager" | No majority, no agreement anywhere. Tests whether your confidence formula's "agreement bonus" correctly finds ZERO agreement here, rather than picking one value arbitrarily |
| E006 | Lakshmi Menon | CSV and resume's STATED years_experience both say 6 (they "agree") — but her own resume's date ranges (Jun 2023-Present) and graduation year (2023) make 6 years mathematically impossible | The subtlest case: surface agreement between two numbers can still be wrong if the underlying evidence contradicts it. Tests whether your calculated-date-range check catches an internally implausible resume, not just cross-source disagreement |

## Important: what "correct" means for this batch

For E001, E002, E005: the contested field (`title`) should come out as **null**, with
ALL competing values preserved in provenance/notes (not just the CSV one). A field with
3 disagreeing candidate values is not the same situation as a field with 1 CSV value and
0 resume candidates — your system needs to distinguish "no data" from "too much
disagreeing data to trust any of it."

For E003: `current_company` should be **null or explicitly flagged as conflicting**, not
silently set to the CSV's "Ola." This is the one case in the whole test suite where CSV's
normal priority-win should NOT apply, because the contradiction is explicit rather than
just "different."

For E004: `phones`/`phones_raw` should end up using the RESUME's valid number (or null,
if you want to be maximally conservative), NEVER the literal string "NULL" as if it were
a real phone value. This is a data-validation bug catcher, not really a "conflict" in the
philosophical sense — it's closer to bad-input handling.

For E006: `years_experience` should ideally be flagged as suspicious/low-confidence
DESPITE both sources agreeing on "6" — because the resume's own date math doesn't support
it. This is the hardest one to get right and the most impressive one to nail. If your
pipeline doesn't currently cross-check a stated number against calculated evidence even
when sources agree, that's fine to leave as a known limitation — just say so explicitly
in your design doc rather than letting a wrong "6 yrs @ high confidence" pass silently.

## How to use this batch

1. Run it through your pipeline like any other batch.
2. For each of the 6 candidates, check the contested field specifically (see table above).
3. If your pipeline currently picks ONE of the disagreeing values confidently (instead of
   nulling/flagging), that's the exact failure mode this batch exists to catch — and it's
   a very good, very specific story for your design doc: "I added a check for when a
   source disagrees with itself, or when the 'winning' source's value is malformed, and
   in those cases the system declines to assert a value rather than guessing."
4. You don't need a perfect fix for all 6 before your deadline. Even just E004 (validate
   the winner before trusting it) and E003 (explicit contradiction vs. mere staleness) are
   strong, demonstrable wins. E006 is the hardest and most optional — a good "if I had
   more time" line in your write-up if you don't get to it.
