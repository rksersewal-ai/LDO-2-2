"""
Multi-engine OCR Service with Fallback Strategy
Lightweight extractors first → Tesseract for scanned PDFs → Error handling
"""

import logging
import os
from typing import Dict, Optional, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class OcrResult:
    """Container for OCR results"""
    def __init__(self, text: str, confidence: float = 0.0, engine: str = 'unknown', 
                 is_scanned: bool = False, error: Optional[str] = None):
        self.text = text
        self.confidence = confidence
        self.engine = engine
        self.is_scanned = is_scanned
        self.error = error
    
    def is_valid(self) -> bool:
        return bool(self.text) and not self.error
    
    def __repr__(self):
        return f"OcrResult(engine={self.engine}, confidence={self.confidence:.1%}, text_len={len(self.text)})"


class OcrEngine:
    """Base OCR engine interface"""
    
    def extract(self, file_path: str) -> OcrResult:
        raise NotImplementedError
    
    def is_available(self) -> bool:
        raise NotImplementedError
    
    def name(self) -> str:
        raise NotImplementedError


class PlainTextEngine(OcrEngine):
    """Direct text reader for text-like files."""

    SUPPORTED_EXTENSIONS = {'.txt', '.md', '.csv', '.log', '.json', '.xml'}

    def is_available(self) -> bool:
        return True

    def name(self) -> str:
        return "plaintext"

    def _try_decode(self, path: Path) -> Optional[str]:
        """Try reading the file with common encodings."""
        for encoding in ('utf-8', 'utf-8-sig', 'latin-1'):
            try:
                return path.read_text(encoding=encoding)
            except UnicodeDecodeError:
                continue
        return None

    def extract(self, file_path: str) -> OcrResult:
        path = Path(file_path)
        if path.suffix.lower() not in self.SUPPORTED_EXTENSIONS:
            return OcrResult("", confidence=0.0, engine=self.name(), error="unsupported file type")

        try:
            text = self._try_decode(path)
            if text is not None:
                return OcrResult(
                    text=text,
                    confidence=1.0,
                    engine=self.name(),
                    is_scanned=False,
                )
        except Exception as exc:
            logger.error(f"Plain text extraction error: {exc}")
            return OcrResult("", confidence=0.0, engine=self.name(), error=str(exc))

        return OcrResult("", confidence=0.0, engine=self.name(), error="could not decode text file")


class PdfTextEngine(OcrEngine):
    """Lightweight PDF text extraction (no OCR needed)"""
    
    def __init__(self):
        try:
            import pdfplumber
            self.pdfplumber = pdfplumber
            self.available = True
        except ImportError:
            self.available = False
            logger.warning("pdfplumber not installed. Install with: pip install pdfplumber")
    
    def is_available(self) -> bool:
        return self.available
    
    def name(self) -> str:
        return "pdfplumber"
    
    def extract(self, file_path: str) -> OcrResult:
        """Extract text directly from PDF (no OCR)"""
        if not self.is_available():
            return OcrResult("", confidence=0.0, engine=self.name(), 
                           error="pdfplumber not available")
        
        try:
            text_chunks = []
            with self.pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_chunks.append(page_text)
            
            full_text = "\n".join(text_chunks)
            
            if full_text.strip():
                # Text was directly extractable
                return OcrResult(
                    text=full_text,
                    confidence=0.95,  # High confidence for direct extraction
                    engine=self.name(),
                    is_scanned=False
                )
            else:
                # PDF is likely scanned (no extractable text)
                return OcrResult("", confidence=0.0, engine=self.name(),
                               is_scanned=True,
                               error="PDF appears to be scanned, needs OCR")
        
        except Exception as e:
            logger.error(f"pdfplumber error: {e}")
            return OcrResult("", confidence=0.0, engine=self.name(), error=str(e))


class EasyOcrEngine(OcrEngine):
    """Lightweight EasyOCR engine"""
    
    def __init__(self):
        try:
            import easyocr
            self.easyocr = easyocr
            self.reader = None  # Lazy load
            self.available = True
        except ImportError:
            self.available = False
            logger.warning("easyocr not installed. Install with: pip install easyocr")
    
    def is_available(self) -> bool:
        return self.available
    
    def name(self) -> str:
        return "easyocr"
    
    def _get_reader(self):
        """Lazy-load OCR reader (expensive operation)"""
        if self.reader is None:
            self.reader = self.easyocr.Reader(['en'], gpu=False)
        return self.reader
    
    def extract(self, file_path: str) -> OcrResult:
        """Extract text from image using EasyOCR"""
        if not self.is_available():
            return OcrResult("", confidence=0.0, engine=self.name(),
                           error="easyocr not available")
        
        try:
            from PIL import Image
            import io
            
            # Convert PDF pages to images if needed
            if file_path.lower().endswith('.pdf'):
                try:
                    import pdf2image
                    images = pdf2image.convert_from_path(file_path)
                    if not images:
                        return OcrResult("", confidence=0.0, engine=self.name(),
                                       error="Could not convert PDF to image")
                except ImportError:
                    logger.warning("pdf2image not installed. Cannot process PDFs with EasyOCR")
                    return OcrResult("", confidence=0.0, engine=self.name(),
                                   error="pdf2image required for PDF processing")
            else:
                # Open image file
                images = [Image.open(file_path)]

            reader = self._get_reader()
            page_texts = []
            all_confidences = []
            import tempfile

            for image in images:
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    image.save(tmp.name, 'PNG')
                    temp_path = tmp.name

                try:
                    results = reader.readtext(temp_path)
                    page_lines = []
                    for (bbox, text, conf) in results:
                        page_lines.append(text)
                        all_confidences.append(conf)
                    page_texts.append("\n".join(page_lines))
                finally:
                    os.unlink(temp_path)

            full_text = "\n\f\n".join(text for text in page_texts if text)
            avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

            return OcrResult(
                text=full_text,
                confidence=avg_confidence,
                engine=self.name(),
                is_scanned=True
            )
        
        except Exception as e:
            logger.error(f"EasyOCR error: {e}")
            return OcrResult("", confidence=0.0, engine=self.name(), error=str(e))


