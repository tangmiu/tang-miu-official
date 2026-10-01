# Tang Miu Official — Admin Guide

เว็บนี้ใช้ Pages CMS เป็นหลังบ้าน โดยเนื้อหาอยู่ใน GitHub repository และหน้าเว็บอ่านข้อมูลจากโฟลเดอร์ data/

## เริ่มต้น

1. เข้า https://app.pagescms.org/
2. Sign in with GitHub
3. เปิด repository tangmiu/tang-miu-official
4. หลังจากตั้งค่าเสร็จ จะเห็นเมนู Music, Performances, Creative Work, Media & Press และ Artist

## เพิ่มเพลงใหม่

ไปที่ Music → Releases

กรอก:
- Title: ชื่อเพลง
- English title: ชื่ออังกฤษ ถ้ามี
- Release type: Single / EP / Album
- Year และ Release date
- Status: Published / Upcoming / Archive
- Artist / collaboration
- Cover
- Description
- Spotify / Apple Music / YouTube
- Credits: กดเพิ่มเครดิตทีละรายการ

จากนั้นกด Save

หน้าเว็บหลักจะอ่านรายการจาก data/releases.json และแสดงเพลงใหม่ตามดีไซน์เดิม

## เพิ่มงาน Live

ไปที่ Performances → Live → เพิ่มรายการใหม่

ใส่ Event, Date, Venue, Description, Photos และ Links

## เพิ่มงานสร้างสรรค์

ไปที่ Creative Work → Works

ใช้สำหรับ:
- Music Video
- Production
- Visual
- Photography
- Cover
- งานอื่น ๆ

## เพิ่มรูป

สามารถอัปโหลดรูปผ่าน Image field ได้เลย

รูปทั่วไปจะถูกเก็บใน assets/ โดยเลือก folder จาก field ที่เกี่ยวข้อง เช่น releases, live, works หรือ gallery

แนะนำ:
- ใช้ JPG หรือ WebP
- ตั้งชื่อไฟล์ให้สื่อความหมาย
- เก็บรูปต้นฉบับความละเอียดสูงไว้แยกต่างหาก
- ใช้รูปที่มีสิทธิ์เผยแพร่บนเว็บไซต์

## แก้ข้อมูลศิลปิน

ไปที่ Artist → Artist Profile

ตรงนี้แก้ได้ทั้ง Bio, Hero image, Email และลิงก์ Spotify / Apple Music / YouTube / Instagram / TikTok / X

## Press

ไปที่ Media & Press → Press เพื่อเพิ่มข่าวหรือบทความในอนาคต

## ถ้าเว็บยังไม่เปลี่ยนทันที

Pages CMS บันทึกการแก้ไขกลับไป GitHub และ GitHub Pages จะนำ repository ไป publish ต่อ อาจต้องรอสักครู่แล้ว refresh หน้าเว็บ

## หลักสำคัญ

ไม่ต้องแก้ index.html เพื่อเพิ่มเพลง งาน Live หรือรูปอีกต่อไป

ให้เพิ่มข้อมูลผ่าน Pages CMS เป็นหลัก

โค้ดหน้าเว็บและดีไซน์อยู่ในไฟล์ HTML/CSS/JS ส่วน content อยู่ใน data/
