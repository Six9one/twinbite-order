import sys
import subprocess
import os
import socket
from PyQt6.QtCore import QUrl, Qt, QTimer
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, 
    QHBoxLayout, QPushButton, QLabel, QSplitter
)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile

def is_port_open(port):
    """Check if a port is open on localhost"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    return result == 0

class TwinPizzaApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Twin Pizza - Ordering & Delivery Management")
        self.resize(1400, 800)
        
        # Auto-start dev server if not running
        if not is_port_open(8080):
            print("[*] Starting npm run dev...")
            subprocess.Popen(
                'start "Ordering UI Server" cmd /k "npm run dev"',
                shell=True, cwd=os.path.dirname(os.path.abspath(__file__))
            )
        
        # Main layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Splitter for the two web views
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 1. Ordering System View (Left)
        self.order_view = QWebEngineView()
        
        # 2. WhatsApp View (Right) - with custom user agent for compatibility
        self.whatsapp_view = QWebEngineView()
        profile = self.whatsapp_view.page().profile()
        profile.setHttpUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        self.whatsapp_view.load(QUrl("https://web.whatsapp.com"))
        
        splitter.addWidget(self.order_view)
        splitter.addWidget(self.whatsapp_view)
        splitter.setStretchFactor(0, 2)  # Order system takes more space
        splitter.setStretchFactor(1, 1)  # WhatsApp takes less space
        
        main_layout.addWidget(splitter)
        
        # Bottom Bar for Service Controls
        bottom_bar = QHBoxLayout()
        
        self.status_label = QLabel("Services: Starting...")
        bottom_bar.addWidget(self.status_label)
        
        btn_start_server = QPushButton("Start Dev Server")
        btn_start_server.clicked.connect(self.start_dev_server)
        bottom_bar.addWidget(btn_start_server)
        
        btn_restart_order = QPushButton("Refresh Ordering UI")
        btn_restart_order.clicked.connect(self.reload_order_view)
        bottom_bar.addWidget(btn_restart_order)
        
        btn_open_bot = QPushButton("Start WhatsApp Bot")
        btn_open_bot.clicked.connect(self.start_bot)
        bottom_bar.addWidget(btn_open_bot)
        
        btn_open_print = QPushButton("Start Print Server")
        btn_open_print.clicked.connect(self.start_print)
        bottom_bar.addWidget(btn_open_print)
        
        main_layout.addLayout(bottom_bar)
        
        # Delayed load of ordering view (wait for server)
        QTimer.singleShot(3000, self.reload_order_view)
        
    def reload_order_view(self):
        self.order_view.load(QUrl("http://localhost:8080"))
        self.status_label.setText("Services: Ready")
    
    def start_dev_server(self):
        subprocess.Popen(
            'start "Ordering UI Server" cmd /k "npm run dev"',
            shell=True, cwd=os.path.dirname(os.path.abspath(__file__))
        )
        self.status_label.setText("Services: Starting server...")
        QTimer.singleShot(5000, self.reload_order_view)
        
    def start_bot(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        bot_dir = os.path.join(script_dir, "whatsapp-bot-python")
        subprocess.Popen(f'start "WhatsApp Bot" cmd /k "python bot.py"', shell=True, cwd=bot_dir)
        
    def start_print(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        print_dir = os.path.join(script_dir, "print-server")
        subprocess.Popen('start "Print Server" cmd /k "node server.js"', shell=True, cwd=print_dir)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = TwinPizzaApp()
    window.show()
    sys.exit(app.exec())
