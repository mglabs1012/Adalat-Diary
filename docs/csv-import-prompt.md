# Adalat Diary — CSV import brief

Copy everything below this line and give it to whoever is preparing the file.

---

## Task

Produce a **CSV file** of court matters that can be imported into Adalat Diary.

One row per matter. The first row must be the header row. Save as UTF-8 CSV.

## Columns

Put the header names below in row 1. **Columns may be in any order**, casing does not
matter, and any column not listed here is ignored rather than treated as an error.

| Column | Required | Example | Notes |
| --- | --- | --- | --- |
| `CRN` | No | DLCT01-004521-2026 | Optional |
| `Pre Date` | No | 12/08/2026 | Previous hearing |
| `Court` | **Yes** | ADJ1 | Must be a court code |
| `Party 1` | **Yes** | John Doe |  |
| `Party 2` | **Yes** | Jane Smith & Ors. |  |
| `Stage` | No | Evidence | Codes like CR, PF, WS work |
| `Next Date` | No | 25/09/2026 |  |
| `Case No` | No | CS/412/2026 |  |
| `Court Room` | No | Court Room 5 |  |
| `Judge` | No | Sh. R. K. Verma, ADJ |  |
| `Listed For` | No | Cross examination |  |
| `Client Name` | No | John Doe |  |
| `Client Phone` | No | 9876543210 |  |
| `Notes` | No | Brief facts |  |

Only **Court, Party 1, Party 2** must have a value in every row.
The other 11 may be left blank.

## Rules

1. **One matter per row.** Do not merge cells or leave a matter spanning two rows.
2. **Dates** may be written as `25/09/2026`, `25-09-2026` or `2026-09-25`. Day comes
   first in the slash and dash forms. Leave blank if not known — do not write "NA" or "-".
3. **Any value containing a comma must be wrapped in double quotes**, for example
   `"Final arguments, part heard"`. A double quote inside such a value is doubled: `""`.
4. **Court** must be one of the exact codes listed below. Spacing and case are forgiven
   (`adj 1` is read as `ADJ1`), but an unrecognised court is reported and the row skipped.
5. **Stage** must be one of the names below, or one of its accepted short codes.
   Blank means *Notice / Summons*.
6. **CRN is optional**, but where present it must be unique — the same CRN twice in one
   file is reported and the second occurrence skipped.
7. At most **500 rows** per file. Split larger registers into batches.
8. Do not add a totals row, a title row above the header, or blank separator rows.

## Court codes (96)

**Ajmer — District Headquarters**

`DJ` · `ADJ1` · `ADJ2` · `ADJ3` · `ADJ4` · `ADJ5` · `ADR` · `ADM` · `AT` · `WA` · `WA-DC` · `SC-ST` · `LABOUR` · `ACD` · `CJM` · `ACJM1` · `ACJM2` · `ACJM3` · `ACJ1` · `ACJ2` · `ACJ3` · `ACJ4` · `ACJ5` · `ACJ6` · `JM1` · `JM2` · `JM3` · `JM4` · `JM6` · `MMP` · `MW` · `NI1` · `NI2` · `NI3` · `NI4` · `CC` · `CF` · `MS` · `MN` · `MD` · `ME` · `RT` · `RA` · `POCSO1` · `POCSO2` · `COMMERCIAL` · `MACT` · `FAMILY1` · `FAMILY2` · `PCPNDT` · `RAILWAY` · `DESIGNATED-COURT` · `JJB` · `CJ-JM-DISTRICT` · `CJ-JM-EAST` · `CJ-JM-WEST` · `CJ-JM-NORTH` · `CJ-JM-SOUTH` · `ACJ-JM1` · `ACJ-JM2` · `ACJ-JM3` · `ACJ-JM4` · `ACJ-JM5` · `ACJ-JM6`

**Kishangarh**

`KISHANGARH-ADJ1` · `KISHANGARH-ADJ2` · `KISHANGARH-ACJM1` · `KISHANGARH-ACJM2` · `KISHANGARH-CJ-JM` · `KISHANGARH-ACJ-JM` · `KISHANGARH-NI`

**Nasirabad**

`NASIRABAD-ADJ` · `NASIRABAD-ACJM` · `NASIRABAD-CJ-JM`

**Beawar**

`BEAWAR-ADJ1` · `BEAWAR-ADJ2` · `BEAWAR-ADJ3` · `BEAWAR-ACJM` · `BEAWAR-ACJM1` · `BEAWAR-ACJM2` · `BEAWAR-ACJM3` · `BEAWAR-CJ-JM` · `BEAWAR-ACJ-JM1` · `BEAWAR-ACJ-JM2` · `BEAWAR-ACJ-JM3` · `BEAWAR-NI`

**Kekri**

`KEKRI-ADJ1` · `KEKRI-ADJ2` · `KEKRI-ACJM1` · `KEKRI-ACJM2` · `KEKRI-CJ-JM`

**Other tehsils**

`PUSHKAR-CJ-JM` · `PISANGAN-GRAM-NYAYALAYA` · `SARWAR-CJ-JM` · `MASUDA-CJ-JM` · `BIJAYNAGAR-CJ-JM`

## Stage names (30)

- Plaint
- Application _(also accepts: Appl)_
- Cognizance _(also accepts: Cognisance)_
- Process Fee _(also accepts: PF)_
- Notice / Summons _(also accepts: Notice/Summons, Notice and Summons)_
- Notice
- Summons
- Service
- Written Statement / Reply _(also accepts: WS, Reply, Written Statement)_
- Framing of Issues
- Evidence
- Prosecution Evidence _(also accepts: PE)_
- Defence Evidence _(also accepts: DE, Defense Evidence)_
- Cross Examination _(also accepts: Cross)_
- Regular Hearing
- Hearing
- Arguments
- Stay
- Compliance
- Cheque Report _(also accepts: CR)_
- Final Report _(also accepts: FR)_
- Order
- Judgment _(also accepts: Judgement)_
- Decreed _(also accepts: Decree)_
- Preliminary Decree _(also accepts: PD)_
- Final Decree _(also accepts: FD)_
- Decree Preparation _(also accepts: Preparation of Decree, Drawing of Decree)_
- Appeal
- Execution
- Disposed

## Example

```csv
CRN,Pre Date,Court,Party 1,Party 2,Stage,Next Date,Case No,Court Room,Judge,Listed For,Client Name,Client Phone,Notes
DLCT01-004521-2026,12/08/2026,ADJ1,John Doe,Jane Smith & Ors.,Evidence,25/09/2026,CS/412/2026,Court Room 5,"Sh. R. K. Verma, ADJ",Cross examination,John Doe,9876543210,Brief facts
,05-08-2026,KEKRI-ACJM1,State,Vikram Singh,CR,25/09/2026,,,,"Arguments, part heard",,,
BWR-0099-2026,,BEAWAR-NI,Acme Pvt Ltd,R. Sharma,PF,02/10/2026,NI/88/2026,,,Service,,9812345678,
```

Row 2 uses every column. Row 3 has no CRN and uses the short code `CR` for Cheque Report,
with a quoted value containing a comma. Row 4 uses `PF` for Process Fee and leaves several
optional columns empty.

## What happens on import

The file is checked before anything is saved. You are shown how many rows are ready and how
many have problems, with the **line number and reason** for each problem row — a missing
party, an unreadable date, an unknown court, a CRN repeated within the file. Only the good
rows are imported; the rest are listed so they can be corrected and re-imported.

---

_Generated from the app's own court and stage lists on 2026-09-14. Regenerate with `npm run csv:prompt`._
