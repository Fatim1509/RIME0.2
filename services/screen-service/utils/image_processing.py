#!/usr/bin/env python3
"""
Image processing utilities for screen capture.
"""

import io
import base64
from typing import Optional, Tuple, List, Dict, Any
from dataclasses import dataclass

try:
    from PIL import Image, ImageEnhance, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: Pillow not available for image processing")


try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False


@dataclass
class ImageStats:
    """Statistics about an image."""
    width: int
    height: int
    mode: str
    size_bytes: int
    brightness: float
    contrast: float


class ImageProcessor:
    """Process and analyze images."""
    
    def __init__(self):
        self.supported_formats = ['JPEG', 'PNG', 'BMP', 'GIF', 'WEBP']
    
    def load_image(self, image_data: bytes) -> Optional[Any]:
        """Load image from bytes."""
        if not PIL_AVAILABLE:
            return None
        
        try:
            return Image.open(io.BytesIO(image_data))
        except Exception as e:
            print(f"Error loading image: {e}")
            return None
    
    def load_from_base64(self, base64_string: str) -> Optional[Any]:
        """Load image from base64 string."""
        try:
            image_data = base64.b64decode(base64_string)
            return self.load_image(image_data)
        except Exception as e:
            print(f"Error decoding base64: {e}")
            return None
    
    def save_to_bytes(self, image: Any, format: str = 'JPEG', quality: int = 85) -> bytes:
        """Save image to bytes."""
        if not PIL_AVAILABLE:
            return b''
        
        output = io.BytesIO()
        
        # Convert mode if necessary
        if format == 'JPEG' and image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        image.save(output, format=format, quality=quality, optimize=True)
        return output.getvalue()
    
    def save_to_base64(self, image: Any, format: str = 'JPEG', quality: int = 85) -> str:
        """Save image to base64 string."""
        image_bytes = self.save_to_bytes(image, format, quality)
        return base64.b64encode(image_bytes).decode('utf-8')
    
    def resize(self, image: Any, width: int, height: int, maintain_aspect: bool = True) -> Any:
        """Resize image."""
        if not PIL_AVAILABLE:
            return image
        
        if maintain_aspect:
            image.thumbnail((width, height), Image.Resampling.LANCZOS)
            return image
        else:
            return image.resize((width, height), Image.Resampling.LANCZOS)
    
    def compress(self, image_data: bytes, quality: int = 85, max_size: Optional[Tuple[int, int]] = None) -> bytes:
        """Compress image data."""
        if not PIL_AVAILABLE:
            return image_data
        
        image = self.load_image(image_data)
        if image is None:
            return image_data
        
        # Resize if needed
        if max_size:
            image = self.resize(image, max_size[0], max_size[1])
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        return self.save_to_bytes(image, 'JPEG', quality)
    
    def enhance(self, image: Any, brightness: float = 1.0, contrast: float = 1.0, sharpness: float = 1.0) -> Any:
        """Enhance image."""
        if not PIL_AVAILABLE:
            return image
        
        if brightness != 1.0:
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(brightness)
        
        if contrast != 1.0:
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(contrast)
        
        if sharpness != 1.0:
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(sharpness)
        
        return image
    
    def get_stats(self, image_data: bytes) -> Optional[ImageStats]:
        """Get image statistics."""
        if not PIL_AVAILABLE or not NUMPY_AVAILABLE:
            return None
        
        image = self.load_image(image_data)
        if image is None:
            return None
        
        # Convert to grayscale for analysis
        gray_image = image.convert('L')
        img_array = np.array(gray_image)
        
        return ImageStats(
            width=image.width,
            height=image.height,
            mode=image.mode,
            size_bytes=len(image_data),
            brightness=float(np.mean(img_array)) / 255.0,
            contrast=float(np.std(img_array)) / 255.0,
        )
    
    def detect_edges(self, image: Any) -> Any:
        """Detect edges in image."""
        if not PIL_AVAILABLE:
            return image
        
        return image.filter(ImageFilter.FIND_EDGES)
    
    def blur(self, image: Any, radius: float = 2.0) -> Any:
        """Apply Gaussian blur."""
        if not PIL_AVAILABLE:
            return image
        
        return image.filter(ImageFilter.GaussianBlur(radius))
    
    def crop(self, image: Any, box: Tuple[int, int, int, int]) -> Any:
        """Crop image to box (left, top, right, bottom)."""
        if not PIL_AVAILABLE:
            return image
        
        return image.crop(box)
    
    def create_thumbnail(self, image_data: bytes, size: Tuple[int, int] = (300, 200)) -> bytes:
        """Create thumbnail from image data."""
        if not PIL_AVAILABLE:
            return image_data
        
        image = self.load_image(image_data)
        if image is None:
            return image_data
        
        image.thumbnail(size, Image.Resampling.LANCZOS)
        return self.save_to_bytes(image, 'JPEG', 70)


# Global processor instance
processor = ImageProcessor()


def compress_screenshot(image_data: bytes, quality: int = 85, max_width: int = 1920, max_height: int = 1080) -> bytes:
    """Compress a screenshot for transmission."""
    return processor.compress(image_data, quality, (max_width, max_height))


def create_thumbnail(image_data: bytes, width: int = 300, height: int = 200) -> bytes:
    """Create a thumbnail of the screenshot."""
    return processor.create_thumbnail(image_data, (width, height))


def get_image_stats(image_data: bytes) -> Optional[Dict[str, Any]]:
    """Get image statistics as dictionary."""
    stats = processor.get_stats(image_data)
    if stats:
        return {
            'width': stats.width,
            'height': stats.height,
            'mode': stats.mode,
            'size_bytes': stats.size_bytes,
            'brightness': round(stats.brightness, 3),
            'contrast': round(stats.contrast, 3),
        }
    return None


def enhance_image(image_data: bytes, brightness: float = 1.0, contrast: float = 1.0) -> bytes:
    """Enhance image brightness and contrast."""
    if not PIL_AVAILABLE:
        return image_data
    
    image = processor.load_image(image_data)
    if image is None:
        return image_data
    
    enhanced = processor.enhance(image, brightness, contrast)
    return processor.save_to_bytes(enhanced)
