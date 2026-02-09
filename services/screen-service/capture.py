#!/usr/bin/env python3
"""
RIME Screen Capture Service

A FastAPI service that captures screenshots and analyzes screen content
using computer vision techniques.
"""

import base64
import io
import os
import time
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import uvicorn

# Try to import screen capture libraries
try:
    import mss
    import mss.tools
    MSS_AVAILABLE = True
except ImportError:
    MSS_AVAILABLE = False
    print("Warning: mss not available, using mock capture")

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Warning: Pillow not available")


# ============================================
# Configuration
# ============================================

class Settings(BaseSettings):
    """Application settings from environment variables."""
    port: int = Field(default=8000, env="PORT")
    capture_interval: int = Field(default=3000, env="CAPTURE_INTERVAL")  # milliseconds
    screenshot_quality: int = Field(default=85, env="SCREENSHOT_QUALITY")  # JPEG quality 1-100
    max_screenshots: int = Field(default=50, env="MAX_SCREENSHOTS")
    enable_mock: bool = Field(default=True, env="ENABLE_MOCK")
    
    class Config:
        env_file = ".env"


settings = Settings()


# ============================================
# Pydantic Models
# ============================================

class Bounds(BaseModel):
    x: int
    y: int
    width: int
    height: int


class UIElement(BaseModel):
    type: str  # button, input, text, link, code, error
    text: str
    bounds: Bounds
    confidence: float


class CodeError(BaseModel):
    message: str
    line: int
    severity: str  # error, warning


class CodeContext(BaseModel):
    language: str
    fileName: str
    lineNumber: Optional[int] = None
    codeSnippet: Optional[str] = None
    errors: List[CodeError] = []


class BrowserContext(BaseModel):
    url: str
    title: str
    pageType: str  # documentation, github, stackoverflow, generic


class VisionAnalysis(BaseModel):
    application: str  # vscode, chrome, slack, terminal, unknown
    windowTitle: str
    userActivity: str  # coding, debugging, reading, typing, idle
    confidence: float
    visibleText: List[str] = []
    uiElements: List[UIElement] = []
    codeContext: Optional[CodeContext] = None
    browserContext: Optional[BrowserContext] = None
    timestamp: int


class ScreenContext(BaseModel):
    screenshot: Optional[str] = None  # base64 encoded
    visionAnalysis: VisionAnalysis
    timestamp: int
    sessionId: str = "default"


class CaptureResponse(BaseModel):
    success: bool
    screenshot: Optional[str] = None
    timestamp: int
    message: str


class HealthResponse(BaseModel):
    status: str
    timestamp: int
    version: str
    services: Dict[str, str]


# ============================================
# Screen Capture Manager
# ============================================

