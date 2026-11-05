import re
from pathlib import Path
from zipfile import ZipFile

from docx import Document
from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell

SUPPORTED = {".txt", ".md", ".docx", ".xlsx"}
MAX_BLOCKS = 30000
MAX_TEXT = 5_000_000


def parse(path: Path) -> list[dict]:
    """Produce stable block addresses for source citations and template patching."""
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED:
        raise ValueError("仅支持 .txt、.md、.docx、.xlsx 格式")
    if suffix in {".docx", ".xlsx"}:
        with ZipFile(path) as archive:
            if sum(i.file_size for i in archive.infolist()) > 100 * 1024 * 1024:
                raise ValueError("文档解压后体积超过 100MB 上限")
    blocks = []

    def add(address, text):
        blocks.append({"address": address, "text": str(text) if text is not None else ""})
        if len(blocks) > MAX_BLOCKS:
            raise ValueError("文档内容过长，超出解析上限")

    if suffix in {".md", ".txt"}:
        raw = path.read_bytes()
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("gb18030")
        for index, line in enumerate(text.splitlines()):
            # Long paragraphs remain addressable in bounded chunks.
            for start in range(0, max(1, len(line)), 2000):
                add(f"line:{index}/offset:{start}", line[start : start + 2000])
    elif suffix == ".docx":
        doc = Document(path)
        for i, paragraph in enumerate(doc.paragraphs):
            add(f"paragraph:{i}", paragraph.text)
        for ti, table in enumerate(doc.tables):
            seen = set()
            for ri, row in enumerate(table.rows):
                for ci, cell in enumerate(row.cells):
                    if cell._tc in seen:
                        continue
                    seen.add(cell._tc)
                    add(f"table:{ti}/row:{ri}/cell:{ci}", cell.text)
    else:
        book = load_workbook(path, data_only=False)
        try:
            for sheet in book:
                if sheet.max_row * sheet.max_column > MAX_BLOCKS:
                    raise ValueError("Excel 表格行列过多，请删减空白或无关行列后再试")
                for row in sheet:
                    for cell in row:
                        if not isinstance(cell, MergedCell):
                            add(f"{sheet.title}!{cell.coordinate}", cell.value)
        finally:
            book.close()
    if sum(len(b["text"]) for b in blocks) > MAX_TEXT:
        raise ValueError("文档字数超出解析上限")
    return blocks


def writable(text: str) -> bool:
    return not text.strip() or bool(re.fullmatch(r"\s*\{\{[^{}]+\}\}\s*", text))


def set_text(container, value: str):
    """Retain the first run's formatting while replacing the text content."""
    if container.runs:
        container.runs[0].text = value
        for run in container.runs[1:]:
            run.text = ""
    else:
        container.add_run(value)


def write_patches(source: Path, target: Path, patches: list[dict]):
    """Only blank/placeholder slots are writable; static labels and formulas are protected."""
    blocks = {b["address"]: b["text"] for b in parse(source)}
    seen = set()
    for patch in patches:
        address = patch["address"]
        if address in seen:
            raise ValueError(f"重复写入位置：{address}")
        seen.add(address)
        if address not in blocks:
            raise ValueError(f"不存在的位置：{address}")
        if not writable(blocks[address]):
            raise ValueError(f"位置包含原有内容，禁止覆盖：{address}")
    if source.suffix == ".xlsx":
        book = load_workbook(source)
        try:
            for patch in patches:
                sheet, cell = patch["address"].rsplit("!", 1)
                slot = book[sheet][cell]
                slot.value = patch["value"]
                # Values are data, never model-generated Excel formulas.
                if isinstance(patch["value"], str):
                    slot.data_type = "s"
            book.save(target)
        finally:
            book.close()
    elif source.suffix == ".docx":
        doc = Document(source)
        for patch in patches:
            address, value = patch["address"], str(patch["value"])
            if address.startswith("paragraph:"):
                set_text(doc.paragraphs[int(address.split(":")[1])], value)
            else:
                ti, ri, ci = [int(part.split(":")[1]) for part in address.split("/")]
                cell = doc.tables[ti].rows[ri].cells[ci]
                set_text(cell.paragraphs[0], value)
                for paragraph in cell.paragraphs[1:]:
                    set_text(paragraph, "")
        doc.save(target)
    else:
        raise ValueError("自动填表仅支持 .docx 和 .xlsx 格式")
