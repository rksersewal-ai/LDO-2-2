# Multi-Engine OCR Setup Guide

**Lightweight-first strategy with intelligent fallback**

---

## Overview

The OCR system uses multiple engines with intelligent fallback:

1. **pdfplumber** (Lightweight) — Direct PDF text extraction (no OCR needed)
2. **EasyOCR** (Medium) — Fast OCR for images & scanned PDFs
3. **Tesseract** (Heavy) — Powerful fallback for difficult cases

**Smart Selection:**
- ✅ PDF with selectable text → Use pdfplumber (instant, 95%+ confidence)
- ✅ Scanned PDF/image → Use EasyOCR (fast, 85%+ confidence)
- ✅ Difficult images → Fall back to Tesseract (slow but thorough)

---

## Quick Setup (Recommended: pdfplumber + EasyOCR)

### 1. Install Core OCR Dependencies

```bash
cd backend
pip install -r requirements-ocr.txt
```

This installs:
- `pdfplumber` — PDF text extraction
- `easyocr` — Lightweight OCR
- `pytesseract` — Tesseract wrapper
- `pdf2image` — PDF to image conversion
- `Pillow` — Image processing

### 2. (Optional) Install Tesseract Binary

**For image OCR fallback (recommended for production):**

**Windows:**
1. Download: https://github.com/UB-Mannheim/tesseract/wiki
2. Run installer (default: `C:\Program Files\Tesseract-OCR`)
3. In `.env`:
   ```bash
   TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
   ```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install tesseract-ocr
# TESSERACT_CMD=/usr/bin/tesseract (auto-detected)
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install tesseract
```

**macOS:**
```bash
brew install tesseract
# TESSERACT_CMD=/usr/local/bin/tesseract
```

### 3. Start Backend

```bash
python manage.py migrate
python -m config.waitress_runner
```

---

## Usage

### Via API

```bash
# Create OCR job
TOKEN="<your-jwt-token>"

curl -X POST http://localhost:8765/api/ocr/jobs/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"document_id": "DOC-001"}'

# Returns: {"id": "JOB-123", "status": "Processing", ...}

# Check job status
curl -X GET http://localhost:8765/api/ocr/jobs/JOB-123/ \
  -H "Authorization: Bearer $TOKEN"

# Get OCR results
curl -X GET http://localhost:8765/api/ocr/results/DOC-001/ \
  -H "Authorization: Bearer $TOKEN"
```

### Via Django Shell

```bash
python manage.py shell
>>> from edms_api.ocr_tasks import start_ocr_for_document
>>> from django.contrib.auth.models import User
>>> user = User.objects.get(username='admin')
>>> job = start_ocr_for_document('DOC-001', user=user)
>>> print(job.status)
'Completed'
>>> print(job.extracted_text[:100])
```

### In Browser

1. **Document Hub → Select Document → OCR Tab**
   - Click "Start OCR" button
   - Watch job progress in real-time
   - View extracted text when complete

---

## Engine Details

### 1. pdfplumber (Lightweight PDF Text Extraction)

**When to use:** PDFs with selectable text (most office documents)

**Pros:**
- ✅ Instant (< 1 second)
- ✅ Zero setup required
- ✅ 95%+ accuracy for regular PDFs
- ✅ No external dependencies

**Cons:**
- ❌ Won't work on scanned PDFs
- ❌ Won't work on images

**Confidence:** 0.95 (very high)

```python
from edms_api.ocr_service import PdfTextEngine

engine = PdfTextEngine()
result = engine.extract('document.pdf')
print(f"Text: {result.text}")
print(f"Confidence: {result.confidence:.1%}")
print(f"Is scanned: {result.is_scanned}")  # True if needs OCR
```

---

### 2. EasyOCR (Lightweight OCR)

**When to use:** Scanned PDFs, images, low-quality documents

**Pros:**
- ✅ Fast (5-10 seconds per page)
- ✅ Good accuracy (85%+)
- ✅ Works on images & scanned PDFs
- ✅ Multi-language support
- ✅ GPU support (if available)

**Cons:**
- ⚠️ Slower than pdfplumber
- ⚠️ First run requires model download (~200MB)
- ❌ Uses more memory than Tesseract

**Confidence:** 0.70-0.90 (varies by image quality)

```python
from edms_api.ocr_service import EasyOcrEngine

engine = EasyOcrEngine()
result = engine.extract('scanned.pdf')
print(f"Confidence: {result.confidence:.1%}")
```

---

### 3. Tesseract (Heavy-duty OCR)

**When to use:** EasyOCR fails, difficult images, production with high accuracy requirements

**Pros:**
- ✅ Most accurate (85%+ on good images, 70%+ on difficult)
- ✅ Works on 100+ languages
- ✅ Free & open-source
- ✅ Minimal memory footprint

**Cons:**
- ❌ Slower (10-30 seconds per page)
- ❌ Requires separate binary installation
- ❌ Platform-dependent setup

**Confidence:** 0.50-0.90 (varies significantly)

```python
from edms_api.ocr_service import TesseractEngine

engine = TesseractEngine()
result = engine.extract('difficult.png')
print(f"Engine: {result.engine}")
```

---

## Configuration

### Enable/Disable Engines

Engines are automatically enabled if available. To disable:

**Disable EasyOCR (use only pdfplumber + Tesseract):**
```bash
pip uninstall easyocr
```

**Disable Tesseract fallback:**
```bash
unset TESSERACT_CMD
# Or: Remove from PATH or uninstall tesseract
```

### GPU Acceleration (EasyOCR)

If you have NVIDIA GPU:

```bash
# Install GPU support
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# EasyOCR will auto-detect and use GPU
```

### Language Support

**EasyOCR:** Modify `ocr_service.py`:
```python
# In EasyOcrEngine._get_reader()
self.reader = self.easyocr.Reader(['en', 'hi', 'ar'], gpu=False)  # Add languages
```

**Tesseract:** Install language packs:
```bash
# Ubuntu
sudo apt install tesseract-ocr-*  # Install all languages