class ScreenCaptureManager:
    """Manages screen capture operations."""
    
    def __init__(self):
        self.screenshots: List[Dict[str, Any]] = []
        self.last_capture: Optional[bytes] = None
        self.last_analysis: Optional[VisionAnalysis] = None
        self.capture_count = 0
        
    def capture(self) -> Optional[bytes]:
        """Capture a screenshot and return as bytes."""
        if not MSS_AVAILABLE:
            return self._mock_capture()
        
        try:
            with mss.mss() as sct:
                # Capture primary monitor
                monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
                screenshot = sct.grab(monitor)
                
                # Convert to PNG bytes
                img_bytes = mss.tools.to_png(screenshot.rgb, screenshot.size)
                
                # Compress if Pillow is available
                if PIL_AVAILABLE:
                    img_bytes = self._compress_image(img_bytes)
                
                self.last_capture = img_bytes
                self.capture_count += 1
                
                # Store in history
                self._store_screenshot(img_bytes)
                
                return img_bytes
                
        except Exception as e:
            print(f"Screen capture error: {e}")
            return self._mock_capture()
    
    def _compress_image(self, img_bytes: bytes) -> bytes:
        """Compress image using JPEG."""
        try:
            img = Image.open(io.BytesIO(img_bytes))
            
            # Convert to RGB if necessary
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            # Save with compression
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=settings.screenshot_quality, optimize=True)
            return output.getvalue()
            
        except Exception as e:
            print(f"Image compression error: {e}")
            return img_bytes
    
    def _mock_capture(self) -> bytes:
        """Generate a mock screenshot for testing."""
        if PIL_AVAILABLE:
            # Create a mock image
            img = Image.new('RGB', (1920, 1080), color=(30, 30, 30))
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=settings.screenshot_quality)
            return output.getvalue()
        return b"mock_screenshot_data"
    
    def _store_screenshot(self, img_bytes: bytes):
        """Store screenshot in memory history."""
        self.screenshots.append({
            'data': img_bytes,
            'timestamp': int(time.time() * 1000),
        })
        
        # Keep only last N screenshots
        if len(self.screenshots) > settings.max_screenshots:
            self.screenshots = self.screenshots[-settings.max_screenshots:]
    
    def get_latest(self) -> Optional[bytes]:
        """Get the latest screenshot."""
        if self.last_capture is None:
            return self.capture()
        return self.last_capture
    
    def analyze_screen(self, screenshot: Optional[bytes] = None) -> VisionAnalysis:
        """Analyze the screen content (mock implementation)."""
        # In production, this would use OCR and computer vision
        # For now, return mock analysis based on time
        
        current_hour = datetime.now().hour
        
        # Simulate different contexts based on time
        if 9 <= current_hour < 17:
            # Work hours - likely coding
            return VisionAnalysis(
                application="vscode",
                windowTitle="workspace - Visual Studio Code",
                userActivity="coding",
                confidence=0.85,
                visibleText=["import", "function", "const", "return"],
                uiElements=[
                    UIElement(type="text", text="App.tsx", bounds=Bounds(x=100, y=50, width=80, height=20), confidence=0.9),
                    UIElement(type="code", text="useState", bounds=Bounds(x=200, y=150, width=60, height=15), confidence=0.85),
                ],
                codeContext=CodeContext(
                    language="typescript",
                    fileName="App.tsx",
                    lineNumber=15,
                    codeSnippet="const [data, setData] = useState(null);",
                    errors=[],
                ),
                timestamp=int(time.time() * 1000),
            )
        else:
            # Off hours - might be browsing
            return VisionAnalysis(
                application="chrome",
                windowTitle="New Tab - Google Chrome",
                userActivity="reading",
                confidence=0.7,
                visibleText=["Google", "Search"],
                uiElements=[
                    UIElement(type="input", text="Search", bounds=Bounds(x=500, y=300, width=400, height=40), confidence=0.9),
                ],
                browserContext=BrowserContext(
                    url="https://www.google.com",
                    title="Google",
                    pageType="generic",
                ),
                timestamp=int(time.time() * 1000),
            )


# Global capture manager
capture_manager = ScreenCaptureManager()


# ============================================
# FastAPI Application
# ============================================

app = FastAPI(
    title="RIME Screen Service",
    description="Screen capture and analysis service for RIME",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# API Endpoints
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=int(time.time() * 1000),
        version="0.1.0",
        services={
            "screen_capture": "available" if MSS_AVAILABLE else "mock",
            "image_processing": "available" if PIL_AVAILABLE else "unavailable",
        },
    )