class TesseractEngine(OcrEngine):
    """Tesseract OCR engine (fallback for difficult images)"""
    
    def __init__(self):
        try:
            import pytesseract
            self.pytesseract = pytesseract
            
            # Check if tesseract binary is available
            cmd = os.environ.get('TESSERACT_CMD')
            if cmd:
                self.pytesseract.pytesseract.pytesseract_cmd = cmd
            
            # Try to get tesseract version
            try:
                self.pytesseract.get_tesseract_version()
                self.available = True
            except Exception:
                self.available = False
                logger.warning("Tesseract not found. Install from: https://github.com/UB-Mannheim/tesseract/wiki")
        except ImportError:
            self.available = False
            logger.warning("pytesseract not installed. Install with: pip install pytesseract")
    
    def is_available(self) -> bool:
        return self.available
    
    def name(self) -> str:
        return "tesseract"
    
    def extract(self, file_path: str) -> OcrResult:
        """Extract text using Tesseract"""
        if not self.is_available():
            return OcrResult("", confidence=0.0, engine=self.name(),
                           error="Tesseract not available")
        
        try:
            from PIL import Image
            import io
            
            # Convert PDF pages to images if needed
            if file_path.lower().endswith('.pdf'):
                try:
                    import pdf2image
                    images = pdf2image.convert_from_path(file_path)
                    if not images:
                        return OcrResult("", confidence=0.0, engine=self.name(),
                                       error="Could not convert PDF to image")
                except ImportError:
                    logger.warning("pdf2image not installed")
                    return OcrResult("", confidence=0.0, engine=self.name(),
                                   error="pdf2image required for PDF processing")
            else:
                images = [Image.open(file_path)]

            page_texts = []
            confidences = []
            for image in images:
                page_texts.append(self.pytesseract.image_to_string(image))
                data = self.pytesseract.image_to_data(image)
                lines = data.split('\n')[1:]  # Skip header
                for line in lines:
                    parts = line.split('\t')
                    if len(parts) > 10:
                        try:
                            conf = float(parts[10])
                            if conf > 0:
                                confidences.append(conf / 100.0)
                        except (ValueError, IndexError):
                            pass

            text = "\n\f\n".join(page_text for page_text in page_texts if page_text)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.5
            
            return OcrResult(
                text=text,
                confidence=avg_confidence,
                engine=self.name(),
                is_scanned=True
            )
        
        except Exception as e:
            logger.error(f"Tesseract error: {e}")
            return OcrResult("", confidence=0.0, engine=self.name(), error=str(e))


class OcrService:
    """Multi-engine OCR service with fallback strategy"""
    
    def __init__(self):
        # Initialize engines in order of preference
        self.engines = [
            PlainTextEngine(),    # Lightest - plain text passthrough
            PdfTextEngine(),      # Lightest - direct PDF text extraction
            EasyOcrEngine(),      # Medium - lightweight OCR
            TesseractEngine(),    # Heavy - powerful fallback
        ]
        
        logger.info("OCR Service initialized with engines: " + 
                   ", ".join(e.name() for e in self.engines if e.is_available()))
    
    def extract_text(self, file_path: str) -> OcrResult:
        """
        Extract text from file using intelligent engine selection
        
        Strategy:
        1. Try lightweight PDF text extraction first
        2. If PDF appears scanned, try EasyOCR (lightweight)
        3. Fall back to Tesseract for difficult images
        """
        
        if not Path(file_path).exists():
            return OcrResult("", confidence=0.0, error=f"File not found: {file_path}")
        
        logger.info(f"Extracting text from: {file_path}")
        
        # Try each engine in order
        for engine in self.engines:
            if not engine.is_available():
                logger.debug(f"Skipping {engine.name()} (not available)")
                continue
            
            logger.debug(f"Trying {engine.name()}...")
            result = engine.extract(file_path)
            
            if result.is_valid():
                logger.info(f"Successfully extracted with {engine.name()}: {result}")
                return result
            
            # Special case: if PDF extraction showed it's scanned, skip to OCR engines
            if result.is_scanned and not isinstance(engine, PdfTextEngine):
                logger.debug(f"{engine.name()} cannot handle scanned content, continuing...")
                continue
        
        # All engines failed
        logger.error(f"All OCR engines failed for {file_path}")
        return OcrResult("", confidence=0.0, 
                        error="Text extraction failed with all available engines")
    
    def get_available_engines(self) -> list:
        """Get list of available OCR engines"""
        return [e.name() for e in self.engines if e.is_available()]


# Global instance
_ocr_service = None

def get_ocr_service() -> OcrService:
    """Get or create global OCR service instance"""
    global _ocr_service
    if _ocr_service is None:
        _ocr_service = OcrService()
    return _ocr_service


# Convenience function
def extract_text(file_path: str) -> Tuple[str, float, str, Optional[str]]:
    """
    Extract text from file
    
    Returns:
        (text, confidence, engine, error)
    """
    service = get_ocr_service()
    result = service.extract_text(file_path)
    return result.text, result.confidence, result.engine, result.error
