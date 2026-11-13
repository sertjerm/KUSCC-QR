# KUSCC-QR — Codex Instructions

> กฎร่วม (ภาษาไทย, naming contract, git, architecture) อยู่ที่ `~/Dev/NetCore/AGENTS.md`
> รายละเอียดโปรเจกต์ (stack, port, โครงสร้างไฟล์, คำสั่ง dev, กฎเฉพาะ) อยู่ที่ **`CLAUDE.md`** ในโฟลเดอร์นี้ — อ่านก่อนเริ่มงาน
> ไฟล์นี้เก็บเฉพาะกติกาการทำงานร่วมกันระหว่าง Codex กับ Claude Code เพื่อไม่ให้ข้อมูลซ้ำสองที่

## สัญญา API — Single Source of Truth

- **`docs/API_SPEC.md`** คือสัญญาระหว่าง `API/` กับ `Client/`
- แก้ endpoint, DTO, query param, โครง `style`/`data` → **ต้องแก้ `docs/API_SPEC.md` ในการเปลี่ยนแปลงเดียวกัน**
  และเพิ่มบรรทัดใน Changelog ท้ายไฟล์
- ก่อนแก้ฝั่งใดฝั่งหนึ่ง ให้อ่าน spec ก่อนเสมอ — ถ้าโค้ดกับ spec ไม่ตรงกัน ให้แก้ให้ตรงกับของจริงและบอกผู้ใช้
- Schema DB อยู่ที่ `docs/db/*.sql` — เพิ่มไฟล์ใหม่ตามลำดับเลข (`002_...sql`) ห้ามแก้ไฟล์ที่ถูกรันไปแล้ว

## ทำงานร่วมกับ Claude Code

- ห้ามแก้หรือลบงานที่ยังไม่ commit ของ agent อื่นที่ไม่เกี่ยวกับงานตัวเอง
- ห้าม commit / push จนกว่าผู้ใช้สั่ง
- ตรวจก่อนส่งงาน: `cd API && dotnet build` และ `cd Client && npm run lint && npm run build`