@app.post("/capture", response_model=CaptureResponse)
async def capture_screenshot():
    """Capture a new screenshot."""
    try:
        screenshot = capture_manager.capture()
        
        if screenshot is None:
            raise HTTPException(status_code=500, detail="Failed to capture screenshot")
        
        # Convert to base64
        screenshot_b64 = base64.b64encode(screenshot).decode('utf-8')
        
        return CaptureResponse(
            success=True,
            screenshot=screenshot_b64,
            timestamp=int(time.time() * 1000),
            message="Screenshot captured successfully",
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Capture failed: {str(e)}")


@app.get("/capture/latest")
async def get_latest_screenshot():
    """Get the most recent screenshot."""
    try:
        screenshot = capture_manager.get_latest()
        
        if screenshot is None:
            # Capture new if none exists
            screenshot = capture_manager.capture()
        
        if screenshot is None:
            raise HTTPException(status_code=500, detail="No screenshot available")
        
        # Get analysis
        analysis = capture_manager.analyze_screen(screenshot)
        
        # Convert to base64
        screenshot_b64 = base64.b64encode(screenshot).decode('utf-8')
        
        return ScreenContext(
            screenshot=screenshot_b64,
            visionAnalysis=analysis,
            timestamp=int(time.time() * 1000),
            sessionId="default",
        )
        
    except Exception as e:
        # Return mock data on error
        return ScreenContext(
            screenshot=None,
            visionAnalysis=VisionAnalysis(
                application="unknown",
                windowTitle="Unknown",
                userActivity="idle",
                confidence=0,
                timestamp=int(time.time() * 1000),
            ),
            timestamp=int(time.time() * 1000),
            sessionId="error",
        )


@app.get("/capture/history")
async def get_screenshot_history(limit: int = 10):
    """Get screenshot history."""
    history = capture_manager.screenshots[-limit:]
    return {
        "count": len(history),
        "screenshots": [
            {
                "timestamp": s["timestamp"],
                "size": len(s["data"]),
            }
            for s in history
        ],
    }


@app.get("/analysis/current")
async def get_current_analysis():
    """Get current screen analysis without screenshot."""
    analysis = capture_manager.analyze_screen()
    return analysis


# ============================================
# WebSocket Endpoint
# ============================================

class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time screen updates."""
    await manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            if data == "ping":
                await websocket.send_json({"type": "pong", "timestamp": int(time.time() * 1000)})
            
            elif data == "capture":
                # Capture and send screenshot
                screenshot = capture_manager.capture()
                if screenshot:
                    analysis = capture_manager.analyze_screen(screenshot)
                    await websocket.send_json({
                        "type": "screenshot",
                        "screenshot": base64.b64encode(screenshot).decode('utf-8'),
                        "analysis": analysis.dict(),
                        "timestamp": int(time.time() * 1000),
                    })
            
            elif data == "analysis":
                # Send analysis only
                analysis = capture_manager.analyze_screen()
                await websocket.send_json({
                    "type": "analysis",
                    "analysis": analysis.dict(),
                    "timestamp": int(time.time() * 1000),
                })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")


# ============================================
# Background Task for Automatic Capture
# ============================================

async def auto_capture_task():
    """Background task for automatic screen capture."""
    while True:
        try:
            # Capture screenshot
            screenshot = capture_manager.capture()
            
            if screenshot and manager.active_connections:
                analysis = capture_manager.analyze_screen(screenshot)
                await manager.broadcast({
                    "type": "auto_update",
                    "analysis": analysis.dict(),
                    "timestamp": int(time.time() * 1000),
                })
            
            # Wait for next capture interval
            await asyncio.sleep(settings.capture_interval / 1000)
            
        except Exception as e:
            print(f"Auto capture error: {e}")
            await asyncio.sleep(5)


# ============================================
# Startup Event
# ============================================

@app.on_event("startup")
async def startup_event():
    """Run on application startup."""
    print(f"""
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   📸 RIME Screen Service                                   ║
║   Screen Capture & Analysis                                ║
║                                                            ║
║   Version: 0.1.0                                           ║
║   Port: {settings.port}                                         ║
║   Capture Interval: {settings.capture_interval}ms                          ║
║   Quality: {settings.screenshot_quality}%                                     ║
║   Mock Mode: {settings.enable_mock}                                ║
║                                                            ║
║   MSS Available: {MSS_AVAILABLE}                            ║
║   Pillow Available: {PIL_AVAILABLE}                         ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    """)


# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    import asyncio
    
    # Start auto capture in background
    asyncio.create_task(auto_capture_task())
    
    # Run the server
    uvicorn.run(
        "capture:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