# macOS
brew install tesseract-lang

# Specify in code
pytesseract.image_to_string(image, lang='eng+hin+ara')
```

---

## Performance Tuning

### Timeout Configuration

```python
# In views.py, update OcrJobViewSet:
OCR_TIMEOUT = 300  # 5 minutes per document

# For large PDFs or slow systems, increase:
OCR_TIMEOUT = 600  # 10 minutes
```

### Batch Processing (Async)

For processing multiple documents, use Celery:

```bash
pip install celery redis
```

Configure in `settings.py`:
```python
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
```

Start worker:
```bash
celery -A config worker -l info
```

---

## Troubleshooting

### Issue: "pdfplumber not available"

**Fix:**
```bash
pip install pdfplumber
```

### Issue: "easyocr not installed"

**Fix:**
```bash
pip install easyocr
# First run may download models (~200MB)
```

### Issue: "Tesseract not found"

**Fix:**
1. Install Tesseract binary (see Quick Setup above)
2. Set `TESSERACT_CMD` in `.env`:
   ```bash
   TESSERACT_CMD=/usr/bin/tesseract
   ```

### Issue: "pytesseract.TesseractNotFoundError"

**Fix:**
```bash
# Linux: ensure tesseract is on PATH
which tesseract

# If not on PATH, set env var:
export TESSERACT_CMD=/path/to/tesseract
```

### Issue: OCR Very Slow

**Cause:** Tesseract running on large image or CPU-bound

**Solutions:**
- Use EasyOCR instead (faster on modern hardware)
- Reduce image resolution before OCR
- Enable GPU if available
- Implement job timeout

### Issue: Memory Usage High

**Cause:** Loading large PDFs or models

**Solutions:**
- Process one page at a time
- Use smaller batch sizes
- Consider using pdfplumber instead (lighter)
- Increase available RAM

---

## Async Processing (Optional: Celery)

### Setup Celery

```bash
pip install celery redis
```

### Configuration

In `settings.py`:
```python
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
```

### Start Services

**Terminal 1: Redis**
```bash
redis-server
```

**Terminal 2: Celery Worker**
```bash
celery -A config worker -l info
```

**Terminal 3: Backend**
```bash
python manage.py runserver
```

Now OCR jobs run in background without blocking requests.

---

## Testing

### Test All Engines

```bash
python manage.py shell
>>> from edms_api.ocr_service import get_ocr_service
>>> service = get_ocr_service()
>>> print("Available engines:", service.get_available_engines())
>>> result = service.extract_text('test.pdf')
>>> print(result)
```

### Test with Sample PDFs

```bash
# Create test PDFs in backend/test_docs/

# Regular PDF (should use pdfplumber)
# Scanned PDF (should use EasyOCR)
# Difficult image (should use Tesseract)
```

---

## Production Checklist

- [ ] `pdfplumber` installed
- [ ] `easyocr` installed (or intentionally skipped)
- [ ] Tesseract binary installed (if using fallback)
- [ ] `TESSERACT_CMD` set in `.env` (if needed)
- [ ] Redis configured (if using Celery)
- [ ] Celery workers configured (if async needed)
- [ ] OCR timeout set appropriately
- [ ] Storage directory writable for temp files
- [ ] Logging configured for OCR operations
- [ ] Test OCR with sample documents

---

## Monitoring

### View OCR Jobs

```bash
# Django admin
http://localhost:8765/admin/edms_api/ocrjob/

# Filter by status: Queued, Processing, Completed, Failed
```

### Check Logs

```bash
# OCR service logs
tail -f logs/edms.log | grep ocr

# View specific job
python manage.py shell
>>> from edms_api.models import OcrJob
>>> job = OcrJob.objects.get(id='JOB-123')
>>> print(job.status, job.confidence, job.error_message)
```

---

## Advanced: Custom Language Support

### Add Support for Hindi, Arabic, Chinese

**EasyOCR:**
```python
# In ocr_service.py, EasyOcrEngine.__init__()
self.reader = self.easyocr.Reader(['en', 'hi', 'ar', 'zh'], gpu=False)
```

**Tesseract:**
```bash
# Install language packs
sudo apt install tesseract-ocr-hin tesseract-ocr-ara

# Use in code
pytesseract.image_to_string(image, lang='eng+hin+ara')
```

---

## API Reference

### Start OCR Job

```
POST /api/ocr/jobs/
Content-Type: application/json

{
  "document_id": "DOC-001"
}

Returns:
{
  "id": "JOB-123",
  "document": "DOC-001",
  "status": "Processing",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Get Job Status

```
GET /api/ocr/jobs/JOB-123/

Returns:
{
  "id": "JOB-123",
  "status": "Completed",
  "extracted_text": "...",
  "confidence": 0.92,
  "completed_at": "2024-01-15T10:32:00Z"
}
```

### Get OCR Results

```
GET /api/ocr/results/DOC-001/

Returns:
{
  "document_id": "DOC-001",
  "status": "Completed",
  "text": "...",
  "confidence": 0.92,
  "extracted_at": "2024-01-15T10:32:00Z"
}
```

---

## Support

For issues:
1. Check Troubleshooting section above
2. View logs: `tail -f logs/edms.log`
3. Test manually: `python manage.py shell`
4. Check engine availability: `service.get_available_engines()`

---

**Recommended Setup:** pdfplumber + EasyOCR (covers 95% of use cases, zero to minimal setup)
