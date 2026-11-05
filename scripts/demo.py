"""Seed synthetic employee documents, then optionally execute one filling task."""

import argparse
import io
import json
import time
from pathlib import Path

import httpx
from docx import Document
from openpyxl import Workbook


def word_bytes():
    doc = Document()
    doc.add_heading("项目结项记录（演示数据）", 0)
    doc.add_paragraph("李明于2025年3月至2025年12月参与客户服务平台项目，担任后端开发。")
    doc.add_paragraph("负责文档检索接口和异步任务模块，使用 Python、FastAPI 和 SQLite。")
    output = io.BytesIO()
    doc.save(output)
    return output.getvalue()


def excel_bytes(is_template):
    book = Workbook()
    sheet = book.active
    sheet.title = "员工登记" if is_template else "培训记录"
    if is_template:
        sheet.column_dimensions["A"].width = 20
        sheet.column_dimensions["B"].width = 70
        for field in ["姓名", "毕业院校", "专业", "联系电话", "项目经历", "培训情况"]:
            sheet.append([field, "{{" + field + "}}"])
    else:
        sheet.append(["姓名", "培训名称", "完成日期", "学时"])
        sheet.append(["李明", "企业数据治理基础", "2026-06-15", 16])
    output = io.BytesIO()
    book.save(output)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("data/demo-result.xlsx"))
    parser.add_argument("--timeout", type=int, default=300)
    args = parser.parse_args()
    with httpx.Client(base_url=args.url, timeout=30) as client:
        response = client.post("/api/workspaces", json={"name": "李明的个人资料（演示）"})
        response.raise_for_status()
        workspace = response.json()["id"]
        base = f"/api/workspaces/{workspace}"
        sources = [
            ("简历.md", "# 李明\n毕业院校：金陵科技学院\n专业：软件工程\n".encode()),
            ("联系方式.txt", "姓名：李明\n联系电话：13800000000\n".encode()),
            ("项目记录.docx", word_bytes()),
            ("培训记录.xlsx", excel_bytes(False)),
        ]
        for name, content in sources:
            response = client.post(base + "/documents", files={"file": (name, content)})
            response.raise_for_status()
        response = client.post(
            base + "/documents",
            data={"role": "template"},
            files={"file": ("企业登记表.xlsx", excel_bytes(True))},
        )
        response.raise_for_status()
        template = response.json()["id"]
        task_body = {
            "instruction": "填写企业登记表，项目经历控制在100字以内。",
            "template_id": template,
        }
        print(
            json.dumps(
                {"workspace": workspace, "task_endpoint": base + "/tasks", "task_body": task_body},
                ensure_ascii=False,
                indent=2,
            )
        )
        if args.prepare_only:
            return
        response = client.post(base + "/tasks", json=task_body)
        if response.status_code == 503:
            raise SystemExit(response.json()["detail"])
        response.raise_for_status()
        task_id = response.json()["id"]
        deadline = time.monotonic() + args.timeout
        while time.monotonic() < deadline:
            response = client.get(base + "/tasks/" + task_id)
            response.raise_for_status()
            task = response.json()
            if task["status"] in {"failed", "interrupted"}:
                raise SystemExit(task["error"])
            if task["status"] == "completed":
                if not task["artifacts"]:
                    raise SystemExit(task["result"]["message"])
                artifact = next((a for a in task["artifacts"] if a["name"].endswith(".xlsx")), None)
                if artifact is None:
                    raise SystemExit("任务结束，但没有生成 Excel 文件")
                response = client.get(artifact["download_url"])
                response.raise_for_status()
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_bytes(response.content)
                print("已保存：", args.output.resolve())
                print(json.dumps(artifact["report"], ensure_ascii=False, indent=2))
                return
            time.sleep(1)
        raise SystemExit(f"等待超时，可继续查询 {base}/tasks/{task_id}")


if __name__ == "__main__":
    main()
