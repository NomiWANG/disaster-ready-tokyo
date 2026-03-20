from __future__ import annotations

from pathlib import Path
import sys


# 常见"UTF-8 被当作 GBK 解码后"的高频乱码字集合
MOJIBAKE_CHARS = set("鍒鍚鍙鍥鍦鏄鐨锛銆鈥閿锟")


def is_cjk(ch: str) -> bool:
    o = ord(ch)
    # CJK Unified Ideographs + 常用扩展 + 全角标点
    return (
        0x4E00 <= o <= 0x9FFF
        or 0x3400 <= o <= 0x4DBF
        or 0x20000 <= o <= 0x2A6DF
        or 0x2A700 <= o <= 0x2B73F
        or 0x2B740 <= o <= 0x2B81F
        or 0x2B820 <= o <= 0x2CEAF
        or 0xF900 <= o <= 0xFAFF
        or 0xFF00 <= o <= 0xFFEF
    )


def weird_penalty(s: str) -> int:
    # 私用区/替换字符通常意味着仍然不可读
    pua = sum(1 for c in s if 0xE000 <= ord(c) <= 0xF8FF)
    replacement = s.count("\ufffd")
    # 常见"UTF-8 被当作 GBK 解码后"的高频乱码字
    mojibake = sum(1 for c in s if c in MOJIBAKE_CHARS)
    return pua * 20 + replacement * 20 + mojibake * 3


def readability_score(s: str) -> int:
    cjk = sum(1 for c in s if is_cjk(c))
    ascii_printable = sum(1 for c in s if 0x20 <= ord(c) <= 0x7E)
    cn_punct = sum(1 for c in s if c in "，。！？：；（）《》""''、—·")
    return cjk * 3 + ascii_printable + cn_punct * 6 - weird_penalty(s)


def maybe_fix_line(line: str) -> tuple[str, bool]:
    # 快速筛：没出现高位字符通常无需修复
    if not any(ord(c) > 0x7F for c in line):
        return line, False

    # 方案 A：严格回转（最安全）
    try:
        candidate = line.encode("gb18030").decode("utf-8")
    except Exception:
        candidate = None

    # 方案 B：忽略少量非法 UTF-8 字节（不引入 ""），仅在明显提升时采用
    if candidate is None:
        try:
            candidate_ignore = line.encode("gb18030").decode("utf-8", errors="ignore")
            # 若忽略后几乎没变化，就不尝试采用
            if candidate_ignore and candidate_ignore != line:
                candidate = candidate_ignore
        except Exception:
            return line, False

    if candidate is None:
        return line, False

    # 若原行本身包含明显乱码字符，则更激进一些：
    # 只要回转后乱码字符显著减少且包含正常中文，就直接采用
    if any(c in MOJIBAKE_CHARS for c in line):
        mojibake_before = sum(1 for c in line if c in MOJIBAKE_CHARS)
        mojibake_after = sum(1 for c in candidate if c in MOJIBAKE_CHARS)
        has_cjk_after = any(is_cjk(c) for c in candidate)
        if has_cjk_after and mojibake_after * 3 <= mojibake_before:
            return candidate, True

    before = readability_score(line)
    after = readability_score(candidate)

    # 保守：必须提升且 candidate 不应更长很多（避免误修复）
    if after > before and len(candidate) <= len(line) + 10:
        return candidate, True

    return line, False


def fix_file(path: Path) -> bool:
    original = path.read_text(encoding="utf-8-sig")  # 自动去 BOM
    changed = False

    out_lines: list[str] = []
    for line in original.splitlines(keepends=True):
        fixed, did = maybe_fix_line(line)
        out_lines.append(fixed)
        changed = changed or did

    out = "".join(out_lines)

    # 统一写为 UTF-8 无 BOM
    if changed or out != original:
        path.write_text(out, encoding="utf-8", newline="")
        return True
    return False


def main(argv: list[str]) -> int:
    if len(argv) > 1:
        targets = [Path(a) for a in argv[1:]]
    else:
        targets = sorted(Path("Documents/Paper").glob("*.md"))

    any_changed = False
    for p in targets:
        if not p.exists() or not p.is_file():
            print(f"[跳过] {p}（不存在或不是文件）")
            continue
        try:
            changed = fix_file(p)
            any_changed = any_changed or changed
            print(f"[{'已修复' if changed else '无变化'}] {p}")
        except Exception as e:
            print(f"[失败] {p}: {e}")
            return 2

    return 0 if any_changed else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
