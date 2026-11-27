"""Prepare a roster offline; never uploads or changes an active database.

python tools/import_roster.py SOURCE.xlsx --existing assets/students.json --out prepared-roster
Requires: openpyxl. Reads only RUJUKAN IBU BAPA and columns A/B for pupil rows.
"""
import argparse
import collections
import json
import pathlib
import re
import uuid

def main():
    import openpyxl
    parser = argparse.ArgumentParser(description="Sediakan daftar SKST daripada tab RUJUKAN IBU BAPA sahaja")
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("--existing", type=pathlib.Path, help="Daftar terdahulu untuk mengekalkan StudentID")
    parser.add_argument("--out", type=pathlib.Path, required=True)
    args = parser.parse_args()
    old = json.loads(args.existing.read_text(encoding="utf-8")) if args.existing else []
    exact = {(s["name"], s["group"]): s["id"] for s in old}
    by_name = collections.defaultdict(list)
    for s in old:
        by_name[s["name"]].append(s["id"])
    workbook = openpyxl.load_workbook(args.source, data_only=True, read_only=True)
    if "RUJUKAN IBU BAPA" not in workbook.sheetnames:
        raise SystemExit("Tab RUJUKAN IBU BAPA tidak ditemui. Tiada fail ditulis.")
    students = []
    group = None
    for row in workbook["RUJUKAN IBU BAPA"].iter_rows(values_only=True):
        for value in row:
            match = re.fullmatch(r"KUMPULAN\s+(\d+)", str(value or "").strip(), flags=re.I)
            if match:
                group = "KUMPULAN " + match.group(1)
        if group and len(row) > 1 and isinstance(row[0], (int, float)) and isinstance(row[1], str) and row[1].strip():
            name = row[1].strip()
            student_id = exact.get((name, group))
            if not student_id and len(by_name[name]) == 1:
                student_id = by_name[name][0]
            students.append({"id": student_id or "SKST27-" + uuid.uuid4().hex[:16].upper(), "name": name, "group": group})
    if not students or len({s["id"] for s in students}) != len(students):
        raise SystemExit("Daftar kosong atau ID pendua. Tiada fail ditulis.")
    pairs = [(s["name"], s["group"]) for s in students]
    if len(set(pairs)) != len(pairs):
        raise SystemExit("Nama sama dalam kumpulan yang sama. Semakan manual diperlukan sebelum menyediakan ID kekal.")
    args.out.mkdir(parents=True, exist_ok=True)
    text = json.dumps(students, ensure_ascii=False, indent=2)
    (args.out / "students.json").write_text(text + "\n", encoding="utf-8")
    (args.out / "Data.gs").write_text("var SKST_STUDENTS = " + text + ";\n", encoding="utf-8")
    counts = collections.Counter(s["group"] for s in students)
    print(json.dumps({"jumlah": len(students), "kumpulan": dict(counts), "output": str(args.out)}, ensure_ascii=False, indent=2))
    print("Fail disediakan untuk semakan. Tiada data dihantar ke Sheet dan tiada daftar aktif ditimpa.")

if __name__ == "__main__":
    main()
